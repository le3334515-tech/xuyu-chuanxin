/**
 * 中文听音：与 lib/assemblyai/listen-session.ts 相同的对外契约
 * （onReady / onTranscript / onQuestion / onError + start / close），
 * 引擎换成浏览器语音识别（Chrome / Edge 内置）。
 *
 * 原版把麦克风流推到 AssemblyAI 做流式转写；中文版改用系统识别，
 * 「听一句话 → 给三条可选回复」这个流程保持不变。
 * 「用一个示例问题试试」在没有麦克风时也能走通：本地注入一句中文问题。
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

function recognitionFactory(): RecognitionLike | null {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as {
    SpeechRecognition?: new () => RecognitionLike;
    webkitSpeechRecognition?: new () => RecognitionLike;
  };
  const Ctor = scope.SpeechRecognition || scope.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export class SpeechListenSession {
  private recognition: RecognitionLike | null = null;
  private lang: string = "zh";
  private closed = false;
  private sampleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private events: ListenEvents) {}

  setLanguage(lang: string) {
    this.lang = lang === "en" || lang === "english" ? "en" : "zh";
  }

  async start(recordedQuestion = false) {
    if (this.closed) return;

    // 示例问题：不走麦克风，直接给一句中文问题，让「回复建议」这条链路仍可体验
    if (recordedQuestion) {
      this.events.onReady();
      this.events.onTranscript("正在听…");
      this.sampleTimer = setTimeout(() => {
        if (this.closed) return;
        this.events.onQuestion(SAMPLE_QUESTION[this.lang] ?? SAMPLE_QUESTION.zh);
      }, 700);
      return;
    }

    const recognition = recognitionFactory();
    if (!recognition) {
      this.events.onError("这个浏览器不支持语音识别。可以直接把问题打出来，或换用 Chrome / Edge。");
      return;
    }

    recognition.lang = this.lang === "en" ? "en-US" : "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (this.closed) return;
      this.events.onReady();
    };

    recognition.onresult = (event: any) => {
      if (this.closed) return;
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = String(result[0]?.transcript ?? "").trim();
        if (result.isFinal) final += text;
        else interim += text;
      }
      if (interim) this.events.onTranscript(interim);
      if (final) this.events.onQuestion(final);
    };

    recognition.onerror = (event: any) => {
      if (this.closed) return;
      const code = String(event?.error ?? "");
      if (code === "aborted" || code === "no-speech") return;
      this.events.onError(
        code === "not-allowed" || code === "service-not-allowed"
          ? "麦克风没有授权。允许之后我可以继续听，也可以直接打字。"
          : "没听清。再说一次，或者把问题打出来也一样。",
      );
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.events.onError("麦克风没能打开。把问题打出来也可以。");
    }
  }

  close() {
    this.closed = true;
    if (this.sampleTimer) clearTimeout(this.sampleTimer);
    this.sampleTimer = null;
    try {
      this.recognition?.abort();
    } catch {
      /* noop */
    }
    this.recognition = null;
  }
}
