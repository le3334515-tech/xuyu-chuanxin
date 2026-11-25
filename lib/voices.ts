import type { SupportedLanguage } from "./language.ts";
import { zhVoices } from "./speech/zh-tts.ts";

export type VoiceOption = {
  id: string;
  name: string;
  description: string;
  preview: string;
};

/**
 * 音色表：原版是 AssemblyAI 的固定人声（Peter / Carrie …），
 * 中文版改为读取设备的系统音色，结构（id / 名称 / 描述 / 试听）保持一致。
 */
export const VOICES: Record<SupportedLanguage, VoiceOption[]> = {
  chinese: [],
  english: [],
};

export const DEFAULT_ENGLISH_VOICE = "";

const FALLBACK: Record<SupportedLanguage, VoiceOption> = {
  chinese: { id: "", name: "系统默认", description: "普通话 · 设备内置音色", preview: "" },
  english: { id: "", name: "System default", description: "English · device voice", preview: "" },
};

function describe(voice: SpeechSynthesisVoice, language: SupportedLanguage): string {
  const name = voice.name.replace(/\s*\(.*?\)\s*/g, "").trim();
  const gender = /xiaoxiao|xiaoyi|huihui|yaoyao|tingting|female/i.test(name) ? "女声" : "音色";
  const region = /zh-cn|cmn-hans/i.test(voice.lang || "") ? "普通话" : voice.lang || "";
  return language === "english" ? `${name} · ${voice.lang}` : `${region}${gender} · ${name}`;
}

export function refreshVoices(): void {
  const chinese = zhVoices("chinese").map<VoiceOption>((voice) => ({
    id: voice.voiceURI,
    name: voice.name.replace(/\s*\(.*?\)\s*/g, "").trim() || voice.lang,
    description: describe(voice, "chinese"),
    preview: "",
  }));
  const english = zhVoices("english").map<VoiceOption>((voice) => ({
    id: voice.voiceURI,
    name: voice.name.replace(/\s*\(.*?\)\s*/g, "").trim() || voice.lang,
    description: describe(voice, "english"),
    preview: "",
  }));
  VOICES.chinese = chinese.length ? chinese : [FALLBACK.chinese];
  VOICES.english = english.length ? english : [FALLBACK.english];
}

export function voiceOptions(language: SupportedLanguage): VoiceOption[] {
  if (!VOICES.chinese.length && !VOICES.english.length) refreshVoices();
  return VOICES[language]?.length ? VOICES[language] : [FALLBACK[language]];
}

export function firstVoiceId(language: SupportedLanguage): string {
  return voiceOptions(language)[0]?.id ?? "";
}
