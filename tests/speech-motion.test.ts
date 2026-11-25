import { test } from "node:test";
import assert from "node:assert/strict";
import { changedWordIndexes, wordFlightIndexes } from "../lib/speech-motion.ts";

test("中文修订：只标记改动的词，未改动的词保持稳定", () => {
  // 换成别的说法：只标记被替换的那一段
  assert.deepEqual(
    [...changedWordIndexes("我需要一点时间", "我需要两分钟")],
    [2],
  );
  // 完全没改
  assert.deepEqual([...changedWordIndexes("我需要一点时间", "我需要一点时间")], []);
  // 追加一句：新增的词全部标记
  assert.deepEqual(
    [...changedWordIndexes("我需要时间", "我需要一点时间让我说完")],
    [2, 4, 5, 6, 7],
  );
  // 原文为空时不出高亮
  assert.deepEqual([...changedWordIndexes("", "第一句话")], []);
});

test("逐词飞入只跟随新的时间点，限制爆发并拒绝倒退", () => {
  assert.deepEqual(wordFlightIndexes(0, 2, 10), [0, 1]);
  assert.deepEqual(wordFlightIndexes(0, 100, 12), [7, 8, 9, 10, 11]);
  assert.deepEqual(wordFlightIndexes(8, 3, 12), []);
  assert.deepEqual(wordFlightIndexes(0, 0, 12), []);
});
