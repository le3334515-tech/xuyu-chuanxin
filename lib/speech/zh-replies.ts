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
    zh: () => [
      "好，谢谢，就这个。",
      "不用了，谢谢，我够了。",
      "先来一份，剩下的等下再说。",
      "等一下，我想看看还有什么。",
      "两份可以吗？",
      "这个辣不辣？先问一下。",
    ],
    en: () => [
      "Yes, thank you — that works.",
      "No thank you, I'm all set.",
      "One for now, I'll decide about the rest later.",
      "Hold on, I'd like to see the other options.",
      "Could I have two, please?",
      "Is it spicy? Let me check first.",
    ],
  },
  {
    test: /(时间|等|忙|多久|什么时候|稍|分钟|minute|moment|wait|time)/i,
    zh: () => [
      "可以给我几分钟吗？",
      "我马上就好，再等我一下。",
      "我们十分钟后再聊，可以吗？",
      "我还没准备好，能再给点时间吗？",
      "这件事我需要想清楚再回答。",
      "现在不太方便，晚点我找你。",
    ],
    en: () => [
      "Could you give me a few minutes?",
      "I'll be ready in a moment — please wait.",
      "Can we talk again in ten minutes?",
      "I'm not ready yet — a bit more time please.",
      "I need to think this through before answering.",
      "Now isn't good — I'll find you later.",
    ],
  },
  {
    test: /(怎么样|觉得|好不好|行不行|可以吗|意见|think|opinion|sound|okay|good)/i,
    zh: () => [
      "我觉得可以。",
      "我还需要再想想。",
      "换个方式可能更好。",
      "我不同意，原因我说一下。",
      "大方向可以，细节再商量。",
      "我拿不准，想听听别人怎么说。",
    ],
    en: () => [
      "I think that works.",
      "I need more time to think.",
      "A different approach might be better.",
      "I disagree — let me explain why.",
      "The direction is fine, details need work.",
      "I'm not sure; I'd like another opinion.",
    ],
  },
  {
    test: /(帮我|请|麻烦|能否|帮忙|help|could you|can you|would you)/i,
    zh: () => [
      "好的，我来处理。",
      "这件事我暂时做不到，换个人可以吗？",
      "我先确认一下，再答复你。",
      "可以，但要等我手上这件忙完。",
      "具体要我做什么，能说清楚点吗？",
      "这次帮不上，抱歉。",
    ],
    en: () => [
      "Yes, I can do that.",
      "I can't right now — could someone else help?",
      "Let me check first, then I'll get back to you.",
      "Yes, once I finish what I'm on.",
      "Could you spell out exactly what you need?",
      "I can't help this time, sorry.",
    ],
  },
  {
    test: /(抱歉|对不起|不好意思|sorry|apolog)/i,
    zh: () => [
      "没关系，我理解。",
      "不用道歉，我们继续。",
      "我听到了，谢谢你说。",
      "下次注意就好。",
      "其实我也有做得不好的地方。",
      "这事儿过去了，别提了。",
    ],
    en: () => [
      "That's alright, I understand.",
      "No need to apologise — let's keep going.",
      "I heard you. Thank you for saying it.",
      "Just be careful next time.",
      "I could have handled it better too.",
      "It's behind us — let's move on.",
    ],
  },
];

const GENERIC: Record<Lang, string[]> = {
  zh: [
    "我听清了，让我想一下。",
    "可以，就这么定。",
    "抱歉，这次不行。",
    "能再说一遍吗？我没听清。",
    "这个问题我想先确认一下。",
    "我换个说法：我暂时做不到。",
  ],
  en: [
    "I heard you — let me think for a moment.",
    "Yes, let's do that.",
    "I'm sorry, I can't this time.",
    "Could you say that again? I missed it.",
    "I'd like to check something first.",
    "Let me put it another way: I can't right now.",
  ],
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
      ? [
          `${core}.`,
          `I understand. ${core}.`,
          `${core} — is that alright?`,
          `Sorry, but ${core}.`,
          `Let me be clear: ${core}.`,
          `Can I say it plainly? ${core}.`,
        ]
      : [
          `${core}。`,
          `我理解。不过${core}。`,
          `${core}，可以吗？`,
          `不好意思，${core}。`,
          `我把话说清楚：${core}。`,
          `要不这样，${core}。`,
        ];
  }

  for (const rule of RULES) {
    if (rule.test.test(q)) {
      return rotate(rule[lang](), seed).slice(0, 6);
    }
  }
  return rotate(GENERIC[lang], seed).slice(0, 6);
}
