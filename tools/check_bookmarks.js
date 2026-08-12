"use strict";

const assert = require("node:assert/strict");
const {
  isCompleteMisconception,
  makeAnkiText,
  misconceptionCard,
  parseMisconceptions,
  parseSaved,
  uniqueCards,
} = require("../study.js");

const card = {
  id: "/chapter#one",
  front: "정밀도는?\nA. TP/(TP+FP)",
  back: "A가 정답이에요.",
  kind: "문제",
  tags: "빅데이터분석기사 4과목 문제",
  title: "평가와 개선",
  url: "https://example.com/chapter#one",
};

assert.deepEqual(parseSaved(JSON.stringify([card])), [card]);
assert.deepEqual(parseSaved('[{"id":"partial","front":"question"}]'), []);
assert.throws(() => parseSaved('{"broken":true}'), /배열/);
assert.equal(uniqueCards([card, card]).length, 1);

const tsv = makeAnkiText([card]);
assert.match(tsv, /^#separator:Tab\n#html:true\n#columns:Front\tBack\tTags\n/);
assert.match(tsv, /정밀도는\?<br>A\. TP\/\(TP\+FP\)/);
assert.match(tsv, /교재에서 다시 보기/);
assert.equal(tsv.trimEnd().split("\n").length, 4);

const misconception = {
  id: "1",
  question: "정밀도와 재현율 중 실제 양성을 기준으로 하는 것은?",
  myAnswer: "정밀도",
  correctAnswer: "재현율",
  misconception: "분모를 뒤집어 기억했다.",
  rule: "실제 양성 중 찾은 비율은 재현율이다.",
};
assert.deepEqual(parseMisconceptions(JSON.stringify([misconception])), [misconception]);
assert.deepEqual(parseMisconceptions('[{"id":"1","question":"부분"}]'), []);
assert.equal(isCompleteMisconception(misconception), true);
assert.equal(isCompleteMisconception({ ...misconception, rule: "" }), false);
const misconceptionResult = misconceptionCard(misconception, {
  pathname: "/review/misconception-lab.html",
  title: "오개념 교정실",
  url: "https://example.com/review/misconception-lab.html",
});
assert.equal(misconceptionResult.id, "/review/misconception-lab.html#mistake-1");
assert.match(misconceptionResult.back, /교정 규칙: 실제 양성/);

console.log("카드 저장·Anki TSV 검사 통과");
