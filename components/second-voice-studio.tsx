"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Check,
  Contrast,
  CornerDownLeft,
  Eye,
  MessageSquare,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Type,
  Volume2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { SpeechScene } from "@/components/speech-scene";
import { Brand } from "@/components/brand";
import { ConversationAssist, type ConversationHandle } from "@/components/conversation-assist";
import { firstVoiceId, refreshVoices, voiceOptions } from "@/lib/voices";
import type { SupportedLanguage } from "@/lib/language";
import { SpeechSession } from "@/lib/speech/zh-tts";
import { LangToggle, useCopy, useLang } from "@/components/lang-provider";
import { PageTitle } from "@/components/page-title";
import { segmentText } from "@/lib/text-zh";
import {
  addPhrase,
  MAX_MESSAGE,
  PHRASES_KEY,
  readPhrases,
  STARTER_PHRASES,
} from "@/lib/phrases";

type Status =
  "ready" | "connecting" | "speaking" | "stopped" | "complete" | "error";
type Entry = {
  id: number;
  text: string;
  played: string;
  kind: "stopped" | "complete";
};
// 起手句按当前界面语言取，见组件内的 STARTERS
const subscribePhrases = (callback: () => void) => {
  window.addEventListener("storage", callback);
  window.addEventListener("secondvoice:phrases", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("secondvoice:phrases", callback);
  };
};
const getPhrases = () => {
  try {
    return localStorage.getItem(PHRASES_KEY);
  } catch {
    return null;
  }
};
const subscribeNetwork = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};

