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
import { SpeechListenSession as ListenSession, readKey, writeKey } from "@/lib/speech/zh-listen";
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
  const [keyDraft, setKeyDraft] = useState(() => readKey());
  const [keyNotice, setKeyNotice] = useState("");
  const session = useRef<ListenSession | null>(null);
  const request = useRef<AbortController | null>(null);
  const questionEditor = useRef<HTMLDetailsElement>(null);
  const version = useRef(0);
  const busy = phase === "connecting" || phase === "listening" || phase === "thinking";

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

  // 切换语言时重置提示语与候选，避免中英混排
  useEffect(() => {
    setNotice(c.assist.noticeIdle);
    setReplies([]);
    setChosen(null);
    setPhase("idle");
  }, [c.assist.noticeIdle]);

  async function suggest(text: string, id: number, meaning = "") {
    if (id !== version.current || !text.trim()) return;
    setQuestion(text);
    setPhase("thinking");
    setNotice(c.assist.noticeThinking);
    try {
      const next = suggestReplies(text, meaning, language === "english" ? "en" : "zh");
      if (id !== version.current) return;
      setReplies(next);
      setPhase("ready");
      setNotice(meaning ? c.assist.noticeShaped : c.assist.noticeReady);
    } catch {
      if (id !== version.current) return;
      setPhase("error");
      setNotice(c.assist.noticeError);
    }
  }

  function start(recorded = false) {
    if (disabled || (!recorded && !consent)) return;
    onStart();
    cleanup();
    const id = version.current;
    setReplies([]);
    setChosen(null);
    setQuestion("");
    setIntent("");
    setSample(recorded);
    setPhase("connecting");
    setNotice(recorded ? c.assist.noticeRecordedOpen : c.assist.noticeMicOpen);
    const next = new ListenSession({
      onReady: () => {
        if (id !== version.current) return;
        setPhase("listening");
        setNotice(recorded ? c.assist.noticeTranscribing : c.assist.noticeListening);
      },
      onTranscript: (text) => {
        if (id === version.current) setQuestion(text);
      },
      onQuestion: (text) => {
        if (id === version.current) void suggest(text, id);
      },
      onError: (error) => {
        if (id !== version.current) return;
        setPhase("error");
        setNotice(error);
        // 识别走不通时，把打字的入口打开 —— 别让用户卡在死路
        if (questionEditor.current && !question.trim()) {
          questionEditor.current.open = true;
        }
      },
    });
    next.setLanguage(language);
    session.current = next;
    void next.start(recorded);
  }

  const listenState =
    phase === "listening"
      ? sample
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
          ) : (
            <button
              className="button primary listen-button"
              disabled={!consent || disabled}
              onClick={() => start()}
            >
              <Mic size={17} />
              {c.assist.listenToQuestion}
            </button>
          )}
          <button
            className="text-button"
            disabled={busy || disabled}
            onClick={() => start(true)}
          >
            <Play size={14} />
            {c.assist.tryRecorded}
          </button>
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
        <details className="listening-key">
          <summary>{c.assist.keyToggle}</summary>
          <div className="listening-key-body">
            <p>{c.assist.keyHint}</p>
            <div className="listening-key-row">
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
                  writeKey(clean);
                  setKeyDraft(clean);
                  setKeyNotice(clean ? c.assist.keySaved : c.assist.keyCleared);
                }}
              >
                {c.assist.keySave}
              </button>
              <button
                className="text-button"
                onClick={() => {
                  writeKey("");
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
          {(phase === "listening" || phase === "thinking") && (
            <div className="listening-bars" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => (
                <i key={i} style={{ animationDelay: `${i * 0.07}s` }} />
              ))}
            </div>
          )}
          <details className="question-editor" ref={questionEditor}>
            <summary>{c.assist.typeOrCorrect}</summary>
            <label>
              {c.assist.questionLabel}
              <textarea
                maxLength={700}
                value={question}
                disabled={busy || disabled}
                onChange={(event) => {
                  cleanup();
                  setSample(false);
                  setQuestion(event.target.value);
                  setReplies([]);
                  setChosen(null);
                  setPhase("idle");
                }}
              />
            </label>
            <button
              className="button"
              disabled={!question.trim() || busy || disabled}
              onClick={() => {
                onStart();
                cleanup();
                setReplies([]);
                setChosen(null);
                void suggest(question, version.current);
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
                if (!intent.trim() || busy || disabled) return;
                onStart();
                cleanup();
                setReplies([]);
                setChosen(null);
                void suggest(question, version.current, intent);
              }}
            >
              <label htmlFor="reply-intent">{c.assist.somethingElse}</label>
              <p>{c.assist.fewWords}</p>
              <input
                id="reply-intent"
                value={intent}
                maxLength={160}
                disabled={busy || disabled}
                placeholder={c.assist.intentPlaceholder}
                onChange={(event) => {
                  cleanup();
                  setIntent(event.target.value);
                  setReplies([]);
                  setChosen(null);
                  setPhase("idle");
                }}
              />
              <button
                className="button"
                disabled={!intent.trim() || busy || disabled}
                type="submit"
              >
                {c.assist.shapeReply}
                <ArrowRight size={15} />
              </button>
            </form>
          )}
        </div>
        <div className="reply-panel" aria-busy={phase === "thinking"}>
          <span className="conversation-label">{c.assist.possibleReplies}</span>
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
      <p className="conversation-notice" role="status">
        {disabled ? c.assist.speakingNotice(speakingText) : notice}
      </p>
    </section>
  );
}
