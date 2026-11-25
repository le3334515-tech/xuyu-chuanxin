export type StudioPhase =
  | "idle"
  | "composing"
  | "speaking"
  | "interrupted"
  | "complete"
  | "error";

export const PRIMARY_SENTENCE =
  "我需要一点时间，但这句话我想用自己的话说。";

export const REVISED_SENTENCE =
  "我自己来回答。给我一点时间，我会告诉你我需要什么。";

export const SPANISH_SENTENCE =
  "Quiero responder por mí misma. Dame un momento para encontrar mis palabras.";

export const PHRASE_CHIPS = [
  "我需要一点时间",
  "请直接问我",
  "我自己来回答",
  "这不是我的意思",
  "我可以继续了",
];

export const PHASE_LABELS: Record<StudioPhase, string> = {
  idle: "就绪",
  composing: "正在写",
  speaking: "正在念",
  interrupted: "被打断",
  complete: "这一句说完",
  error: "需要处理",
};
