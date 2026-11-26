"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react";
import {
  ArrowRight,
  Check,
  Ear,
  Mic,
  Pencil,
  Play,
  Square,
  Volume2,
} from "lucide-react";
import {
  SpeechListenSession as ListenSession,
  readConfig,
  writeConfig,
  clearLegacyConfig,
  isBuiltinReady,
  type ProviderId,
} from "@/lib/speech/zh-listen";
import { clarifySpeech, generateReplies } from "@/lib/speech/llm";
import { suggestReplies } from "@/lib/speech/zh-replies";
import { useCopy } from "@/components/lang-provider";

export type ConversationHandle = { cancel: () => void };
type Props = {
  ref?: Ref<ConversationHandle>;
  language: "chinese" | "english";
  disabled: boolean;
  speakingText: string;
  onStart: () => void;
  onStop: () => void;
  onSpeak: (text: string) => void;
  onEdit: (text: string) => void;
};

type Phase = "idle" | "connecting" | "listening" | "thinking" | "ready" | "error";
/** 这次录音是「听对方」还是「我自己说」 */
type Mode = "listen" | "self";

/** 用户是否自己改过配置（用来区分「内置默认」和「自己填的」） */
function hasCustom(): boolean {
  try {
    return localStorage.getItem("xuyu.stt.config") !== null;
  } catch {
    return false;
  }
}

