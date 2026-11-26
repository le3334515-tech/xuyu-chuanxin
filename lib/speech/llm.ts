/**
 * 语言模型的两个用途，职责分开：
 *
 *  1) clarifySpeech —— 「我说」入口专用
 *     使用者说话不清楚，语音识别得到的是残片。结合对方刚问的问题，
 *     猜出他原本想表达的意思，补成三条通顺的第一人称句子。
 *
 *  2) generateReplies —— 「给我几个说法」专用
 *     输入是对方的问题（可能还带使用者补充的意思），
 *     生成三条可以直接说出口的回答。
 *
 * 两者都只产出候选，绝不自动播报；用户选中并确认后才会发声。
 */

import { siliconflowKey } from "@/lib/speech/builtin-key";

const ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions";
const MODEL = "Qwen/Qwen2.5-7B-Instruct";
const TIMEOUT_MS = 12_000;

function parseCandidates(raw: string, limit = 3): string[] {
  const stripped = String(raw ?? "").trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const tryParse = (input: string): string[] | null => {
    try {
      const data = JSON.parse(input);
      if (Array.isArray(data)) {
        return data.filter((item) => typeof item === "string").map((item) => String(item).trim());
      }
    } catch {
      /* 继续尝试 */
    }
    return null;
  };
  const direct = tryParse(stripped);
  if (direct) return direct.filter(Boolean).slice(0, limit);
  const bracket = stripped.match(/\[[\s\S]*\]/);
  if (bracket) {
    const fromBracket = tryParse(bracket[0]);
    if (fromBracket) return fromBracket.filter(Boolean).slice(0, limit);
  }
  const quoted = [...stripped.matchAll(/[""]([^""]{2,40})[""]/g)].map((m) => m[1].trim());
  return quoted.filter(Boolean).slice(0, limit);
}

async function ask(
  system: string,
  user: string,
  signal?: AbortSignal,
  limit = 3,
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
        max_tokens: 520,
        temperature: 0.6,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { items: [], ms: Date.now() - started };
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const items = parseCandidates(content, limit)
      .filter((item) => item.length >= 2 && item.length <= 80)
      .slice(0, limit);
    return { items, ms: Date.now() - started };
  } catch {
    return { items: [], ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/* ── ① 把破碎语音补成通顺的话 ───────────────────────── */

const CLARIFY_ZH = `你在帮助一位说话不清楚的人表达自己。他说的音节被语音识别成了文字，往往残缺、重复、有错字。
结合「对方刚问的问题」，判断他最可能想说什么，给出 3 个通顺、简短、第一人称的中文句子。

规则：
1. 只补全和顺句，不编造他没表达的新意思。
2. 用第一人称（「我」），口语，语序自然，带正常标点。
3. 每句不超过 25 个字，三句在详略或语气上有差别。
4. 只输出 JSON 数组，例如 ["句子一。","句子二。","句子三。"]，不要解释、不要代码块。`;

const CLARIFY_EN = `You help someone with unclear speech. Their syllables were transcribed into broken, repeated or misspelled text.
Using "the question they are answering", infer what they most likely mean and give 3 fluent, short, first-person sentences.

Rules:
1. Only complete and smooth — never invent a new meaning.
2. First person, spoken register, natural order, normal punctuation.
3. Under 20 words each, three options that differ slightly.
4. Output ONLY a JSON array. No explanation, no code fence.`;

export async function clarifySpeech(
  fragment: string,
  question: string,
  lang: "zh" | "en",
  signal?: AbortSignal,
): Promise<{ candidates: string[]; ms: number }> {
  const result = await ask(
    lang === "en" ? CLARIFY_EN : CLARIFY_ZH,
    lang === "en"
      ? `The question they are answering: ${question || "(unknown)"}\nRecognised fragment: ${fragment}`
      : `对方刚问的问题：${question || "（不明确）"}\n他说的片段：${fragment}`,
    signal,
  );
  return { candidates: result.items, ms: result.ms };
}

/* ── ② 针对对方的问题生成回答 ───────────────────────── */

const REPLY_ZH = `你在帮一位沟通有困难的人准备回话。对方问了一个问题，他要给出回答。

给 6 条，覆盖不同方向，方便他一眼看中自己想说的那个：
- 爽快答应
- 委婉拒绝
- 需要时间 / 犹豫
- 反问或要求澄清
- 提条件 / 部分同意
- 转移话题或改约时间

规则：
1. 每条都是「他可以直接说出口」的第一人称中文回答，口语，像正常人说话。
2. 每句不超过 25 个字，带正常标点。
3. 六条方向必须真的不同，不要同一个意思换六种说法。
4. 如果给了「他想表达的意思」，全部倾向那个意思，但仍给出语气/措辞上的差别。
5. 不要复述对方的问题，不要写旁白，不要加引号或编号。
6. 只输出 JSON 数组，恰好 6 个字符串，例如 ["回答一。","回答二。","回答三。","回答四。","回答五。","回答六。"]。不要解释、不要代码块。`;

const REPLY_EN = `You help someone with communication difficulty prepare a reply. The other person asked a question; they need to answer it.

Give 6 replies covering different directions so they can spot the one they mean:
- agree readily
- decline politely
- need time / hesitate
- ask back or clarify
- set a condition / partly agree
- defer or reschedule

Rules:
1. Each is a first-person English reply they could say out loud, spoken register.
2. Under 20 words each, normal punctuation.
3. The six must genuinely differ in substance — not six wordings of one idea.
4. If "what they mean" is given, lean all six that way but vary tone and phrasing.
5. Do not restate the question, no narration, no quotation marks or numbering.
6. Output ONLY a JSON array of exactly 6 strings. No explanation, no fence.`;

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
      ? `Their question: ${question}\nWhat they mean: ${cleanIntent || "(not specified — give six genuinely different directions)"}`
      : `对方的问题：${question}\n他想表达的意思：${cleanIntent || "（没有特别说明，请给出方向明显不同的六种）"}`,
    signal,
    6,
  );
  return { candidates: result.items, ms: result.ms };
}
