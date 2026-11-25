"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import type { SculptureStyle } from "@/components/voice-sculpture";
import { SpeechScene } from "@/components/speech-scene";
import { useCopy, useLang } from "@/components/lang-provider";
import { PRIMARY_SENTENCE, REVISED_SENTENCE } from "@/lib/demo";
import original from "@/public/demo/original.json";
import revised from "@/public/demo/revised.json";
import originalEn from "@/public/demo/original-en.json";
import { segmentIndexAt, segmentText } from "@/lib/text-zh";
import { asset } from "@/lib/asset";
import revisedEn from "@/public/demo/revised-en.json";

export function RecordedDemo() {
  const c = useCopy();
  const { lang } = useLang();
  const [step, setStep] = useState(0);
  const [sculpture, setSculpture] = useState<SculptureStyle | "calm">("orbit");
  const [phase, setPhase] = useState<
    "ready" | "connecting" | "speaking" | "stopped" | "complete" | "error"
  >("ready");
  const [run, setRun] = useState(0);
  const active = phase === "connecting" || phase === "speaking";
  const [heard, setHeard] = useState(0);
  const [notice, setNotice] = useState(c.demo.noticeIdle);
  const audio = useRef<HTMLAudioElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const generation = useRef(0);

  const isEn = lang === "en";
  const track = isEn ? (step === 2 ? revisedEn : originalEn) : step === 2 ? revised : original;
  const phrase = isEn
    ? step === 2
      ? revisedEn.text
      : originalEn.text
    : step === 2
      ? REVISED_SENTENCE
      : PRIMARY_SENTENCE;

  useEffect(() => {
    setNotice(c.demo.noticeIdle);
    setPhase("ready");
    setHeard(0);
    setStep(0);
  }, [c.demo.noticeIdle, lang]);

  const cleanup = useCallback(() => {
    generation.current++;
    if (!audio.current) return;
    audio.current.pause();
    audio.current.onended = null;
    audio.current.ontimeupdate = null;
    audio.current.onerror = null;
    audio.current.onplaying = null;
  }, []);

  useEffect(() => {
    const player = audio.current;
    const pause = () => {
      if (!player || player.paused) return;
      cleanup();
      setPhase("stopped");
      setNotice(c.demo.noticePaused);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") pause();
    };
    const visibility = () => {
      if (document.hidden) pause();
    };
    const observer = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) pause();
    });
    if (card.current) observer.observe(card.current);
    window.addEventListener("keydown", key);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      observer.disconnect();
      window.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", visibility);
      cleanup();
    };
  }, [cleanup, c.demo.noticePaused]);

  const play = (next = step) => {
    cleanup();
    const player = audio.current;
    if (!player) return;
    const current = generation.current;
    setStep(next);
    setHeard(0);
    setPhase("connecting");
    setRun((value) => value + 1);
    setNotice(
      next === 1
        ? c.demo.noticeStopChapter
        : next === 2
          ? c.demo.noticeReviseChapter
          : c.demo.noticeSpeak,
    );
    const data = isEn
      ? next === 2
        ? revisedEn
        : originalEn
      : next === 2
        ? revised
        : original;

    const timedWords =
      data.frames.find((frame) => frame.type === "WordBoundaries")?.words ?? [];
    // 录音的词边界（毫秒）→ 屏幕上分词后的索引：两者切分粒度不同，用字符位置换算
    const segments = segmentText(data.text);
    const charOf: number[] = [];
    {
      let cursor = 0;
      for (const item of timedWords) {
        const at = data.text.indexOf(item.word, cursor);
        const pos = at >= 0 ? at : cursor;
        charOf.push(pos);
        cursor = pos + item.word.length;
      }
    }

    player.src = asset(
      isEn
        ? `/demo/${next === 2 ? "revised-en" : "original-en"}.mp3`
        : `/demo/${next === 2 ? "revised" : "original"}.mp3`,
    );
    player.currentTime = 0;

    const sync = () => {
      const now = player.currentTime * 1000;
      let reached = 0;
      for (let i = 0; i < timedWords.length; i += 1) {
        if (timedWords[i].start <= now) reached = i + 1;
        else break;
      }
      if (!reached) {
        setHeard(0);
        return;
      }
      const charIndex = charOf[Math.min(reached, charOf.length) - 1] ?? 0;
      setHeard(segmentIndexAt(segments, charIndex) + 1);
    };

    player.ontimeupdate = () => {
      if (generation.current !== current) return;
      sync();
    };

    player.onplaying = () => {
      if (generation.current !== current) return;
      setPhase("speaking");
    };

    player.onended = () => {
      if (generation.current !== current) return;
      cleanup();
      setHeard(segments.length);
      setPhase("complete");
      setNotice(c.demo.noticeFinished);
    };

    player.onerror = () => {
      if (generation.current !== current) return;
      cleanup();
      setPhase("error");
      setNotice(c.demo.noticeLoadFail);
    };

    void player.play().catch(() => {
      if (generation.current !== current) return;
      cleanup();
      setPhase("error");
      setNotice(c.demo.noticeStartFail);
    });
  };

  const stop = () => {
    if (!active) return;
    cleanup();
    setPhase("stopped");
    setNotice(c.demo.noticeStoppedByYou);
  };

  const chapters = [c.demo.chapterSpeak, c.demo.chapterInterrupt, c.demo.chapterRevise];

  return (
    <div className="demo-card choreography-demo" ref={card}>
      <div className="demo-top">
        <span>
          <Volume2 size={18} /> {c.demo.topLeft}
        </span>
        <span>
          <i className="status-dot" /> {c.demo.topRight}
        </span>
      </div>
      <div className="choreography-toolbar">
        <div>
          <span className="choreography-kicker">{c.demo.eyebrow}</span>
          <h2>{c.demo.titles[step]}</h2>
        </div>
        <div className="chapter-switch" aria-label={c.demo.chaptersLabel}>
          {chapters.map((label, i) => (
            <button
              key={label}
              onClick={() => (i === step && active ? stop() : play(i))}
              aria-pressed={step === i}
            >
              <span>0{i + 1}</span>
              {label}
              <ArrowRight size={15} />
            </button>
          ))}
        </div>
      </div>
      <div className="choreography-stage">
        <SpeechScene
          text={phrase}
          previousText={step === 2 ? (isEn ? originalEn.text : PRIMARY_SENTENCE) : ""}
          heard={heard}
          phase={phase}
          run={run}
          sculpture={sculpture}
        />
      </div>
      <div className="choreography-actions">
        <button
          className="button primary"
          onClick={active ? stop : () => play()}
        >
          {active ? (
            <Square size={16} fill="currentColor" />
          ) : heard ? (
            <RotateCcw size={18} />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
          {active ? c.demo.stop : heard ? c.demo.playAgain : c.demo.play}
        </button>
        <p role="status">{notice}</p>
        <div className="sculpture-picker" role="group" aria-label={c.demo.motionLabel}>
          <span>{c.demo.motion}</span>
          {(
            [
              ["orbit", c.demo.motionOrbit],
              ["ribbon", c.demo.motionRibbon],
              ["bloom", c.demo.motionBloom],
              ["calm", c.demo.motionCalm],
            ] as [SculptureStyle | "calm", string][]
          ).map(([style, label]) => (
            <button
              key={style}
              aria-pressed={sculpture === style}
              onClick={() => setSculpture(style)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <audio ref={audio} preload="none" />
    </div>
  );
}
