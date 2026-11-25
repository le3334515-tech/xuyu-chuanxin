/**
 * 中文发声：与 lib/assemblyai/tts-session.ts 相同的对外契约，
 * 引擎换成浏览器自带的语音合成（Windows 上是 Microsoft Huihui 等）。
 *
 * 为什么必须换：原版接 AssemblyAI 流式 TTS，实测其 language 支持集为
 * english / french / german / italian / portuguese / spanish —— 不含中文；
 * 用 english 强行念中文时，整句只会回一个词边界，逐词高亮随之失效。
 * 中文版改用系统音色 + 分词边界，逐词高亮、停止、修订等行为保持一致。
 */

import type { SupportedLanguage } from "../language.ts";
import { segmentText, segmentIndexAt, type Segment } from "../text-zh.ts";

type Status = "connecting" | "ready" | "speaking" | "cancelled" | "closed";

type Callbacks = {
  onStatus?: (status: Status) => void;
  onSessionReady?: (sessionId: string, wordBoundaries: boolean) => void;
  onWord?: (word: { word: string; start: number; end: number; confidence: number }, index: number) => void;
  onFrame?: (type: string, detail: string) => void;
  onPlaybackComplete?: (flushId: number) => void;
  onEnergy?: (level: number) => void;
  onError?: (message: string) => void;
  onLatency?: (milliseconds: number) => void;
};

const synth = () => (typeof window === "undefined" ? null : window.speechSynthesis);

export function zhVoices(language: SupportedLanguage): SpeechSynthesisVoice[] {
  const engine = synth();
  if (!engine) return [];
  const all = engine.getVoices() || [];
  const want = language === "english" ? /^en/i : /^zh|^cmn|^yue/i;
  const matched = all.filter((voice) => want.test(voice.lang || ""));
  const pool = matched.length ? matched : all;
  return [...pool].sort((a, b) => score(b) - score(a));
}

function score(voice: SpeechSynthesisVoice): number {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let value = 0;
  if (/natural|neural|online|premium|enhanced/.test(name)) value += 4;
  if (/xiaoxiao|xiaoyi|yunxi|yunyang|huihui|yaoyao|kangkang|tingting|li-mu|hanhan|zhiyu/.test(name)) value += 2;
  if (/zh-cn|cmn-hans/i.test(voice.lang || "")) value += 1;
  return value;
}

export function findVoice(voiceId: string, language: SupportedLanguage): SpeechSynthesisVoice | null {
  const list = zhVoices(language);
  return list.find((voice) => voice.voiceURI === voiceId) || list[0] || null;
}

