/**
 * 把破碎、含糊的语音转写补成通顺的句子。
 *
 * 为什么需要：说话不清楚的人（构音障碍、中风后、口齿不清）说出来的音节，
 * 通用语音识别只会给出残缺片段 —— 「我 要 那个 水 不 不 那个 白 的」。
 * 这一层把片段 + 对方的问题交给语言模型，猜出他原本想表达的意思，
 * 给出三条候选，由用户自己挑、自己改、自己确认后才发声。
 *
 * 原则：只补全和顺句，不编造用户没说的意思；所有候选都必须经用户点击才播报。
 */

import { siliconflowKey } from "@/lib/speech/builtin-key";

const ENDPOINT = "https://api.siliconflow.cn/v1/chat/completions";
/** 小模型就够：补句不需要大模型，快比强重要 */
const MODEL = "Qwen/Qwen2.5-7B-Instruct";
const TIMEOUT_MS = 8000;

const SYSTEM_ZH = `你在帮助一位说话不清楚的人表达自己。语音识别把他说的音节转成了文字，但往往残缺、重复、有错字。
结合「对方的问题」，判断他最可能想表达什么，给出 3 个通顺、简短、第一人称的中文句子。

规则：
1. 只做补全和顺句，不要编造他没表达的新意思。
2. 用第一人称（「我」），口语，像正常人说话，语序自然。
3. 每句不超过 25 个字，必须带正常标点（逗号、句号）。
4. 三句要有差别（详略或语气），让他有得选。
5. 只输出 JSON 数组，例如 ["句子一。","句子二。","句子三。"],不要解释、不要代码块。`;

const SYSTEM_EN = `You help someone with unclear speech express themselves. Speech recognition turned their syllables into text, but it is often broken, repeated or misspelled.
Using "the question they are answering", infer what they most likely mean, and give 3 fluent, short, first-person English sentences.

Rules:
1. Only complete and smooth the sentence — never invent a new meaning.
2. Each sentence under 20 words, spoken register, natural.
3. The three options should differ a little (tone, detail) so there is a real choice.
4. Output ONLY a JSON array, e.g. ["first option","second option","third option"]. No explanation, no code fence.`;

/** 判断一段转写是不是「破碎」到需要模型猜 */
export function looksBroken(text: string): boolean {
  const clean = String(text ?? "").trim();
  if (!clean) return true;
  const chars = [...clean.replace(/\s+/g, "")];
  if (chars.length < 4) return true;
  // 单字之间夹空格（识别把音节拆开了）
  if (/\S\s+\S\s+\S\s+\S/.test(clean) && clean.replace(/\s/g, "").length < 24) return true;
  // 明显重复：「不 不」「那 那」
  if (/(\S)\s*\1{2,}/.test(clean.replace(/\s/g, ""))) return true;
  // 以连接词或量词结尾，句子不完整
  if (/[，,、]$|(的那个|那个|这个|的|和|跟)$/.test(clean)) return true;
  return false;
}

function parseCandidates(raw: string): string[] {
  const text = String(raw ?? "").trim();
  const stripped = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  // 先按 JSON 数组解析
  const tryParse = (input: string): string[] | null => {
    try {
      const data = JSON.parse(input);
      if (Array.isArray(data)) {
        return data.filter((item) => typeof item === "string").map((item) => item.trim());
      }
    } catch {
      /* 继续尝试 */
    }
    return null;
  };
  const direct = tryParse(stripped);
  if (direct) return direct.filter(Boolean).slice(0, 3);
  // 退一步：[] 或 "" 包起来的行
  const bracket = stripped.match(/\[[\s\S]*\]/);
  if (bracket) {
    const fromBracket = tryParse(bracket[0]);
    if (fromBracket) return fromBracket.filter(Boolean).slice(0, 3);
  }
  const quoted = [...stripped.matchAll(/[""]([^""]{2,40})[""]/g)].map((m) => m[1].trim());
  return quoted.filter(Boolean).slice(0, 3);
}

/**
 * 把碎片补成三条候选。
 * 失败（超时、限流、模型抽风）就返回空数组，调用方回落到本地规则。
 */
export async function clarifySpeech(
  fragment: string,
  question: string,
  lang: "zh" | "en",
  signal?: AbortSignal,
): Promise<{ candidates: string[]; ms: number }> {
  const key = siliconflowKey();
  const started = Date.now();
  if (!key) return { candidates: [], ms: 0 };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: lang === "en" ? SYSTEM_EN : SYSTEM_ZH },
          {
            role: "user",
            content:
              lang === "en"
                ? `The question they are answering: ${question || "(unclear)"}\nRecognised fragment: ${fragment}`
                : `对方的问题：${question || "（不明确）"}\n识别到的片段：${fragment}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
        stream: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) return { candidates: [], ms: Date.now() - started };
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const candidates = parseCandidates(content)
      .filter((item) => item.length >= 2 && item.length <= 60)
      .slice(0, 3);
    return { candidates, ms: Date.now() - started };
  } catch {
    return { candidates: [], ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}
