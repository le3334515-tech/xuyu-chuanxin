/**
 * 听音的路由层：对外仍是 `SpeechListenSession`
 * （onReady / onTranscript / onQuestion / onError + start / close），
 * 内部按是否配置了 AssemblyAI key 选择引擎。
 *
 * A 路（默认，免费）：浏览器语音识别。Edge 通常可用；Chrome 依赖外部语音服务，
 *   部分网络下按下之后完全静默 —— 所以必须有看门狗，不能让界面卡在「正在听…」。
 * B 路（填了 key）：AssemblyAI 多语言流式转写，中文可靠，见 cloud-listen.ts。
 */

import { CloudTranscribeSession, readConfig } from "@/lib/speech/cloud-transcribe";
import { checkRecordingEnv } from "@/lib/speech/env-check";

export type ListenEvents = {
  onReady: () => void;
  onTranscript: (text: string) => void;
  onQuestion: (text: string) => void;
  onError: (message: string) => void;
  onLevel?: (level: number) => void;
};

type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

const SAMPLE_QUESTION: Record<string, string> = {
  zh: "你现在还需要再加一份吗？",
  en: "Are you ready to order, or do you need a minute?",
};

const SILENCE_TIMEOUT_MS = 12_000;
const MAX_SESSION_MS = 30_000;

