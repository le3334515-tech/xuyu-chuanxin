/**
 * 内置语音识别凭据。
 *
 * 两家都内置，按速度与可用性自动选：
 *  - 硅基流动（国内）：一次请求出结果，实测 0.4~1 秒，作为首选
 *  - AssemblyAI（海外）：跨境 4 次往返约 4~7 秒，作为硅基流动失败/超时时的兜底
 *
 * 事实：纯静态站点的代码是公开的，写进前端的凭据谁都能拿到。
 * 这里不明文存放（分段 + base64），并配合录音时长上限、空录音不上传，
 * 把被滥用的代价压到最低。
 */

const SF_PARTS = [
  "c2sta3N6",
  "bm5kY292",
  "emd5aWZk",
  "YmxmYWdy",
  "c2t1cnF2",
  "c3N2Z3F0",
  "Z2lwY3By",
  "aGNvZWR5",
  "dnVx",
];

const AAI_PARTS = ["ZjEwNGUz", "N2JlNTll", "NDA5YTlh", "ZGQ1MjUy", "MDQxMDQy", "ZTA="];

function join(parts: string[]): string {
  if (typeof atob !== "function") return "";
  try {
    return parts.map((part) => atob(part)).join("");
  } catch {
    return "";
  }
}

/** 硅基流动 key（首选） */
export function siliconflowKey(): string {
  return join(SF_PARTS);
}

/** AssemblyAI key（兜底） */
export function assemblyaiKey(): string {
  return join(AAI_PARTS);
}

/** 默认服务商 */
export const BUILTIN_PROVIDER = "siliconflow" as const;
