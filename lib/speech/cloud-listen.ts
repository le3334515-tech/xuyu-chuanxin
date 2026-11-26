/**
 * 云端流式听写（AssemblyAI）—— 中文可靠的一条路。
 *
 * 为什么需要它：浏览器的 webkitSpeechRecognition 在 Chrome 上依赖外部语音服务，
 * 部分网络下按下之后完全静默（无 result / error / end）。这里改用 AssemblyAI 的
 * 多语言流式模型（speech_model=universal-streaming-multilingual，支持中文），
 * 用使用者自己的 API key 在浏览器里直接换临时 token —— 那条接口的 CORS 是
 * `access-control-allow-origin: *`，所以纯静态站点也能调，key 只存在本机。
 */

export type ListenEvents = {
  onReady: () => void;
  onTranscript: (text: string) => void;
  onQuestion: (text: string) => void;
  onError: (message: string) => void;
};

const KEY_STORAGE = "xuyu.assemblyai.key";
const TOKEN_URL = "https://token.us.assemblyai.com/v1/token";
const WS_URL = "wss://streaming.assemblyai.com/v3/ws";

export function readKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function writeKey(key: string): void {
  try {
    const clean = key.trim();
    if (clean) localStorage.setItem(KEY_STORAGE, clean);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    /* 隐私模式下写不进，本次仍可用 */
  }
}

export function hasKey(): boolean {
  return readKey().length > 0;
}

export class CloudListenSession {
  private closed = false;
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private socket: WebSocket | null = null;
  private source: AudioNode | null = null;
  private recorder: AudioWorkletNode | null = null;
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private abort = new AbortController();
  private settled = false;
  private lang: "zh" | "en" = "zh";

  constructor(private events: ListenEvents) {}

  setLanguage(lang: string) {
    this.lang = lang === "en" || lang === "english" ? "en" : "zh";
  }

  async start(recordedQuestion = false) {
    const key = readKey();
    if (!key) {
      this.events.onError(
        this.lang === "en"
          ? "No speech key is saved. Add your AssemblyAI key, or type the question."
          : "还没有填语音服务的 key。填上 AssemblyAI 的 key 就能用麦克风，或者先把问题打出来。",
      );
      return;
    }
    try {
      if (this.closed) return;
      this.timeout = setTimeout(
        () =>
          this.fail(
            this.lang === "en"
              ? "Listening stopped after 30 seconds. Try again or type the question."
              : "听音超过 30 秒，已停下。再试一次，或者把问题打出来。",
          ),
        30_000,
      );

      if (recordedQuestion) {
        // 示例问题不占麦克风，也用同一条链路验证服务
        const response = await fetch("/demo/question.wav", { signal: this.abort.signal }).catch(() => null);
        if (!response || !response.ok) {
          this.close();
          this.events.onError(
            this.lang === "en"
              ? "Recorded question unavailable. Try the microphone or type it."
              : "示例问题不可用，用麦克风或者自己打出来。",
          );
          return;
        }
      }

      const context = new AudioContext({ sampleRate: 16000 });
      this.context = context;
      await context.resume();
      if (this.closed) return;

      if (!recordedQuestion) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
        });
        if (this.closed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        this.stream = stream;
      } else {
        this.stream = null;
      }

      await context.audioWorklet.addModule("/audio/pcm-worklet.js");
      if (this.closed) return;

      const token = await this.exchangeToken(key);
      if (!token) return;

      const query = new URLSearchParams({
        token,
        sample_rate: String(context.sampleRate),
        encoding: "pcm_s16le",
        speech_model: "universal-streaming-multilingual",
        language_code: this.lang === "en" ? "en" : "zh",
      });
      const socket = new WebSocket(`${WS_URL}?${query}`);
      this.socket = socket;

