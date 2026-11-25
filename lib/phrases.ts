export const STARTER_PHRASES = [
  { id: "more-time", text: "我需要一点时间，让我把话说完。" },
  { id: "ask-me", text: "请直接问我，不用替我回答。" },
  { id: "try-again", text: "这不是我的意思，我重新说一遍。" },
  { id: "continue", text: "我可以继续了，谢谢。" },
];

export const PHRASES_KEY = "xuyu.phrases.v1";
export const MAX_PHRASES = 12;
export const MAX_MESSAGE = 1800;

export function readPhrases(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const result: string[] = [];
    for (const item of parsed) {
      if (typeof item !== "string") continue;
      const phrase = item.trim();
      if (
        !phrase ||
        phrase.length > MAX_MESSAGE ||
        result.some((p) => p.toLowerCase() === phrase.toLowerCase())
      )
        continue;
      result.push(phrase);
      if (result.length === MAX_PHRASES) break;
    }
    return result;
  } catch {
    return [];
  }
}

export function addPhrase(
  phrases: string[],
  text: string,
): { phrases: string[]; message: string } {
  const phrase = text.trim();
  if (!phrase || phrase.length > MAX_MESSAGE)
    return {
      phrases,
      message: "先写一句要存的话（最多 1800 字）。",
    };
  if (phrases.some((p) => p.toLowerCase() === phrase.toLowerCase()))
    return { phrases, message: "这句已经存过了。" };
  if (phrases.length >= MAX_PHRASES)
    return {
      phrases,
      message: "12 个位置满了，先删一条再存。",
    };
  return {
    phrases: [...phrases, phrase],
    message: "已存在这台浏览器里。",
  };
}
