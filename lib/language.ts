/** 发声语言：中文为主，保留英文供双语使用。 */
export type SupportedLanguage = "chinese" | "english";

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  chinese: "中文",
  english: "English",
};