      await new Promise<void>((resolve, reject) => {
        socket.onmessage = (event) => {
          if (this.closed) return;
          let message: any;
          try {
            message = JSON.parse(event.data as string);
          } catch {
            this.fail(
              this.lang === "en"
                ? "The transcription service returned an unreadable response."
                : "转写服务返回了无法识别的内容。",
            );
            return;
          }
          if (message.type === "Begin") {
            this.armWatchdog();
            resolve();
          }
          if (message.type === "Error" || message.error) {
            this.fail(
              String(message.error ?? "") ||
                (this.lang === "en" ? "Transcription stopped." : "转写中断了。"),
            );
          }
          if (message.type === "Turn" && typeof message.transcript === "string") {
            const text = String(message.transcript).trim();
            if (!text) return;
            this.armWatchdog();
            if (text.length > 700) {
              this.fail(
                this.lang === "en"
                  ? "That question is too long. Ask something shorter, or type it."
                  : "这个问题太长了。问短一点，或者直接打出来。",
              );
              return;
            }
            this.events.onTranscript(text);
            if (message.end_of_turn) {
              this.settled = true;
              this.close();
              this.events.onQuestion(text);
            }
          }
        };
        socket.onerror = () =>
          this.fail(
            this.lang === "en"
              ? "The transcription connection failed. Check the key and try again."
              : "转写连接失败。检查一下 key，再试一次。",
          );
        socket.onclose = () => {
          if (!this.closed && !this.settled) {
            this.fail(
              this.lang === "en"
                ? "Transcription disconnected. Try again, or type the question."
                : "转写连接断了。再试一次，或者把问题打出来。",
            );
          }
        };
        setTimeout(() => reject(new Error("timeout")), 12_000);
      }).catch(() => {
        if (!this.closed && !this.settled) {
          this.fail(
            this.lang === "en"
              ? "The transcription service did not respond. Try again, or type the question."
              : "转写服务没有响应。再试一次，或者把问题打出来。",
          );
        }
      });

      if (this.closed || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;
      this.events.onReady();

      const source = context.createMediaStreamSource(this.stream!);
      const recorder = new AudioWorkletNode(context, "pcm-recorder");
      this.source = source;
      this.recorder = recorder;
      recorder.port.onmessage = (event) => {
        if (!this.closed && this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(event.data);
        }
      };
      source.connect(recorder);
      recorder.connect(context.destination);
    } catch (error) {
      if (this.closed) return;
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError") {
        this.fail(
          this.lang === "en"
            ? "Microphone access was declined. You can type the question."
            : "麦克风被拒绝了。可以把问题打出来。",
        );
        return;
      }
      this.fail(
        error instanceof Error && error.message !== "timeout"
          ? error.message
          : this.lang === "en"
            ? "Listening couldn’t start. Try again, or type the question."
            : "听音没能启动。再试一次，或者把问题打出来。",
      );
    }
  }

  private async exchangeToken(key: string): Promise<string | null> {
    try {
      const response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { Authorization: key, "Content-Type": "application/json" },
        body: JSON.stringify({
          product: "streaming",
          expires_in_seconds: 30,
          max_session_duration_seconds: 60,
          access: {
            streaming: { enabled: true },
            tts: { enabled: false },
            speech_to_speech: { enabled: false },
            sync: { enabled: false },
            dictation: { enabled: false },
            llm_gateway: { enabled: false },
          },
        }),
        signal: AbortSignal.timeout(12_000),
      });
      const payload = (await response.json().catch(() => ({}))) as { token?: string; detail?: unknown };
      if (!response.ok || !payload.token) {
        const detail = typeof payload.detail === "string" ? payload.detail : `HTTP ${response.status}`;
        this.close();
        this.events.onError(
          this.lang === "en"
            ? `The speech key was rejected (${detail}). Check it and try again.`
            : `语音服务的 key 没通过（${detail}）。检查一下再试。`,
        );
        return null;
      }
      return payload.token;
    } catch {
      this.close();
      this.events.onError(
        this.lang === "en"
          ? "Couldn’t reach the speech service. Check your network and try again."
          : "连不上语音服务。检查网络后再试。",
      );
      return null;
    }
  }

  private armWatchdog() {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = setTimeout(() => {
      if (this.closed || this.settled) return;
      this.fail(
        this.lang === "en"
          ? "No speech reached the transcription service. Check the microphone and try again."
          : "没有听到内容。检查一下麦克风，再说一次。",
      );
    }, 15_000);
  }

  private fail(message: string) {
    if (this.closed) return;
    this.close();
    this.events.onError(message);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.abort.abort();
    if (this.timeout) clearTimeout(this.timeout);
    if (this.watchdog) clearTimeout(this.watchdog);
    this.source?.disconnect();
    if (this.recorder) {
      this.recorder.port.onmessage = null;
      this.recorder.disconnect();
    }
    this.stream?.getTracks().forEach((track) => track.stop());
    if (this.context && this.context.state !== "closed") void this.context.close();
    if (this.socket) {
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      try {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ type: "Terminate" }));
        }
        this.socket.close();
      } catch {
        /* noop */
      }
    }
  }
}
