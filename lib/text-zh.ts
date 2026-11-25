/**
 * 中文分词：供逐词高亮与朗读边界共用的唯一入口。
 * 原版按空格切词；中文没有空格，这里用 Intl.Segmenter。
 *
 * 标点不丢弃，而是并入前一个词（end 随之延伸），
 * 这样屏幕上仍然能看到逗号句号，同时高亮粒度不变。
 */

export type Segment = { word: string; start: number; end: number };

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter("zh", { granularity: "word" })
    : null;

const PUNCT_ONLY = /^[\s\p{P}\p{S}]+$/u;

function mergePunctuation(raw: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const seg of raw) {
    const prev = out[out.length - 1];
    if (prev && PUNCT_ONLY.test(seg.word)) {
      prev.word += seg.word;
      prev.end = seg.end;
      continue;
    }
    if (PUNCT_ONLY.test(seg.word)) continue;
    out.push({ ...seg });
  }
  return out;
}

export function segmentText(text: string): Segment[] {
  const src = String(text ?? "");
  if (!src.trim()) return [];
  const raw: Segment[] = [];

  if (segmenter) {
    for (const part of segmenter.segment(src)) {
      const word = part.segment;
      if (!word) continue;
      raw.push({ word, start: part.index, end: part.index + word.length });
    }
    return mergePunctuation(raw);
  }

  // 退化：中文按字、拉丁按词、标点单列
  const re = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]|[A-Za-z0-9'’]+|\s+|[^\s]/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(src))) {
    raw.push({ word: match[0], start: match.index, end: match.index + match[0].length });
  }
  return mergePunctuation(raw);
}

/** charIndex → 第几个词（用于朗读 boundary 事件） */
export function segmentIndexAt(segments: Segment[], charIndex: number): number {
  let lo = 0;
  let hi = segments.length - 1;
  let answer = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= charIndex) {
      answer = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return answer;
}
