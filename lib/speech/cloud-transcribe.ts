/**
 * 云端听写（一次性转写）：兼容多家 OpenAI 风格的语音转文字接口。
 *
 * 为什么用它：浏览器自带的 SpeechRecognition 在 Chrome 上依赖外部服务，
 * 部分网络下按下后完全静默。这里改用录音 + 上传转写，接口都是
 * `POST {base}/v1/audio/transcriptions`，multipart 带 file 与 model。
 *
 * 已实测：硅基流动的 CORS 是 `access-control-allow-origin: *`，
 * 所以纯静态站点可以直连，key 只存在本机。
 */

import { BUILTIN_PROVIDER, builtinKey } from "@/lib/speech/builtin-key";

export type ListenEvents = {
  onReady: () => void;
  onTranscript: (text: string) => void;
  onQuestion: (text: string) => void;
  onError: (message: string) => void;
  /** 真实输入电平 0~1，用来让波形条跟着说话跳动 */
  onLevel?: (level: number) => void;
};

export type ProviderId = "siliconflow" | "assemblyai" | "browser";

export type ProviderConfig = {
  id: ProviderId;
  /** 接口根地址，例如 https://api.siliconflow.cn */
  base: string;
  model: string;
  /** key 在界面上的说明 */
  hint: string;
};

export const PROVIDERS: Record<Exclude<ProviderId, "browser">, ProviderConfig> = {
  siliconflow: {
    id: "siliconflow",
    base: "https://api.siliconflow.cn",
    model: "FunAudioLLM/SenseVoiceSmall",
    hint: "国内可注册、支持支付宝/微信充值，注册有免费额度",
  },
  assemblyai: {
    id: "assemblyai",
    base: "https://api.assemblyai.com",
    model: "universal",
    hint: "海外服务，需要外币卡",
  },
};

const PCM_WORKLET_SOURCE = `
class PCMRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Int16Array(Math.round(sampleRate / 10));
    this.offset = 0;
  }
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    for (const value of channel) {
      this.buffer[this.offset++] = Math.round(Math.max(-1, Math.min(1, value)) * (value < 0 ? 32768 : 32767));
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer.buffer, [this.buffer.buffer]);
        this.buffer = new Int16Array(Math.round(sampleRate / 10));
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor("pcm-recorder", PCMRecorder);
`;

const CONFIG_KEY = "xuyu.stt.config";
const MAX_RECORD_MS = 15_000;
/** 连续静音多久判定说完 */
const SILENCE_HOLD_MS = 620;
/** 一直没人说话就早点收工，别让人干等 30 秒 */
const NO_SPEECH_LIMIT_MS = 6_000;
/** 音量阈值（RMS） */
const SILENCE_RMS = 0.009;

export type StoredConfig = {
  provider: ProviderId;
  key: string;
};

const BUILTIN: StoredConfig = { provider: BUILTIN_PROVIDER, key: builtinKey() };

/**
 * 存储里只认「用户亲自保存过」的配置（带 source: "user"）。
 * 旧版本留下的、或写入中途失败的空壳配置一律忽略 ——
 * 否则脏数据会盖掉内置凭据，表现就是「key 没通过」。
 */
export function readConfig(): StoredConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const data = JSON.parse(raw) as StoredConfig & { source?: string };
      if (data && data.source === "user") {
        if (data.provider === "browser") return { provider: "browser", key: "" };
        if (data.key) return { provider: data.provider, key: data.key };
      }
    }
  } catch {
    /* 隐私模式读不到 */
  }
  // 默认：内置凭据直连，打开就能用，不需要任何配置
  return BUILTIN;
}

/** 界面里展示用：是否已经开箱可用 */
export function isBuiltinReady(): boolean {
  return BUILTIN.key.length > 0;
}

export function writeConfig(next: StoredConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...next, source: "user" }));
  } catch {
    /* 忽略写入失败 */
  }
}

/** 一次性清掉旧版本留下的脏配置 */
export function clearLegacyConfig(): void {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return;
    const data = JSON.parse(raw) as { source?: string };
    if (data?.source !== "user") localStorage.removeItem(CONFIG_KEY);
  } catch {
    /* noop */
  }
}

