"use strict";

const assert = require("node:assert/strict");
const { makeAnkiText, parseSaved, uniqueCards } = require("../study.js");

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

console.log("카드 저장·Anki TSV 검사 통과");
