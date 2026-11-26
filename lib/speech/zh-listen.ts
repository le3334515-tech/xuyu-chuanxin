/**
 * 听音：与 lib/assemblyai/listen-session.ts 相同的对外契约
 * （onReady / onTranscript / onQuestion / onError + start / close），
 * 引擎换成浏览器语音识别。
 *
 * 浏览器识别的现实：Chrome 的 webkitSpeechRecognition 依赖外部语音服务，
 * 在某些网络下 start 之后「静默卡死」—— 不给 result、不给 error、不给 end。
 * 原版有超时保护，这里同样必须有，否则界面会永远停在「正在听…」。
 */

export type ListenEvents = {
  onReady: () => void;
  onTranscript: (text: string) => void;
  onQuestion: (text: string) => void;
  onError: (message: string) => void;
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

/** 多久没有任何进展就判定识别服务无响应 */
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

function networkHint(): string {
  if (typeof navigator === "undefined") return "";
  return isEdge()
    ? "识别服务没有响应。已帮你打开输入框：直接打问题也能拿到三条说法；换用 Edge 还能用麦克风。"
    : "这个浏览器的语音识别这次没有响应（Chrome 依赖外部语音服务，某些网络下会这样）。已帮你打开下面的输入框：直接打问题也能拿到三条说法，或者换用 Edge 再用麦克风。";
}

export class SpeechListenSession {
  private recognition: RecognitionLike | null = null;
  private closed = false;
  private lang: string = "zh";
  private sampleTimer: ReturnType<typeof setTimeout> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private sessionTimer: ReturnType<typeof setTimeout> | null = null;
  private heardSomething = false;
  private delivered = false;

  constructor(private events: ListenEvents) {}

  setLanguage(lang: string) {
    this.lang = lang === "en" || lang === "english" ? "en" : "zh";
  }

  async start(recordedQuestion = false) {
    if (this.closed) return;

    if (recordedQuestion) {
      this.events.onReady();
      this.events.onTranscript(this.lang === "en" ? "Listening…" : "正在听…");
      this.sampleTimer = setTimeout(() => {
        if (this.closed) return;
        this.deliver(SAMPLE_QUESTION[this.lang] ?? SAMPLE_QUESTION.zh);
      }, 700);
      return;
    }

    const recognition = recognitionFactory();
    if (!recognition) {
      this.events.onError(
        this.lang === "en"
          ? "This browser has no speech recognition. Type the question instead, or use Edge."
          : "这个浏览器不支持语音识别。可以把问题打出来，或换用 Edge。",
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
        this.events.onError(networkHint());
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
      // 结束了却没拿到一句话：别让界面停在「正在听…」
      this.events.onError(
        this.heardSomething
          ? this.lang === "en"
            ? "That was cut off. Try once more, or type the question."
            : "这句没听完。再说一次，或者把问题打出来。"
          : networkHint(),
      );
    };

    this.recognition = recognition;
    try {
      recognition.start();
      // start 之前也要有表：某些实现连 onstart 都不触发
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

  /** 无进展就看门狗：识别服务静默卡死时给用户一条出路 */
  private armSilenceTimer() {
    if (this.silenceTimer) clearTimeout(this.silenceTimer);
    this.silenceTimer = setTimeout(() => {
      if (this.closed || this.delivered) return;
      this.stopRecognition();
      this.events.onError(networkHint());
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
  }
}