function encodeWav(chunks: Int16Array[], sampleRate: number): Blob {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const buffer = new ArrayBuffer(44 + total * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + total * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, total * 2, true);
  let offset = 44;
  for (const chunk of chunks) {
    for (let i = 0; i < chunk.length; i += 1) {
      view.setInt16(offset, chunk[i], true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export class CloudTranscribeSession {
  private closed = false;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: AudioNode | null = null;
  private recorder: AudioWorkletNode | null = null;
  private analyser: AnalyserNode | null = null;
  private monitor: ReturnType<typeof setInterval> | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private mediaChunks: Blob[] = [];
  private mediaType = "";
  private chunks: Int16Array[] = [];
  private sampleRate = 16000;
  private startedAt = 0;
  private silentSince = 0;
  private spoken = false;
  private lang: "zh" | "en" = "zh";
  private config: StoredConfig;

  constructor(private events: ListenEvents, config: StoredConfig) {
    this.config = config;
  }

  setLanguage(lang: string) {
    this.lang = lang === "en" || lang === "english" ? "en" : "zh";
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      if (this.closed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;

      // 录音期间并行预热 TLS 连接：跨境链路握手就要几百毫秒，别等最后才建
      if (this.config.provider === "assemblyai") {
        void fetch("https://api.assemblyai.com/v2/upload", { method: "OPTIONS" }).catch(() => {});
      } else {
        void fetch("https://api.siliconflow.cn/v1/models", { method: "GET" }).catch(() => {});
      }

      const context = new AudioContext({ sampleRate: 16000 });
      this.context = context;
      await context.resume();
      this.sampleRate = context.sampleRate;
      if (this.closed) return;

      // 用 Blob 内联 worklet：不依赖 public 下的文件，子路径部署也不会 404
      const workletUrl = URL.createObjectURL(
        new Blob([PCM_WORKLET_SOURCE], { type: "application/javascript" }),
      );
      try {
        await context.audioWorklet.addModule(workletUrl);
      } finally {
        URL.revokeObjectURL(workletUrl);
      }
      if (this.closed) return;

      const source = context.createMediaStreamSource(stream);
      const recorder = new AudioWorkletNode(context, "pcm-recorder");
      const analyser = context.createAnalyser();

      // 小体积通道：webm/opus 约为 WAV 的 6%，上传快一个数量级
      try {
        const dest = context.createMediaStreamDestination();
        source.connect(dest);
        const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]
          .find((type) => MediaRecorder.isTypeSupported?.(type));
        if (mime) {
          this.mediaType = mime;
          this.mediaChunks = [];
          this.mediaRecorder = new MediaRecorder(dest.stream, {
            mimeType: mime,
            audioBitsPerSecond: 16000,
          });
          this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.mediaChunks.push(event.data);
          };
          this.mediaRecorder.start();
        }
      } catch {
        /* 不支持就退回 WAV */
      }
      analyser.fftSize = 1024;
      this.source = source;
      this.recorder = recorder;
      this.analyser = analyser;

      recorder.port.onmessage = (event) => {
        if (this.closed) return;
        this.chunks.push(new Int16Array(event.data as ArrayBuffer));
      };
      source.connect(analyser);
      source.connect(recorder);
      recorder.connect(context.destination);

      this.startedAt = performance.now();
      this.events.onReady();
      this.monitor = setInterval(() => this.checkLevel(), 120);
    } catch (error) {
      if (this.closed) return;
      const name = error instanceof Error ? error.name : "";
      const reason = error instanceof Error ? error.message : String(error);
      this.events.onError(
        name === "NotAllowedError"
          ? this.lang === "en"
            ? "Microphone access was declined. You can type the question."
            : "麦克风被拒绝了。可以把问题打出来。"
          : this.lang === "en"
            ? `The microphone couldn't start (${reason}). Type the question instead.`
            : `麦克风没能打开（${reason}）。把问题打出来也可以。`,
      );
      this.close();
    }
  }

  /** 说话结束后自动收尾；一直没声音就提示 */
  private checkLevel() {
    if (this.closed || !this.analyser) return;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) {
      const centered = (value - 128) / 128;
      sum += centered * centered;
    }
    const rms = Math.sqrt(sum / data.length);
    const now = performance.now();
    this.events.onLevel?.(Math.min(1, rms * 9));

    if (rms > SILENCE_RMS) {
      this.spoken = true;
      this.silentSince = 0;
    } else if (this.spoken) {
      if (!this.silentSince) this.silentSince = now;
      else if (now - this.silentSince > SILENCE_HOLD_MS) {
        void this.finish();
        return;
      }
    }

    const elapsed = now - this.startedAt;
    if (!this.spoken && elapsed > NO_SPEECH_LIMIT_MS) {
      this.close();
      this.events.onError(
        this.lang === "en"
          ? "I didn't hear anything. Check the microphone, or type the question."
          : "没有听到声音。检查一下麦克风，或者把问题打出来。",
      );
      return;
    }
    if (elapsed > MAX_RECORD_MS && this.spoken) void this.finish();
  }

  /** 结束录音并上传转写 */
  async finish() {
    if (this.closed) return;
    const chunks = this.chunks;
    const small = await this.collectSmallAudio();
    const totalSamples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    // 太短（<0.4 秒）说明没有有效语音，不必花额度
    if (totalSamples < this.sampleRate * 0.4) {
      this.stopCapture();
      this.close();
      this.events.onError(
        this.lang === "en"
          ? "That was too short. Hold the button, speak, then pause."
          : "这次太短了。点一下「听一个问题」，说完停一下就好。",
      );
      return;
    }
    this.stopCapture();
    if (!chunks.length) {
      this.close();
      this.events.onError(
        this.lang === "en" ? "Nothing was recorded. Try again." : "没有录到内容。再试一次。",
      );
      return;
    }
    // 有 webm 就用 webm（体积小、上传快），否则退回 WAV
    const audio = small ?? encodeWav(chunks, this.sampleRate);
    this.events.onTranscript(this.lang === "en" ? "Transcribing…" : "正在转写…");
    await this.transcribe(audio);
  }

  /** 收尾 MediaRecorder，拿到 webm/opus 音频 */
  private collectSmallAudio(): Promise<Blob | null> {
    const recorder = this.mediaRecorder;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 800);
      recorder.onstop = () => {
        clearTimeout(timer);
        const blob = new Blob(this.mediaChunks, { type: this.mediaType || "audio/webm" });
        resolve(blob.size > 0 ? blob : null);
      };
      try {
        recorder.stop();
      } catch {
        clearTimeout(timer);
        resolve(null);
      }
    });
  }

  private async transcribe(wav: Blob) {
    if (this.config.provider === "assemblyai") {
      await this.transcribeAssemblyAI(wav);
      return;
    }
    const provider = PROVIDERS.siliconflow;
    try {
      const form = new FormData();
      const isWebm = (wav.type || "").includes("webm") || (wav.type || "").includes("ogg");
      form.append("file", wav, isWebm ? "question.webm" : "question.wav");
      form.append("model", provider.model);

      const response = await fetch(`${provider.base}/v1/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.config.key}` },
        body: form,
        signal: AbortSignal.timeout(45_000),
      });
      const text = await response.text();
      let payload: any = null;
      try {
        payload = JSON.parse(text);
      } catch {
        /* 非 JSON */
      }

      if (!response.ok) {
        const detail =
          payload?.message || payload?.error?.message || payload?.detail || `HTTP ${response.status}`;
        this.close();
        this.events.onError(
          this.lang === "en"
            ? `The speech service refused the request (${detail}).`
            : `语音服务拒绝了这次请求（${detail}）。`,
        );
        return;
      }

      const transcript = String(payload?.text ?? "").trim();
      if (!transcript) {
        this.close();
        this.events.onError(
          this.lang === "en"
            ? "Nothing was recognised. Try again, closer to the microphone."
            : "没听清。靠近一点再说一次，或者把问题打出来。",
        );
        return;
      }
      this.close();
      this.events.onQuestion(transcript.slice(0, 700));
    } catch (error) {
      this.close();
      this.events.onError(
        error instanceof Error && error.name === "TimeoutError"
          ? this.lang === "en"
            ? "Transcription timed out. Try again, or type the question."
            : "转写超时了。再试一次，或者把问题打出来。"
          : this.lang === "en"
            ? "Couldn't reach the speech service. Check the network."
            : "连不上语音服务。检查一下网络。",
      );
    }
  }

  private stopCapture() {
    if (this.monitor) clearInterval(this.monitor);
    this.monitor = null;
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        /* noop */
      }
    }
    this.mediaRecorder = null;
    this.source?.disconnect();
    if (this.recorder) {
      this.recorder.port.onmessage = null;
      this.recorder.disconnect();
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stopCapture();
    if (this.context && this.context.state !== "closed") void this.context.close();
    this.context = null;
  }

  /**
   * AssemblyAI 必须走非流式接口才能得到汉字：
   * 实测流式 v3 + language_code=zh 返回的是拼音（"ni si en zahei"），
   * 而 v2/transcript 返回正确汉字。所以这里是上传 → 建任务 → 轮询。
   */
  private async transcribeAssemblyAI(wav: Blob) {
    const key = this.config.key;
    try {
      const upload = await fetch("https://api.assemblyai.com/v2/upload", {
        method: "POST",
        headers: { authorization: key, "content-type": "application/octet-stream" },
        body: wav,
        signal: AbortSignal.timeout(45_000),
      });
      if (!upload.ok) {
        const body = await upload.text().catch(() => "");
        this.close();
        this.events.onError(this.refused(upload.status, body));
        return;
      }
      const uploaded = (await upload.json()) as { upload_url?: string };
      if (!uploaded.upload_url) {
        this.close();
        this.events.onError(
          this.lang === "en" ? "Upload failed. Try again." : "上传失败，再试一次。",
        );
        return;
      }

      const create = await fetch("https://api.assemblyai.com/v2/transcript", {
        method: "POST",
        headers: { authorization: key, "content-type": "application/json" },
        body: JSON.stringify({
          audio_url: uploaded.upload_url,
          language_code: this.lang === "en" ? "en" : "zh",
          // speech_model 已废弃；这里是官方给的两级回退，准确率最高
          speech_models: ["universal-3-5-pro", "universal-2"],
          punctuate: true,
          format_text: true,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!create.ok) {
        const body = await create.text().catch(() => "");
        this.close();
        this.events.onError(this.refused(create.status, body));
        return;
      }
      const job = (await create.json()) as { id?: string };
      if (!job.id) {
        this.close();
        this.events.onError(
          this.lang === "en" ? "Transcription didn't start." : "转写没能开始。",
        );
        return;
      }

      for (let attempt = 0; attempt < 80; attempt += 1) {
        if (this.closed) return;
        // 第一次立刻问，之后 300ms 一次：转写通常 1~2 秒就绪
        if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 300));
        const poll = await fetch(`https://api.assemblyai.com/v2/transcript/${job.id}`, {
          headers: { authorization: key },
          signal: AbortSignal.timeout(15_000),
        });
        if (!poll.ok) continue;
        const data = (await poll.json()) as {
          status?: string;
          text?: string;
          error?: string;
        };
        if (data.status === "completed") {
          const transcript = String(data.text ?? "").trim();
          this.close();
          if (!transcript) {
            this.events.onError(
              this.lang === "en"
                ? "Nothing was recognised. Try again, closer to the microphone."
                : "没听清。靠近一点再说一次，或者把问题打出来。",
            );
            return;
          }
          this.events.onQuestion(transcript.slice(0, 700));
          return;
        }
        if (data.status === "error") {
          this.close();
          this.events.onError(
            this.lang === "en"
              ? `Transcription failed (${data.error ?? "unknown"}).`
              : `转写失败（${data.error ?? "未知原因"}）。`,
          );
          return;
        }
      }
      this.close();
      this.events.onError(
        this.lang === "en"
          ? "Transcription took too long. Try a shorter question."
          : "转写等太久了。问题短一点再试。",
      );
    } catch (error) {
      this.close();
      this.events.onError(
        error instanceof Error && error.name === "TimeoutError"
          ? this.lang === "en"
            ? "Transcription timed out. Try again."
            : "转写超时了，再试一次。"
          : this.lang === "en"
            ? "Couldn't reach the speech service. Check the network."
            : "连不上语音服务。检查一下网络。",
      );
    }
  }

  private refused(status: number, detail = ""): string {
    const extra = detail ? `：${detail.slice(0, 90)}` : "";
    if (status === 401 || status === 403) {
      return this.lang === "en"
        ? `The speech key was rejected (HTTP ${status}${detail ? ": " + detail.slice(0, 80) : ""}).`
        : `语音服务的 key 没通过（HTTP ${status}${extra}）。`;
    }
    if (status === 429) {
      return this.lang === "en"
        ? "The speech service is rate limited right now. Try again shortly."
        : "语音服务暂时限流了，稍等再试。";
    }
    return this.lang === "en"
      ? `The speech service refused the request (HTTP ${status}${detail ? ": " + detail.slice(0, 80) : ""}).`
      : `语音服务拒绝了这次请求（HTTP ${status}${extra}）。`;
  }
}