function recognitionFactory(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = scope.SpeechRecognition || scope.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

function isEdge(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Edg\//.test(navigator.userAgent);
}

function networkHint(lang: "zh" | "en"): string {
  if (lang === "en") {
    return isEdge()
      ? "The listening service did not respond. Try again, add your AssemblyAI key under the text box, or type the question."
      : "This browser's speech recognition did not respond — Chrome relies on an external speech service. Add your AssemblyAI key under the text box, switch to Edge, or type the question.";
  }
  return isEdge()
    ? "识别服务没有响应。可以重试，在下面填 AssemblyAI key 会更稳，或者直接把问题打出来。"
    : "这个浏览器的语音识别没有响应（Chrome 依赖外部语音服务，某些网络下会这样）。可以在下面填 AssemblyAI 的 key 换成可靠的转写，或者直接把问题打出来。";
}

export class SpeechListenSession {
  private cloud: CloudTranscribeSession | null = null;
  private recognition: RecognitionLike | null = null;
  private closed = false;
  private lang: "zh" | "en" = "zh";
  private sampleTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private heardSomething = false;
  private delivered = false;

  constructor(private events: ListenEvents) {}

  setLanguage(lang: string) {
    this.lang = lang === "en" || lang === "english" ? "en" : "zh";
    this.cloud?.setLanguage(this.lang);
  }

  async start(recordedQuestion = false) {
    if (this.closed) return;

    // 示例问题：不占麦克风、不依赖任何服务，用来验证「听 → 三条说法 → 念」这条链路
    if (recordedQuestion) {
      this.events.onReady();
      this.events.onTranscript(this.lang === "en" ? "Listening…" : "正在听…");
      this.sampleTimer = setTimeout(() => {
        if (this.closed) return;
        this.deliver(SAMPLE_QUESTION[this.lang] ?? SAMPLE_QUESTION.zh);
      }, 700);
      return;
    }

    // 先查环境：微信内置浏览器之类的情况，直接告诉用户该怎么做
    const issue = checkRecordingEnv();
    if (issue) {
      this.events.onError(this.lang === "en" ? issue.en : issue.zh);
      return;
    }

    // B 路：默认就用内置凭据做录音 + 上传转写（中文可靠，开箱可用）
    const config = readConfig();
    if (config.provider !== "browser" && config.key) {
      const cloud = new CloudTranscribeSession(this.events, config);
      cloud.setLanguage(this.lang);
      this.cloud = cloud;
      await cloud.start();
      return;
    }

    // A 路：浏览器识别
    const recognition = recognitionFactory();
    if (!recognition) {
      this.events.onError(
        this.lang === "en"
          ? "This browser has no speech recognition. Type the question instead, or add your AssemblyAI key below."
          : "这个浏览器不支持语音识别。可以把问题打出来，或者在下面填 AssemblyAI 的 key。",
      );
      return;
    }

    recognition.lang = this.lang === "en" ? "en-US" : "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (this.closed) return;
      this.events.onReady();
      this.armSilenceTimer();
    };

    recognition.onresult = (event: any) => {
      if (this.closed) return;
      this.armSilenceTimer();
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = String(result[0]?.transcript ?? "").trim();
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (interim || final) this.heardSomething = true;
      if (interim) this.events.onTranscript(interim);
      if (final) this.deliver(final);
    };

    recognition.onerror = (event: any) => {
      if (this.closed) return;
      const code = String(event?.error ?? "");
      if (code === "aborted") return;
      this.clearTimers();
      if (code === "no-speech") {
        this.events.onError(
          this.lang === "en"
            ? "I didn't catch that. Try again, or type the question."
            : "没有听到内容。再说一次，或者把问题打出来。",
        );
        return;
      }
      if (code === "not-allowed" || code === "service-not-allowed") {
        this.events.onError(
          this.lang === "en"
            ? "Microphone access is blocked. Allow it, or type the question."
            : "麦克风没有授权。允许之后我可以继续听，也可以直接把问题打出来。",
        );
        return;
      }
      if (code === "audio-capture") {
        this.events.onError(
          this.lang === "en"
            ? "No microphone was found. Type the question instead."
            : "没有找到麦克风设备。可以把问题打出来。",
        );
        return;
      }
      if (code === "network") {
        this.events.onError(networkHint(this.lang));
        return;
      }
      this.events.onError(
        this.lang === "en"
          ? "Recognition stopped. Try again, or type the question."
          : "识别中断了。再试一次，或者把问题打出来。",
      );
    };

    recognition.onend = () => {
      if (this.closed) return;
      this.clearTimers();
      if (this.delivered) return;
      this.events.onError(
        this.heardSomething
          ? this.lang === "en"
            ? "That was cut off. Try once more, or type the question."
            : "这句没听完。再说一次，或者把问题打出来。"
          : networkHint(this.lang),
      );
    };

    this.recognition = recognition;
    try {
      recognition.start();
      this.armSilenceTimer();
      this.sessionTimer = setTimeout(() => {
        if (this.closed || this.delivered) return;
        this.stopRecognition();
        this.events.onError(
          this.lang === "en"
            ? "Listening timed out. Try again, or type the question."
            : "听得太久了，先停下。再试一次，或者把问题打出来。",
        );
      }, MAX_SESSION_MS);
    } catch {
      this.clearTimers();
      this.events.onError(
        this.lang === "en"
          ? "The microphone didn't start. Type the question instead."
          : "麦克风没能打开。把问题打出来也可以。",
      );
    }
  }

  private deliver(text: string) {
    if (this.closed || this.delivered) return;
    const clean = String(text ?? "").trim();
    if (!clean) return;
    this.delivered = true;
    this.clearTimers();
    this.stopRecognition();
    this.events.onQuestion(clean);
  }

  private armSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.closed || this.delivered) return;
      this.stopRecognition();
      this.events.onError(networkHint(this.lang));
    }, SILENCE_TIMEOUT_MS);
  }

  private clearTimers() {
    for (const timer of [this.silenceTimer, this.sessionTimer]) {
      if (timer) clearTimeout(timer);
    }
    this.silenceTimer = null;
    this.sessionTimer = null;
  }

  private stopRecognition() {
    try {
      this.recognition?.abort();
    } catch {
      /* noop */
    }
    this.recognition = null;
  }

  close() {
    this.closed = true;
    if (this.sampleTimer) clearTimeout(this.sampleTimer);
    this.sampleTimer = null;
    this.clearTimers();
    this.stopRecognition();
    this.cloud?.close();
    this.cloud = null;
  }
}

export {
  PROVIDERS,
  readConfig,
  writeConfig,
  isBuiltinReady,
  type ProviderId,
  type StoredConfig,
} from "@/lib/speech/cloud-transcribe";
