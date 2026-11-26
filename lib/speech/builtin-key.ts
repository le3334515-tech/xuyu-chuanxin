/**
 * 内置语音识别凭据。
 *
 * 事实：纯静态站点的任何代码都是公开的，写进前端的凭据谁都能拿到。
 * 所以这里做两件事：
 *  1) 不明文存放（分段 + base64），提高随手抓取的门槛；
 *  2) 在 cloud-transcribe.ts 里限制录音时长、抑制空录音、缓存重复结果，
 *     把被滥用的代价压到最低。
 * 要真正保密，只能放到服务端代签 —— 那需要一台服务器。
 */

const PARTS = ["ZjEwNGUz", "N2JlNTll", "NDA5YTlh", "ZGQ1MjUy", "MDQxMDQy", "ZTA="];

/** 拼回凭据；只在运行时用，不参与日志或界面展示。 */
export function builtinKey(): string {
  if (typeof atob !== "function") return "";
  try {
    return PARTS.map((part) => atob(part)).join("");
  } catch {
    return "";
  }
}

/** 内置默认服务商：AssemblyAI 非流式转写，实测中文可出汉字。 */
export const BUILTIN_PROVIDER = "assemblyai" as const;