export function SecondVoiceStudio({
  initialMessage = "",
}: {
  initialMessage?: string;
}) {
  const c = useCopy();
  const { lang, speechTag } = useLang();
  const STARTERS = c.starters;
  const [text, setText] = useState(initialMessage);
  const [utterance, setUtterance] = useState("");
  const [previousMessage, setPreviousMessage] = useState("");
  const [speechRun, setSpeechRun] = useState(0);
  const [heard, setHeard] = useState("");
  const [status, setStatus] = useState<Status>("ready");
  const [voice, setVoice] = useState(() => firstVoiceId("chinese"));
  const [voiceTick, setVoiceTick] = useState(0);
  const [language, setLanguage] = useState<SupportedLanguage>(lang === "en" ? "english" : "chinese");
  const [notice, setNotice] = useState(c.studio.noticeIdle);
  const [history, setHistory] = useState<Entry[]>([]);
  const [contrast, setContrast] = useState(false);
  const [largeType, setLargeType] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [events, setEvents] = useState<string[]>([]);
  const [displayText, setDisplayText] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const previewAudio = useRef<HTMLAudioElement>(null);
  const previewGeneration = useRef(0);

  const [phraseNotice, setPhraseNotice] = useState("");
  const [clearedDraft, setClearedDraft] = useState<string | null>(null);
  const session = useRef<SpeechSession | null>(null);
  const conversation = useRef<ConversationHandle>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const lastPlayed = useRef("");
  const currentMessage = useRef("");
  const revisionBase = useRef("");
  const entryId = useRef(0);
  const editor = useRef<HTMLTextAreaElement>(null);
  const listener = useRef<HTMLDialogElement>(null);
  const phraseValue = useSyncExternalStore(
    subscribePhrases,
    getPhrases,
    () => null,
  );
  const saved = useMemo(() => readPhrases(phraseValue), [phraseValue]);
  const online = useSyncExternalStore(
    subscribeNetwork,
    () => navigator.onLine,
    () => true,
  );
  const active = status === "connecting" || status === "speaking";
  const voices = useMemo(() => voiceOptions(language), [language, voiceTick]);
  const selectedVoice = voices.find((item) => item.id === voice) ?? voices[0];
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const hasText = Boolean(text.trim());
  const isSaved = saved.some(
    (phrase) => phrase.toLowerCase() === text.trim().toLowerCase(),
  );

  const dispose = useCallback(() => {
    generation.current++;
    session.current?.close();
    session.current = null;
    busy.current = false;
  }, []);
  useEffect(() => () => dispose(), [dispose]);
  useEffect(() => {
    const next: SupportedLanguage = lang === "en" ? "english" : "chinese";
    setLanguage(next);
    setVoice(firstVoiceId(next));
    setVoiceTick((value) => value + 1);
  }, [lang]);
  useEffect(() => {
    refreshVoices();
    setVoiceTick((value) => value + 1);
    const engine = window.speechSynthesis;
    if (!engine) return;
    const update = () => {
      refreshVoices();
      setVoiceTick((value) => value + 1);
    };
    engine.addEventListener?.("voiceschanged", update);
    return () => engine.removeEventListener?.("voiceschanged", update);
  }, []);

  const disposePreview = useCallback(() => {
    previewGeneration.current++;
    const player = previewAudio.current;
    if (!player) return;
    player.pause();
    player.onended = null;
    player.onerror = null;
  }, []);
  useEffect(() => {
    const player = previewAudio.current;
    const previewVersion = previewGeneration;
    return () => {
      previewVersion.current++;
      if (player) {
        player.pause();
        player.onended = null;
        player.onerror = null;
      }
    };
  }, []);
  const stopPreview = useCallback(() => {
    window.speechSynthesis?.cancel();
    disposePreview();
    setPreviewing(false);
    setPreviewError("");
  }, [disposePreview]);
  async function previewVoice() {
    if (active) return;
    conversation.current?.cancel();
    if (previewing) {
      window.speechSynthesis?.cancel();
      stopPreview();
      return;
    }
    stopPreview();
    const line = language === "english" ? "This is how your message will sound." : "这是念出来时的声音。";
    const started = SpeechSession.preview(voice, language, line, () => stopPreview());
    if (!started) {
      setPreviewError(c.studio.noticePreviewFail);
      return;
    }
    setPreviewing(true);
  }

  const stop = useCallback(() => {
    conversation.current?.cancel();
    stopPreview();
    if (!busy.current) return;
    const played = lastPlayed.current;
    const message = currentMessage.current;
    revisionBase.current = message;
    session.current?.cancel();
    dispose();
    setStatus("stopped");

    if (message)
      setHistory((items) => [
        ...items.slice(-19),
        { id: ++entryId.current, text: message, played, kind: "stopped" },
      ]);
    setNotice(c.studio.noticeStopped);
  }, [dispose, stopPreview]);

  const speak = useCallback(async (reply?: string) => {
    const approved = (reply ?? text).trim();
    if (busy.current || !approved || approved.length > MAX_MESSAGE) return;
    conversation.current?.cancel();
    if (reply !== undefined) setText(approved);
    stopPreview();
    if (!navigator.onLine) {
      setNotice(c.studio.noticeOffline);
      setStatus("error");
      return;
    }
    dispose();
    busy.current = true;
    const id = generation.current;
    const current = () => generation.current === id;
    setPreviousMessage(revisionBase.current);
    revisionBase.current = "";
    setSpeechRun((value) => value + 1);
    currentMessage.current = approved;
    lastPlayed.current = "";
    setUtterance(approved);
    setHeard("");
    setLatency(null);
    setEvents([]);

    setStatus("connecting");
    setNotice(c.studio.noticeConnecting);
    const next = new SpeechSession({
      onStatus: (state) => {
        if (current() && state === "speaking") {
          setStatus("speaking");
          setNotice(c.studio.noticePlaying);
        }
      },
      onWord: (word, index) => {
        if (!current()) return;
        const portion = segmentText(approved)
          .slice(0, index + 1)
          .map((item) => item.word)
          .join("");
        lastPlayed.current = portion;
        setHeard(portion);
      },

      onLatency: (value) => {
        if (current()) setLatency(value);
      },
      onFrame: (type, detail) => {
        if (current())
          setEvents((items) => [...items.slice(-11), `${type}: ${detail}`]);
      },
      onPlaybackComplete: () => {
        if (!current()) return;
        setHeard(approved);
        lastPlayed.current = approved;
        setHistory((items) => [
          ...items.slice(-19),
          {
            id: ++entryId.current,
            text: approved,
            played: approved,
            kind: "complete",
          },
        ]);
        setStatus("complete");

        setNotice(c.studio.noticeFinished);
        dispose();
      },
      onError: (message) => {
        if (current()) {
          setStatus("error");

          setNotice(message);
          dispose();
        }
      },
    });
    session.current = next;
    try {
      await next.connect(voice, language);
      if (current()) await next.speakStreamed(approved);
    } catch (error) {
      if (current()) {
        setStatus("error");

        setNotice(
          error instanceof Error
            ? error.message
            : c.studio.noticeStartFail,
        );
        dispose();
      }
    }
  }, [dispose, language, text, voice, stopPreview]);

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        stop();
        return;
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key === "Enter" &&
        !listener.current?.open
      ) {
        event.preventDefault();
        void speak();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [speak, stop]);
  useEffect(() => {
    const leaving = () => stop();
    window.addEventListener("pagehide", leaving);
    return () => window.removeEventListener("pagehide", leaving);
  }, [stop]);

  function selectPhrase(phrase: string, revising = false) {
    revisionBase.current = revising ? phrase : "";
    setText(phrase);
    setClearedDraft(null);
    if (!active) {
      setStatus("ready");
      setNotice(c.studio.noticeEditMode);
    }
    editor.current?.focus();
  }
  function persistPhrases(phrases: string[], message: string) {
    try {
      if (phrases.length)
        localStorage.setItem(PHRASES_KEY, JSON.stringify(phrases));
      else localStorage.removeItem(PHRASES_KEY);
      window.dispatchEvent(new Event("secondvoice:phrases"));
      setPhraseNotice(message);
    } catch {
      setPhraseNotice(
        c.studio.noticePhraseSavedFail,
      );
    }
  }
  function savePhrase() {
    const result = addPhrase(saved, text);
    if (result.phrases === saved) {
      setPhraseNotice(result.message);
      return;
    }
    persistPhrases(result.phrases, result.message);
  }
  function showMessage() {
    if (!hasText) return;
    stop();
    setDisplayText(text.trim());
    listener.current?.showModal();
  }
  const progressWords = heard.trim() ? segmentText(heard).length : 0;

  return (
    <main
      className={`studio-shell ${contrast ? "high-contrast" : ""} ${largeType ? "large-type" : ""}`}
    >
      <PageTitle zh="你的话 — 续语传心" en="Your words — SecondVoice" />
      <audio ref={previewAudio} preload="none" />
      <a href="#message" className="skip-link">
        {c.nav.skipToMessage}
      </a>
      <header className="studio-nav">
        <Brand />
        <span className="workspace-label">{c.studio.workspaceLabel}</span>
        <div className="studio-preferences">
          <button
            className="icon-button"
            aria-label={c.studio.largerText}
            aria-pressed={largeType}
            onClick={() => setLargeType(!largeType)}
          >
            <Type size={19} />
            <span>{c.studio.textSize}</span>
          </button>
          <button
            className="icon-button"
            aria-label={c.studio.highContrast}
            aria-pressed={contrast}
            onClick={() => setContrast(!contrast)}
          >
            <Contrast size={19} />
            <span>{c.studio.contrast}</span>
          </button>
          <LangToggle className="icon-button lang-button" />
          <Link href="/" className="quiet-link back-link">
            <ArrowLeft size={15} /> {c.nav.about}
          </Link>
        </div>
      </header>
      <div className="studio-content">
        <div className="workspace-intro">
          <div>
            <span className="eyebrow">{c.studio.workspaceLabel}</span>
            <h1>{c.studio.h1}</h1>
          </div>
          <p>
            {c.studio.introP1}
            <br />
            {c.studio.introP2}
          </p>
        </div>
        {!online && (
          <div className="offline-note" role="status">
            {c.studio.offline}
          </div>
        )}
        <ConversationAssist
          key={language}
          ref={conversation}
          language={language}
          disabled={active}
          speakingText={utterance}
          onStart={stop}
          onStop={stop}
          onSpeak={(reply) => void speak(reply)}
          onEdit={(reply) => selectPhrase(reply)}
        />
        <div className="workspace-grid">
          <section className="compose-panel" aria-labelledby="compose-title">
            <div className="panel-heading">
              <span className="panel-index">01</span>
              <h2 id="compose-title">{c.studio.composeTitle}</h2>
              <span>{active ? c.studio.nextDraft : c.studio.placeToBegin}</span>
            </div>
            <div className="editor-card">
              <div className="editor-top">
                <span>
                  <i className="status-dot" />{" "}
                  {active ? c.studio.nextTag : c.studio.draftTag}
                </span>
                <span>{c.studio.onlyWhenChosen}</span>
              </div>
              <label className="sr-only" htmlFor="message">
                {c.studio.messageLabel}
              </label>
              <textarea
                ref={editor}
                id="message"
                placeholder={c.studio.placeholder}
                value={text}
                maxLength={MAX_MESSAGE}
                aria-describedby="draft-help"
                onChange={(event) => {
                  setText(event.target.value);
                  setClearedDraft(null);
                }}
              />
              <div className="editor-meta">
                <span id="draft-help">
                  {c.studio.words(wordCount)}
                  <span className="char-count">
                    {" "}
                    · {text.length.toLocaleString()} / 1,800
                  </span>
                </span>
                <div>
                  <button
                    className="text-button"
                    onClick={savePhrase}
                    disabled={!hasText || isSaved}
                  >
                    {isSaved ? <Check size={14} /> : <Bookmark size={14} />}
                    {isSaved ? c.studio.saved : c.studio.savePhrase}
                  </button>
                  <button
                    className="text-button"
                    disabled={!text}
                    onClick={() => {
                      setClearedDraft(text);
                      setText("");
                      editor.current?.focus();
                    }}
                  >
                    {c.studio.clear}
                  </button>
                </div>
              </div>
            </div>
            {clearedDraft !== null && (
              <div className="undo-note">
                {c.studio.draftCleared}
                <button
                  className="text-button"
                  onClick={() => {
                    setText(clearedDraft);
                    setClearedDraft(null);
                    editor.current?.focus();
                  }}
                >
                  <RotateCcw size={13} />
                  {c.studio.undo}
                </button>
              </div>
            )}
            <div className="voice-settings">
              <label>
                {c.studio.voice}
                <select
                  value={voice}
                  disabled={active}
                  onChange={(event) => {
                    stopPreview();
                    setVoice(event.target.value);
                  }}
                >
                  {voices.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {c.studio.language}
                <select
                  value={language}
                  disabled={active}
                  onChange={(event) => {
                    stopPreview();
                    const selected = event.target.value as SupportedLanguage;
                    setLanguage(selected);
                    setVoice(firstVoiceId(selected));
                  }}
                >
                  <option value="chinese">{language === "english" ? "Chinese" : "中文"}</option>
                  <option value="english">English</option>
                </select>
              </label>
              <span>
                {c.studio.languageNoteA}
                <br />
                {c.studio.languageNoteB}
              </span>
            </div>
            <div className="voice-audition">
              <div>
                <strong>{selectedVoice.description}</strong>
                <p role="status">{previewError || c.studio.sampleNote}</p>
              </div>
              <button
                className="button"
                disabled={active}
                aria-pressed={previewing}
                onClick={() => void previewVoice()}
              >
                {previewing ? <Square size={14} fill="currentColor" /> : <Volume2 size={16} />}
                {previewing ? c.studio.stopPreview : c.studio.previewVoice}
              </button>
            </div>
            <div className="action-bar">
              <button
                className="button primary speak-button"
                disabled={active || !hasText || !online}
                onClick={() => void speak()}
              >
                <Volume2 size={19} />
                {status === "error" ? c.studio.tryAgain : c.studio.speakMessage}
                <kbd>⌘ / Ctrl ↵</kbd>
              </button>
              <button
                className="button stop-button"
                disabled={!active}
                onClick={stop}
              >
                <Square size={14} fill="currentColor" />
                {c.studio.stop}<kbd>esc</kbd>
              </button>
              <button
                className="button show-button"
                disabled={!hasText}
                onClick={showMessage}
              >
                <Eye size={18} />
                <span>{c.studio.showMessage}</span>
              </button>
            </div>
            <p className="data-note">
              {c.studio.dataNote}
            </p>
            <div className="phrase-section">
              <div className="phrase-heading">
                <h3>{c.studio.phrasesTitle}</h3>
                <span>{c.studio.phrasesHint}</span>
              </div>
              <div className="starter-grid">
                {STARTERS.map((phrase) => (
                  <button key={phrase} onClick={() => selectPhrase(phrase)}>
                    {phrase}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </div>
            <div className="phrase-section saved-section">
              <div className="phrase-heading">
                <h3>
                  <Bookmark size={15} />
                  {c.studio.myPhrases}{" "}<span className="count-badge">{saved.length}</span>
                </h3>
                <span>{c.studio.savedOnlyHere}</span>
              </div>
              {saved.length ? (
                <ul className="saved-phrases">
                  {saved.map((phrase, index) => (
                    <li key={phrase}>
                      <button
                        className="saved-phrase"
                        onClick={() => selectPhrase(phrase)}
                      >
                        {phrase}
                        <CornerDownLeft size={15} />
                      </button>
                      <button
                        className="icon-button"
                        aria-label={c.studio.removePhrase(index + 1, phrase)}
                        onClick={() =>
                          persistPhrases(
                            saved.filter((item) => item !== phrase),
                            c.studio.phraseRemoved,
                          )
                        }
                      >
                        <X size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="saved-empty">
                  <Plus size={17} />
                  <p>
                    {c.studio.phrasesEmptyA}
                    <br />
                    <span>{c.studio.phrasesEmptyB}</span>
                  </p>
                </div>
              )}
              <p className="phrase-notice" role="status">
                {phraseNotice}
              </p>
            </div>
          </section>
          <section className="playback-panel" aria-labelledby="playback-title">
            <div className="panel-heading">
              <span className="panel-index coral">02</span>
              <h2 id="playback-title">{c.studio.playbackTitle}</h2>
              <span>{c.studio.atYourPace}</span>
            </div>
            <div className={`output-card is-${status}`}>
              <SpeechScene
                text={utterance}
                previousText={previousMessage}
                heard={progressWords}
                phase={status}
                run={speechRun}
                compact
                sourceElement={text.trim() === utterance ? editor : undefined}
              />
              {status === "stopped" && (
                <button
                  className="text-button revise-button"
                  onClick={() => selectPhrase(utterance, true)}
                >
                  <RotateCcw size={15} />
                  {c.studio.reviseThis}
                </button>
              )}
            </div>
            <p
              className={`session-notice ${status === "error" ? "error" : ""}`}
              role="status"
            >
              {notice}
            </p>
            {status === "error" && (
              <div className="error-actions">
                <button
                  className="text-button"
                  disabled={!hasText}
                  onClick={showMessage}
                >
                  <Eye size={15} />
                  {c.studio.showTextInstead}
                </button>
                <span className="error-hint">{c.assist.tryRecorded}</span>
              </div>
            )}
            <div className="history-section">
              <div className="phrase-heading">
                <h3>
                  {c.studio.historyTitle}{" "}
                  <span className="count-badge">{history.length}</span>
                </h3>
                {history.length > 0 && (
                  <button
                    className="text-button"
                    onClick={() => setHistory([])}
                  >
                    <Trash2 size={13} />
                    {c.studio.clearRecord}
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="history-empty">
                  <MessageSquare size={21} />
                  <p>
                    {c.studio.historyEmptyA}
                    <span>{c.studio.historyEmptyB}</span>
                  </p>
                </div>
              ) : (
                <ol>
                  {[...history].reverse().map((entry) => (
                    <li key={entry.id}>
                      <div>
                        <span className={`history-status ${entry.kind}`}>
                          {entry.kind === "stopped" ? (
                            <Square size={10} />
                          ) : (
                            <Check size={12} />
                          )}
                          {entry.kind === "stopped" ? c.studio.entryStopped : c.studio.entryComplete}
                        </span>
                        <button
                          className="text-button"
                          aria-label={c.studio.useMessage(entry.text)}
                          onClick={() => selectPhrase(entry.text)}
                        >
                          {c.studio.useAgain} <CornerDownLeft size={13} />
                        </button>
                      </div>
                      <p>{entry.text}</p>
                      {entry.kind === "stopped" && (
                        <small>
                          {entry.played
                            ? c.studio.playedBeforeStop(entry.played)
                            : c.studio.stoppedNoTiming}
                        </small>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <details className="session-details">
              <summary>
                {c.studio.details} <ArrowUpRight size={14} />
              </summary>
              <p>
                {c.studio.detailsP1}
              </p>
              <p>
                {c.studio.detailsFirstFrame}{" "}
                {latency === null ? c.studio.detailsNotMeasured : c.studio.detailsMs(latency)}。
              </p>
              <ol>
                {events.map((event, i) => (
                  <li key={i}>{event}</li>
                ))}
              </ol>
            </details>
          </section>
        </div>
      </div>
      {active && (
        <div className="mobile-playback">
          <span>
            <i className="status-dot" />
            {status === "connecting"
              ? c.studio.connectingMobile
              : c.studio.playingMobile}
          </span>
          <button className="button stop-button" onClick={stop}>
            <Square size={14} fill="currentColor" />
            {c.studio.stopPlayback}
          </button>
        </div>
      )}
      <footer className="workspace-footer">
        <span>{c.studio.footer}</span>
        <Link href="/">
          {c.nav.about} <ArrowUpRight size={13} />
        </Link>
      </footer>
      <dialog
        className="listener-dialog"
        ref={listener}
        aria-labelledby="listener-heading"
        onCancel={stop}
      >
        <header>
          <span className="eyebrow" id="listener-heading">
            {c.studio.dialogEyebrow}
          </span>
          <button
            className="button"
            autoFocus
            onClick={() => listener.current?.close()}
          >
            <X size={18} />
            {c.studio.backToWriting}
          </button>
        </header>
        <div className="listener-message">{displayText}</div>
        <footer>
          <span>{c.studio.dialogFooter}</span>
          <span>{c.studio.textOnly}</span>
        </footer>
      </dialog>
    </main>
  );
}