export function ConversationAssist({
  ref,
  language,
  disabled,
  speakingText,
  onStart,
  onStop,
  onSpeak,
  onEdit,
}: Props) {
  const c = useCopy();
  const [consent, setConsent] = useState(false);
  const [question, setQuestion] = useState("");
  const [intent, setIntent] = useState("");
  const [replies, setReplies] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [notice, setNotice] = useState(c.assist.noticeIdle);
  const [sample, setSample] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [fragments, setFragments] = useState("");
  const [mode, setMode] = useState<Mode>("listen");
  const session = useRef<ListenSession | null>(null);
  const request = useRef<AbortController | null>(null);
  const version = useRef(0);
  const questionEditor = useRef<HTMLDetailsElement>(null);
  const replyPanel = useRef<HTMLDivElement>(null);
  const busy = phase === "connecting" || phase === "listening" || phase === "thinking";

  const [sttConfig, setSttConfig] = useState(() => {
    // 旧版本留下的脏配置会盖掉内置凭据，先清掉再读
    clearLegacyConfig();
    return readConfig();
  });
  const [keyDraft, setKeyDraft] = useState(() => readConfig().key);
  const [keyNotice, setKeyNotice] = useState("");
  const [level, setLevel] = useState(0);

  /** 结果一出来就滚到能看见的地方，手机上不至于以为没反应 */
  const revealReplies = useCallback(() => {
    requestAnimationFrame(() => {
      replyPanel.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const cleanup = useCallback(() => {
    version.current++;
    session.current?.close();
    session.current = null;
    request.current?.abort();
    request.current = null;
  }, []);

  const cancel = useCallback(() => {
    cleanup();
    setPhase("idle");
    setLevel(0);
    setNotice(c.assist.noticeCancel);
  }, [cleanup, c.assist.noticeCancel]);

  useImperativeHandle(ref, () => ({ cancel }), [cancel]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") cancel();
    };
    const hidden = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", cancel);
    return () => {
      cleanup();
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", cancel);
    };
  }, [cancel, cleanup]);

  useEffect(() => {
    setNotice(c.assist.noticeIdle);
    setReplies([]);
    setChosen(null);
    setFragments("");
    setPhase("idle");
  }, [c.assist.noticeIdle]);

  /* ── 生成回答：只由用户点「给我几个说法」触发 ───────────────── */

  async function makeReplies(text: string, extra: string) {
    const target = String(text ?? "").trim();
    if (!target) return;
    const id = ++version.current;
    setPhase("thinking");
    setNotice(c.assist.noticeThinking);
    const lang: "zh" | "en" = language === "english" ? "en" : "zh";

    const controller = new AbortController();
    request.current = controller;
    const result = await generateReplies(target, extra, lang, controller.signal);
    if (id !== version.current) return;

    if (result.candidates.length) {
      setReplies(result.candidates);
      setFragments("");
      setPhase("ready");
      setNotice(c.assist.noticeReplied(result.ms));
      revealReplies();
      return;
    }

    // 模型不可用：本地规则兜底
    const fallback = suggestReplies(target, extra, lang);
    setReplies(fallback);
    setFragments("");
    setPhase("ready");
    setNotice(c.assist.noticeFallback);
    revealReplies();
  }

  /* ── 我自己说：录自己的话 → 补成通顺句子 ─────────────────── */

  function startSelf() {
    if (disabled) return;
    onStart();
    cleanup();
    const id = version.current;
    setMode("self");
    setReplies([]);
    setChosen(null);
    setFragments("");
    setSample(false);
    setPhase("connecting");
    setNotice(c.assist.noticeSelfStart);

    const next = new ListenSession({
      onLevel: (value) => {
        if (id === version.current) setLevel(value);
      },
      onReady: () => {
        if (id !== version.current) return;
        setPhase("listening");
        setNotice(c.assist.noticeSelfListening);
      },
      onTranscript: (text) => {
        if (id === version.current) setFragments(text);
      },
      onQuestion: (text) => {
        if (id === version.current) void clarifySelf(text, id);
      },
      onError: (error) => {
        if (id !== version.current) return;
        setPhase("error");
        setLevel(0);
        setNotice(error);
      },
    });
    next.setLanguage(language);
    session.current = next;
    void next.start(false);
  }

  async function clarifySelf(fragment: string, id: number) {
    setPhase("thinking");
    setNotice(c.assist.noticeClarifying);
    const lang: "zh" | "en" = language === "english" ? "en" : "zh";
    const controller = new AbortController();
    request.current = controller;
    const result = await clarifySpeech(fragment, question, lang, controller.signal);
    if (id !== version.current) return;

    if (result.candidates.length) {
      setFragments(fragment);
      setReplies(result.candidates);
      setPhase("ready");
      setNotice(c.assist.noticeClarified(result.ms));
      revealReplies();
      return;
    }
    // 模型不可用：至少把识别到的原样给他，能改
    setFragments(fragment);
    setReplies([fragment]);
    setPhase("ready");
    setNotice(c.assist.noticeClarifyFallback);
    revealReplies();
  }

  /* ── 听一个问题：录对方的话，只填问题，不自动生成 ───────────── */

  function startListen(recorded = false) {
    if (disabled || (!recorded && !consent)) return;
    onStart();
    cleanup();
    const id = version.current;
    setMode("listen");
    setReplies([]);
    setChosen(null);
    setFragments("");
    setQuestion("");
    setIntent("");
    setSample(recorded);
    setPhase("connecting");
    setNotice(recorded ? c.assist.noticeRecordedOpen : c.assist.noticeMicOpen);

    const next = new ListenSession({
      onLevel: (value) => {
        if (id === version.current) setLevel(value);
      },
      onReady: () => {
        if (id !== version.current) return;
        setPhase("listening");
        setNotice(recorded ? c.assist.noticeTranscribing : c.assist.noticeListening);
      },
      onTranscript: (text) => {
        if (id === version.current) setQuestion(text);
      },
      onQuestion: (text) => {
        if (id !== version.current) return;
        // 只把问题填好，让用户自己决定什么时候生成
        setQuestion(text);
        setPhase("idle");
        setLevel(0);
        setNotice(c.assist.noticeQuestionReady);
        if (questionEditor.current) questionEditor.current.open = true;
      },
      onError: (error) => {
        if (id !== version.current) return;
        setPhase("error");
        setLevel(0);
        setNotice(error);
        if (questionEditor.current && !question.trim()) questionEditor.current.open = true;
      },
    });
    next.setLanguage(language);
    session.current = next;
    void next.start(recorded);
  }

  const listenState =
    phase === "listening"
      ? mode === "self"
        ? c.assist.micOnSelf
        : sample
          ? c.assist.recorded
          : c.assist.micOn
      : phase === "connecting" && !sample
        ? c.assist.micOpening
        : c.assist.micOff;

  const momentPhrase =
    language === "english" ? "Give me a moment, please." : "给我一点时间，好吗？";

  return (
    <section
      className={`conversation-assist conversation-${phase}`}
      aria-labelledby="conversation-heading"
    >
      <div className="conversation-heading">
        <div>
          <span className="eyebrow">{c.assist.eyebrow}</span>
          <h2 id="conversation-heading">{c.assist.heading}</h2>
        </div>
        <span className="listen-state">
          <i />
          {listenState}
        </span>
      </div>

      <div className="conversation-start">
        <label className="listening-consent">
          <input
            type="checkbox"
            checked={consent}
            disabled={disabled || busy}
            onChange={(event) => setConsent(event.target.checked)}
          />
          {c.assist.consent}
        </label>

        {/* 两个入口：听别人说 / 我自己说 */}
        <div className="conversation-modes">
          <button
            className={`mode-card ${mode === "listen" ? "is-on" : ""}`}
            disabled={disabled || busy}
            onClick={() => setMode("listen")}
          >
            <Ear size={18} />
            <strong>{c.assist.modeListenTitle}</strong>
            <span>{c.assist.modeListenHint}</span>
          </button>
          <button
            className={`mode-card ${mode === "self" ? "is-on" : ""}`}
            disabled={disabled || busy}
            onClick={() => setMode("self")}
          >
            <Mic size={18} />
            <strong>{c.assist.modeSelfTitle}</strong>
            <span>{c.assist.modeSelfHint}</span>
          </button>
        </div>

        <div className="conversation-controls">
          {disabled && (
            <button className="button stop-button" onClick={onStop}>
              <Square size={15} fill="currentColor" />
              {c.assist.stopSpeech}
            </button>
          )}
          {busy ? (
            <button className="button listen-button" onClick={cancel}>
              <Square size={15} />
              {c.assist.cancelListening}
            </button>
          ) : mode === "self" ? (
            <button className="button primary listen-button" onClick={startSelf}>
              <Mic size={17} />
              {c.assist.startSelf}
            </button>
          ) : (
            <button
              className="button primary listen-button"
              disabled={!consent || disabled}
              onClick={() => startListen()}
            >
              <Mic size={17} />
              {c.assist.listenToQuestion}
            </button>
          )}
          {mode === "listen" && (
            <button
              className="text-button"
              disabled={busy || disabled}
              onClick={() => startListen(true)}
            >
              <Play size={14} />
              {c.assist.tryRecorded}
            </button>
          )}
          <button
            className="text-button hold-turn"
            disabled={disabled}
            onClick={() => {
              cleanup();
              setChosen(momentPhrase);
              setPhase("idle");
              onSpeak(momentPhrase);
            }}
          >
            <Volume2 size={15} />
            {c.assist.giveMeMoment}
          </button>
        </div>
        <p className="listening-privacy">{c.assist.privacy}</p>
        <p className="listening-engine">
          {sttConfig.provider === "browser"
            ? c.assist.engineBrowser
            : sttConfig.provider === "siliconflow"
              ? c.assist.engineSf
              : isBuiltinReady() && sttConfig.key === readConfig().key && !hasCustom()
                ? c.assist.engineBuiltin
                : c.assist.engineAai}
        </p>

        <details className="listening-key">
          <summary>{c.assist.keyToggle}</summary>
          <div className="listening-key-body">
            <p>{c.assist.keyHint}</p>
            <div className="listening-key-row">
              <select
                value={sttConfig.provider}
                onChange={(event) => {
                  const provider = event.target.value as ProviderId;
                  setSttConfig({ provider, key: keyDraft });
                  writeConfig({ provider, key: keyDraft });
                  setKeyNotice(provider === "browser" ? c.assist.keyProviderBrowser : "");
                }}
              >
                <option value="browser">{c.assist.keyProviderBrowser}</option>
                <option value="siliconflow">{c.assist.keyProviderSf}</option>
                <option value="assemblyai">{c.assist.keyProviderAai}</option>
              </select>
              <input
                type="password"
                value={keyDraft}
                placeholder={c.assist.keyPlaceholder}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setKeyDraft(event.target.value)}
              />
              <button
                className="button"
                onClick={() => {
                  const clean = keyDraft.trim();
                  if (clean && clean.length < 20) {
                    setKeyNotice(c.assist.keyInvalid);
                    return;
                  }
                  const provider: ProviderId =
                    sttConfig.provider === "browser" ? "siliconflow" : sttConfig.provider;
                  writeConfig({ provider, key: clean });
                  setSttConfig({ provider, key: clean });
                  setKeyDraft(clean);
                  setKeyNotice(clean ? c.assist.keySaved : c.assist.keyCleared);
                }}
              >
                {c.assist.keySave}
              </button>
              <button
                className="text-button"
                onClick={() => {
                  writeConfig({ provider: "browser", key: "" });
                  setSttConfig({ provider: "browser", key: "" });
                  setKeyDraft("");
                  setKeyNotice(c.assist.keyCleared);
                }}
              >
                {c.assist.keyClear}
              </button>
            </div>
            <p className="listening-key-notice" role="status">
              {keyNotice}
            </p>
          </div>
        </details>
      </div>

      <div className="conversation-flow">
        <div className="question-panel">
          <span className="conversation-label">
            <Ear size={16} />
            {sample ? c.assist.questionRecorded : c.assist.question}
          </span>
          <p className="heard-question">
            {question || (phase === "listening" ? c.assist.listening : c.assist.whatBack)}
          </p>
          {fragments && fragments !== question && (
            <p className="heard-fragment">
              <span>{c.assist.fragmentLabel}</span>
              {fragments}
            </p>
          )}
          {(phase === "listening" || phase === "thinking") && (
            <div className="listening-bars" aria-hidden="true" data-live={level > 0.02 ? "1" : "0"}>
              {Array.from({ length: 16 }, (_, i) => {
                const shape = 1 - Math.abs(i - 7.5) / 9;
                const height = 8 + level * 46 * shape;
                return (
                  <i
                    key={i}
                    style={{
                      height: `${Math.max(8, height)}px`,
                      animationDelay: `${i * 0.07}s`,
                      opacity: level > 0.02 ? 1 : 0.45,
                    }}
                  />
                );
              })}
            </div>
          )}
          <details className="question-editor" ref={questionEditor}>
            <summary>{c.assist.typeOrCorrect}</summary>
            <label>
              {c.assist.questionLabel}
              <textarea
                maxLength={700}
                value={question}
                disabled={disabled}
                onChange={(event) => {
                  cleanup();
                  setSample(false);
                  setQuestion(event.target.value);
                  setReplies([]);
                  setChosen(null);
                  setFragments("");
                  setPhase("idle");
                }}
              />
            </label>
            <button
              className="button"
              disabled={!question.trim() || busy || disabled}
              onClick={() => {
                onStart();
                setChosen(null);
                void makeReplies(question, intent);
              }}
            >
              {c.assist.suggestReplies}
              <ArrowRight size={15} />
            </button>
          </details>
          {question && (
            <form
              className="intent-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (busy || disabled) return;
                onStart();
                setChosen(null);
                void makeReplies(question, intent);
              }}
            >
              <label htmlFor="reply-intent">{c.assist.somethingElse}</label>
              <p>{c.assist.fewWords}</p>
              <input
                id="reply-intent"
                value={intent}
                maxLength={160}
                disabled={disabled}
                placeholder={c.assist.intentPlaceholder}
                onChange={(event) => setIntent(event.target.value)}
              />
              <button className="button" disabled={busy || disabled} type="submit">
                {c.assist.shapeReply}
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </div>
        <div className="reply-panel" aria-busy={phase === "thinking"} ref={replyPanel}>
          <span className="conversation-label">{c.assist.possibleReplies}</span>
          <p className="authorship-note" title={c.assist.authorshipHint}>
            {c.assist.authorship}
          </p>
          {replies.length ? (
            <div className="reply-options">
              {replies.map((reply, index) => (
                <div
                  className={`reply-option ${chosen === reply ? "reply-chosen" : ""}`}
                  key={reply}
                  style={{ animationDelay: `${index * 0.09}s` }}
                >
                  <p>{reply}</p>
                  <div>
                    <button
                      className="reply-speak"
                      aria-label={`${c.assist.speak}：${reply}`}
                      disabled={disabled || busy}
                      onClick={() => {
                        cleanup();
                        setChosen(reply);
                        setPhase("ready");
                        onSpeak(reply);
                      }}
                    >
                      {chosen === reply ? <Check size={17} /> : <Volume2 size={17} />}
                      {c.assist.speak}
                    </button>
                    <button
                      className="reply-edit"
                      aria-label={`${c.assist.edit}：${reply}`}
                      disabled={disabled || busy}
                      onClick={() => {
                        cancel();
                        onEdit(reply);
                      }}
                    >
                      <Pencil size={14} />
                      {c.assist.edit}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="replies-empty">
              <span>{phase === "thinking" ? c.assist.findingWords : c.assist.fewWays}</span>
              <p>{phase === "thinking" ? c.assist.youChoose : c.assist.listenOrTry}</p>
            </div>
          )}
        </div>
      </div>
      {(busy || phase === "ready") && (
        <ol className="stage-steps" aria-hidden="true">
          <li data-on="true" data-active={phase === "connecting" || phase === "listening"}>
            {c.assist.stepListen}
          </li>
          <li data-on={phase === "thinking" || phase === "ready"} data-active={phase === "thinking"}>
            {c.assist.stepTranscribe}
          </li>
          <li data-on={phase === "ready"} data-active={phase === "ready"}>
            {c.assist.stepDone}
          </li>
        </ol>
      )}
      <p className="conversation-notice" role="status">
        {disabled ? c.assist.speakingNotice(speakingText) : notice}
      </p>
    </section>
  );
}