export class SpeechSession {
  private socketless = true;
  private cancelled = false;
  private segments: Segment[] = [];
  private language: SupportedLanguage = "chinese";
  private voiceId = "";
  private energyTimer: ReturnType<typeof setInterval> | null = null;
  private pacingTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private callbacks: Callbacks = {}) {}

  async connect(voiceId: string, language: SupportedLanguage) {
    this.voiceId = voiceId;
    this.language = language;
    this.callbacks.onStatus?.("connecting");
    const engine = synth();
    if (!engine) {
      this.callbacks.onError?.("这个浏览器没有语音合成能力。换用 Chrome 或 Edge 试试。");
      return;
    }
    if (!(engine.getVoices() || []).length) {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        engine.addEventListener?.("voiceschanged", done, { once: true });
        setTimeout(done, 1200);
      });
    }
    this.callbacks.onSessionReady?.("local-speech", true);
    this.callbacks.onStatus?.("ready");
    this.callbacks.onFrame?.("Begin", `本机语音 · ${findVoice(this.voiceId, this.language)?.name ?? "系统默认"}`);
  }

  async speakStreamed(text: string) {
    const engine = synth();
    if (!engine) {
      this.callbacks.onError?.("这个浏览器没有语音合成能力。");
      return;
    }
    const body = String(text ?? "");
    this.cancelled = false;
    this.finished = false;
    this.lastEmitted = -1;
    this.segments = segmentText(body);
    if (!this.segments.length) {
      this.callbacks.onError?.("没有可朗读的文字。");
      return;
    }
    this.callbacks.onFrame?.("Generate", `已批准的文本 · ${[...body].length} 字`);

    const voice = findVoice(this.voiceId, this.language);
    const utterance = new SpeechSynthesisUtterance(body);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "zh-CN";
    } else {
      utterance.lang = this.language === "english" ? "en-US" : "zh-CN";
    }
    utterance.rate = 1;
    utterance.pitch = 1;

    const startedAt = performance.now();
    let firstBoundary = true;
    let lastIndex = -1;

    const emit = (index: number) => {
      if (this.cancelled) return;
      if (index <= lastIndex) return;
      lastIndex = index;
      this.lastEmitted = Math.max(this.lastEmitted, index);
      const seg = this.segments[index];
      if (!seg) return;
      if (firstBoundary) {
        firstBoundary = false;
        this.callbacks.onLatency?.(Math.max(1, Math.round(performance.now() - startedAt)));
        this.callbacks.onFrame?.("Audio", "首个音节已发出");
      }
      this.callbacks.onWord?.({ word: seg.word, start: seg.start, end: seg.end, confidence: 1 }, index);
    };

    utterance.onstart = () => {
      if (this.cancelled) return;
      this.callbacks.onStatus?.("speaking");
      this.startEnergy();
    };

    utterance.onboundary = (event) => {
      const at = typeof event.charIndex === "number" ? event.charIndex : 0;
      emit(segmentIndexAt(this.segments, at));
    };

    utterance.onend = () => {
      this.finished = true;
      this.clearPacing();
      if (this.cancelled) return;
      emit(this.segments.length - 1);
      this.stopEnergy();
      this.callbacks.onFrame?.("FlushDone", `${this.segments.length} 个词已念完`);
      this.callbacks.onPlaybackComplete?.(0);
    };

    utterance.onerror = (event) => {
      this.stopEnergy();
      if (this.cancelled) return;
      const reason = (event as SpeechSynthesisErrorEvent).error || "speech-error";
      if (reason === "interrupted" || reason === "canceled") return;
      this.callbacks.onError?.(
        reason === "not-allowed"
          ? "浏览器拦住了这次发声：先在页面上点一下，再按「念出来」。"
          : `这台设备的语音没能发声（${reason}）。换 Chrome / Edge 再试。`,
      );
    };

    engine.cancel();
    engine.speak(utterance);
    this.startPacing();
  }

  /** 有些浏览器不发 boundary（Safari/Firefox）：按节拍推进，高亮不中断 */
  private startPacing() {
    this.clearPacing();
    const startedAt = performance.now();
    const perWord = Math.max(180, Math.round(cleanLength(this.segments) * 24));
    const tick = () => {
      if (this.cancelled || this.finished) return;
      const elapsed = performance.now() - startedAt;
      const target = Math.min(this.segments.length - 1, Math.floor(elapsed / perWord));
      if (target > this.lastEmitted) {
        for (let index = this.lastEmitted + 1; index <= target; index += 1) {
          const segment = this.segments[index];
          this.callbacks.onWord?.(
            { word: segment.word, start: segment.start, end: segment.end, confidence: 0 },
            index,
          );
        }
        this.lastEmitted = target;
      }
      if (this.lastEmitted >= this.segments.length - 1) return;
      this.pacingTimer = setTimeout(tick, 160);
    };
    this.pacingTimer = setTimeout(tick, 320);
  }

  private finished = false;

  private lastEmitted = -1;

  private clearPacing() {
    if (this.pacingTimer) clearTimeout(this.pacingTimer);
    this.pacingTimer = null;
  }

  private startEnergy() {
    this.stopEnergy();
    let phase = 0;
    this.energyTimer = setInterval(() => {
      phase += 0.35;
      const level = 0.45 + Math.abs(Math.sin(phase)) * 0.45;
      this.callbacks.onEnergy?.(Number(level.toFixed(3)));
    }, 90);
  }

  private stopEnergy() {
    if (this.energyTimer) clearInterval(this.energyTimer);
    this.energyTimer = null;
    this.callbacks.onEnergy?.(0);
  }

  cancel() {
    this.cancelled = true;
    this.clearPacing();
    this.stopEnergy();
    const engine = synth();
    if (engine) {
      try {
        engine.cancel();
      } catch {
        /* noop */
      }
    }
    this.callbacks.onStatus?.("cancelled");
    this.callbacks.onFrame?.("Cancel", "已取消 · 本地队列清空");
  }

  close() {
    this.cancel();
    this.callbacks.onStatus?.("closed");
    this.callbacks.onFrame?.("Termination", "本地会话已关闭");
  }

  /** 「试听」用：独立念一句样例，不影响正在进行的会话 */
  static preview(voiceId: string, language: SupportedLanguage, text: string, onEnd?: () => void) {
    const engine = synth();
    if (!engine) return false;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = findVoice(voiceId, language);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang || "zh-CN";
    } else {
      utterance.lang = language === "english" ? "en-US" : "zh-CN";
    }
    utterance.onend = () => onEnd?.();
    utterance.onerror = () => onEnd?.();
    engine.cancel();
    engine.speak(utterance);
    return true;
  }
}

function cleanLength(segments: { word: string }[]): number {
  return segments.reduce((total, segment) => total + [...segment.word].length, 0) || 1;
}
