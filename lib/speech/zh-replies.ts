/**
 * 回复建议：原版把问题发给 AI 网关拿三条建议；这里在本地生成三条候选，
 * 交互完全一致（Speak / Edit），并按当前界面语言给出对应说法。
 */

import type { Lang } from "@/lib/i18n";

type Rule = {
  test: RegExp;
  zh: () => string[];
  en: () => string[];
};

const RULES: Rule[] = [
  {
    test: /(要|来点|加|再来|份|点单|喝|吃|order|another|more|menu)/i,
    zh: () => ["好，谢谢，就这个。", "不用了，谢谢，我够了。", "先来一份，剩下的等下再说。"],
    en: () => [
      "Yes, thank you — that works.",
      "No thank you, I'm all set.",
      "I'll take one for now and decide about the rest later.",
    ],
  },
  {
    test: /(时间|等|忙|多久|什么时候|稍|分钟|minute|moment|wait|time)/i,
    zh: () => ["可以给我几分钟吗？", "我马上就好，再等我一下。", "我们十分钟后再聊，可以吗？"],
    en: () => [
      "Could you give me a few minutes?",
      "I'll be ready in a moment — please wait for me.",
      "Can we talk again in ten minutes?",
    ],
  },
  {
    test: /(怎么样|觉得|好不好|行不行|可以吗|意见|think|opinion|sound|okay|good)/i,
    zh: () => ["我觉得可以。", "我还需要再想想。", "换个方式可能更好。"],
    en: () => ["I think that works.", "I need a bit more time to think.", "A different approach might be better."],
  },
  {
    test: /(帮我|请|麻烦|能否|帮忙|help|could you|can you|would you)/i,
    zh: () => ["好的，我来处理。", "这件事我暂时做不到，换个人可以吗？", "我先确认一下，再答复你。"],
    en: () => [
      "Yes, I can do that.",
      "I can't do that right now — could someone else help?",
      "Let me check first, then I'll get back to you.",
    ],
  },
  {
    test: /(抱歉|对不起|不好意思|sorry|apolog)/i,
    zh: () => ["没关系，我理解。", "不用道歉，我们继续。", "我听到了，谢谢你说。"],
    en: () => ["That's alright, I understand.", "No need to apologise — let's keep going.", "I heard you. Thank you for saying it."],
  },
];

const GENERIC: Record<Lang, string[]> = {
  zh: ["我听清了，让我想一下。", "可以，就这么定。", "抱歉，这次不行。"],
  en: ["I heard you — let me think for a moment.", "Yes, let's do that.", "I'm sorry, I can't do that this time."],
};

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.codePointAt(0)!) % 100000;
  return value;
}

function rotate(list: string[], by: number): string[] {
  const offset = by % list.length;
  return [...list.slice(offset), ...list.slice(0, offset)];
}

export function suggestReplies(
  question: string,
  intent?: string,
  lang: Lang = "zh",
): string[] {
  const q = String(question ?? "").trim();
  const seed = hash(q);

  if (intent && intent.trim()) {
    const core = intent.trim().replace(/[。.!！]+$/, "");
    return lang === "en"
      ? [`${core}.`, `I understand. ${core}.`, `${core} — is that alright?`]
      : [`${core}。`, `我理解。不过${core}。`, `${core}，可以吗？`];
  }

  for (const rule of RULES) {
    if (rule.test.test(q)) {
      return rotate(rule[lang](), seed).slice(0, 3);
    }
  }
  return rotate(GENERIC[lang], seed).slice(0, 3);
}
