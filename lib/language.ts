/** 发声语言：中文为主，保留英文以对齐原版的双语结构。 */
export type SupportedLanguage = "chinese" | "english";

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  chinese: "中文",
  english: "English",
};
