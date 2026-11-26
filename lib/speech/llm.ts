/**
 * 语言模型的两个用途，职责分开：
 *
 *  1) clarifySpeech —— 「我自己说」入口专用
 *     使用者说话不清楚，语音识别得到的是残片。结合对方刚问的问题和想表达的意思，
 *     补成若干条通顺的第一人称句子。
 *
 *  2) generateReplies —— 「给我几个说法」专用
 *     输入是对方的问题（可带使用者补充的意思），生成若干条可以直接说出口的回答。
 *
 * 两者都只产出候选，绝不自动播报；用户选中并确认后才会发声。
 */

import { siliconflowKey } from "@/lib/speech/builtin-key";

const ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions";
const MODEL = "Qwen/Qwen2.5-7B-Instruct";
const TIMEOUT_MS = 18_000;
/** 两种模式都给 10 条，让真正想说的那条更容易被选中 */
export const REPLY_COUNT = 10;

function cleanupItem(text: string): string {
  return text
    .replace(/^[\s"'「『]+/, "")
    .replace(/[\s"'」』]+$/, "")
    .replace(/^\s*(?:\d+[.、)]|[-*•])\s*/, "")
    .trim();
}

/**
 * 从模型输出里取候选。
 * 模型很随意：可能给一个数组、每行一个数组、十个数组挤在同一行、
 * 带编号的列表、或代码块。这里不依赖换行，直接全局扫出所有引号单元。
 */
function parseCandidates(raw: string, limit = 3): string[] {
  const stripped = String(raw ?? "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  if (!stripped) return [];

  const collect = (items: string[]): string[] | null => {
    const cleaned = items.map(cleanupItem).filter((item) => item.length >= 2 && item.length <= 80);
    const unique = [...new Set(cleaned)];
    return unique.length ? unique.slice(0, limit) : null;
  };

  // ① 整体就是一个数组
  try {
    const whole = JSON.parse(stripped);
    if (Array.isArray(whole)) {
      const hit = collect(whole.filter((item) => typeof item === "string") as string[]);
      if (hit) return hit;
    }
  } catch {
    /* 交给下面的扫描 */
  }

  // ② 全局扫 ["…"] 单元 —— 不依赖换行，一行多个也能一次抓全
  const units = [...stripped.matchAll(/\[\s*"((?:[^"\\]|\\.)*)"\s*\]/g)].map((m) => {
    try {
      return JSON.parse(`"${m[1]}"`) as string;
    } catch {
      return m[1];
    }
  });
  const fromUnits = collect(units);
  if (fromUnits) return fromUnits;

  // ③ 退一步：所有双引号里的内容（半角 + 全角都试，模型常混用）
  const quoted = [
    ...[...stripped.matchAll(/"((?:[^"\\]|\\.){2,80})"/g)].map((m) => m[1]),
    ...[...stripped.matchAll(/[\u201c\u201d]([^\u201c\u201d]{2,80})[\u201c\u201d]/g)].map((m) => m[1]),
  ];
  const fromQuoted = collect(quoted);
  if (fromQuoted) return fromQuoted;

  // ④ 再退：按行去编号和引号（模型给了纯列表的情况）
  const perLine = stripped
    .split(/\r?\n/)
    .map((line) => cleanupItem(line.replace(/^[\[,]|[\]],?$/g, "")))
    .filter(Boolean);
  return collect(perLine) ?? [];
}

async function ask(
  system: string,
  user: string,
  signal?: AbortSignal,
  limit = REPLY_COUNT,
): Promise<{ items: string[]; ms: number }> {
  const key = siliconflowKey();
  const started = Date.now();
  if (!key) return { items: [], ms: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 900,
        temperature: 0.6,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { items: [], ms: Date.now() - started };
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content ?? "";
    return { items: parseCandidates(content, limit), ms: Date.now() - started };
  } catch {
    return { items: [], ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/* ── ① 把破碎语音补成通顺的话 ───────────────────────── */

const CLARIFY_ZH = `你在帮助一位说话不清楚的人表达自己。他说的音节被语音识别成了文字，往往残缺、重复、有错字。
结合「对方刚问的问题」和「他想表达的意思」，判断他最可能想说什么，给出 10 个通顺、简短、第一人称的中文句子。

规则：
1. 只补全和顺句，不编造他没表达的新意思。
2. 用第一人称（「我」），口语，语序自然，带正常标点。
3. 每句不超过 25 个字；10 句要覆盖不同的语气和详细程度（直接、客气、犹豫、补充原因、反问确认等）。
4. 如果给了「他想表达的意思」，所有句子都必须贴合它，只在措辞与语气上分开。
5. 输出格式：一个 JSON 数组，恰好 10 个字符串，例如 ["第一句。","第二句。"] 。
   不要换行分隔、不要编号、不要解释、不要代码块。`;

const CLARIFY_EN = `You help someone with unclear speech. Their syllables were transcribed into broken, repeated or misspelled text.
Using "the question they are answering" and "what they mean", infer what they most likely mean and give 10 fluent, short, first-person sentences.

Rules:
1. Only complete and smooth — never invent a new meaning.
2. First person, spoken register, natural order, normal punctuation.
3. Under 20 words each; the 10 must span different tones and levels of detail.
4. If "what they mean" is given, every sentence must follow it.
5. Output: ONE JSON array of exactly 10 strings. No line breaks between items, no numbering, no code fence.`;

export async function clarifySpeech(
  fragment: string,
  question: string,
  intent: string,
  lang: "zh" | "en",
  signal?: AbortSignal,
): Promise<{ candidates: string[]; ms: number }> {
  const cleanIntent = String(intent ?? "").trim();
  const result = await ask(
    lang === "en" ? CLARIFY_EN : CLARIFY_ZH,
    lang === "en"
      ? `The question they are answering: ${question || "(unknown)"}\nWhat they mean: ${cleanIntent || "(not specified — cover ten different tones)"}\nRecognised fragment: ${fragment}`
      : `对方刚问的问题：${question || "（不明确）"}\n他想表达的意思：${cleanIntent || "（没有特别说明，请覆盖十种不同语气）"}\n他说的片段：${fragment}`,
    signal,
  );
  return { candidates: result.items, ms: result.ms };
}

/* ── ② 针对对方的问题生成回答 ───────────────────────── */

const REPLY_ZH = `你在帮一位沟通有困难的人准备回话。对方问了一个问题，他要给出回答。

给 10 条，覆盖不同方向，方便他一眼看中自己想说的那个：
- 爽快答应
- 委婉拒绝
- 直接拒绝
- 需要时间 / 犹豫
- 反问或要求澄清
- 提条件 / 部分同意
- 改约时间 / 推迟
- 补充一个理由
- 表达感受（不舒服、为难、感谢）
- 请对方再说一遍或问细节

规则：
1. 每条都是「他可以直接说出口」的第一人称中文回答，口语，像正常人说话。
2. 每句不超过 25 个字，带正常标点。
3. 十条方向必须真的不同，不要同一个意思换十种说法。
4. 如果给了「他想表达的意思」，全部倾向那个意思，但仍给出语气/措辞上的差别。
5. 不要复述对方的问题，不要写旁白，不要加引号或编号。
6. 「他想表达的意思」只是给你的约束，不要把它原样当成一条回答输出。
7. 输出格式：一个 JSON 数组，恰好 10 个字符串，例如 ["第一句。","第二句。"] 。
   不要换行分隔、不要编号、不要解释、不要代码块。`;

const REPLY_EN = `You help someone with communication difficulty prepare a reply. The other person asked a question; they need to answer it.

Give 10 replies covering different directions:
agree readily / decline politely / decline directly / need time / ask back /
set a condition / reschedule / add a reason / express feeling / ask for detail.

Rules:
1. Each is a first-person English reply they could say out loud, spoken register.
2. Under 20 words each, normal punctuation.
3. The ten must genuinely differ in substance.
4. If "what they mean" is given, lean all ten that way but vary tone and phrasing.
5. Do not restate the question, no narration, no quotation marks or numbering.
6. "What they mean" is a constraint — never output it verbatim as one of the replies.
7. Output: ONE JSON array of exactly 10 strings. No line breaks between items, no numbering, no code fence.`;

export async function generateReplies(
  question: string,
  intent: string,
  lang: "zh" | "en",
  signal?: AbortSignal,
): Promise<{ candidates: string[]; ms: number }> {
  const cleanIntent = String(intent ?? "").trim();
  const result = await ask(
    lang === "en" ? REPLY_EN : REPLY_ZH,
    lang === "en"
      ? `Their question: ${question}\nWhat they mean: ${cleanIntent || "(not specified — give ten genuinely different directions)"}`
      : `对方的问题：${question}\n他想表达的意思：${cleanIntent || "（没有特别说明，请给出方向明显不同的十种）"}`,
    signal,
  );
  return { candidates: result.items, ms: result.ms };
}
