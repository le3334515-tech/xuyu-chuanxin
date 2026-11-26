"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { COPY, LANGS, SPEECH_TAG, type Lang } from "@/lib/i18n";

const STORAGE_KEY = "xuyu.lang";

const TITLES: Record<string, { zh: string; en: string }> = {
  home: { zh: "续语传心 — 为你说不出口的那句话", en: "Xuyu — A voice for what you mean" },
  speak: { zh: "你的话 — 续语传心", en: "Your words — Xuyu" },
};

function pageKey(): keyof typeof TITLES {
  if (typeof location === "undefined") return "home";
  return location.pathname.replace(/\/$/, "").includes("/speak") ? "speak" : "home";
}

type LangContextValue = {
  lang: Lang;
  copy: (typeof COPY)[Lang];
  speechTag: string;
  setLang: (next: Lang) => void;
  toggle: () => void;
  /** 首次挂载前为 false，用于避免给语音引擎传错语言 */
  ready: boolean;
};

const LangContext = createContext<LangContextValue | null>(null);

function detect(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LANGS as string[]).includes(stored)) return stored as Lang;
  } catch {
    /* 隐私模式下读不到，走浏览器语言 */
  }
  if (typeof navigator !== "undefined") {
    const lower = (navigator.language || "").toLowerCase();
    if (lower.startsWith("zh")) return "zh";
    if (lower.startsWith("en")) return "en";
  }
  return "zh";
}

export function LangProvider({
  children,
  initialLang = "zh",
}: {
  children: ReactNode;
  initialLang?: Lang;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = detect();
    setLangState(next);
    setReady(true);
    document.documentElement.lang = SPEECH_TAG[next];
  }, []);

  // 静态导出下 <title> 是构建时固定的：按语言改写，并在 hydration 后补一次
  useEffect(() => {
    const apply = () => {
      const entry = TITLES[pageKey()];
      const wanted = lang === "en" ? entry.en : entry.zh;
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    const raf = requestAnimationFrame(apply);
    const timer = setTimeout(apply, 300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.lang = SPEECH_TAG[next];
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 忽略写入失败 */
    }
  }, []);

  const toggle = useCallback(() => {
    setLangState((current) => {
      const next: Lang = current === "zh" ? "en" : "zh";
      document.documentElement.lang = SPEECH_TAG[next];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* 忽略写入失败 */
      }
      return next;
    });
  }, []);

  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      copy: COPY[lang],
      speechTag: SPEECH_TAG[lang],
      setLang,
      toggle,
      ready,
    }),
    [lang, ready, setLang, toggle],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}

export function useCopy() {
  return useLang().copy;
}

/** 语言切换按钮：落在与其它偏好按钮同一视觉位置 */
export function LangToggle({ className }: { className?: string }) {
  const { lang, toggle, copy } = useLang();
  const label = lang === "zh" ? copy.nav.switchToEn : copy.nav.switchToZh;
  return (
    <button
      type="button"
      className={className ?? "icon-button"}
      onClick={toggle}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true" className="lang-glyph">
        {lang === "zh" ? "EN" : "中"}
      </span>
      <span>{lang === "zh" ? "English" : "中文"}</span>
    </button>
  );
}
