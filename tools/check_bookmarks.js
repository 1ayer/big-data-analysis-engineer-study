"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  STUDY_UNITS,
  addDays,
  commitStudyData,
  daysBetween,
  dueStudyEntries,
  formatDuration,
  isCompleteMisconception,
  localDateString,
  makeAnkiText,
  makeStudyBackup,
  migrateStoredStudyData,
  misconceptionCard,
  nextReviewDate,
  parseMisconceptions,
  parseProgress,
  parseSaved,
  parseStudyBackup,
  progressStatus,
  recordStudySession,
  replaceStoredStudyData,
  selectCurrentUnit,
  studyUnitHref,
  timerRemainingMilliseconds,
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

const emptyProgress = { id: "day-01", plannedDate: "2026-08-13", sessions: [] };
assert.deepEqual(parseProgress(JSON.stringify([emptyProgress])), [emptyProgress]);
assert.throws(() => parseProgress('[{"id":"day-01","plannedDate":"2026-02-30","sessions":[]}]'), /형식/);
assert.throws(() => parseProgress('[{"id":"day-01","plannedDate":"2026-08-13","sessions":[]},{"id":"day-01","plannedDate":"2026-08-14","sessions":[]}]'), /중복/);

let progress = recordStudySession([], "day-01", "2026-08-13", "2026-08-13", "review");
assert.equal(progressStatus(progress[0], "2026-08-13"), "다시 복습 필요");
assert.equal(progress[0].sessions.length, 1);
progress = recordStudySession(progress, "day-01", "2026-08-13", "2026-08-13", "explain");
assert.equal(progress[0].sessions.length, 1, "같은 날의 판단은 새 기록으로 교체한다");
assert.equal(progressStatus(progress[0], "2026-08-13"), "학습 중");
assert.equal(nextReviewDate(progress[0]), "2026-08-14");
progress = recordStudySession(progress, "day-01", "2026-08-13", "2026-08-14", "explain");
assert.equal(nextReviewDate(progress[0]), "2026-08-17");
const resetProgress = parseProgress(JSON.stringify([{
  id: "day-02",
  plannedDate: "2026-08-14",
  sessions: [
    { date: "2026-08-13", result: "explain" },
    { date: "2026-08-14", result: "explain" },
    { date: "2026-08-15", result: "review" },
    { date: "2026-08-16", result: "explain" },
  ],
}]))[0];
assert.equal(nextReviewDate(resetProgress), "2026-08-17", "실패 뒤 첫 성공은 1일 간격부터 다시 시작한다");
assert.equal(progressStatus(resetProgress, "2026-08-16"), "학습 중");
assert.equal(addDays("2026-08-13", 1), "2026-08-14");
assert.equal(daysBetween("2026-08-13", "2026-09-05"), 23);
assert.equal(localDateString(new Date(2026, 7, 13, 23, 30)), "2026-08-13");
assert.equal(formatDuration(7200), "02:00:00");
assert.equal(formatDuration(-1), "00:00:00");
let remainingMilliseconds = 7200000;
for (let index = 0; index < 10; index += 1) {
  remainingMilliseconds = timerRemainingMilliseconds(remainingMilliseconds, 1000, 1100);
}
assert.equal(remainingMilliseconds, 7199000, "짧은 일시정지를 반복해도 경과 시간을 버리지 않는다");
assert.equal(timerRemainingMilliseconds(500, 1000, 1600), 0);

assert.equal(STUDY_UNITS.length, 23);
assert.equal(new Set(STUDY_UNITS.map((unit) => unit.id)).size, 23);
assert.deepEqual([...new Set(STUDY_UNITS.map((unit) => unit.phase))], ["3과목", "2과목", "4과목", "1과목", "최종복습"]);
STUDY_UNITS.forEach((unit, index) => {
  assert.equal(unit.date, addDays("2026-08-13", index));
  assert.equal(fs.existsSync(path.join(__dirname, "..", unit.path)), true, `${unit.path}가 있어야 한다`);
});
const repeatedUnits = STUDY_UNITS.filter((unit) => unit.path === "review/quick-review.html");
assert.equal(selectCurrentUnit(repeatedUnits, [], "2026-08-18").id, "day-06");
const firstReview = [{ id: "day-06", plannedDate: "2026-08-18", sessions: [{ date: "2026-08-18", result: "explain" }] }];
assert.equal(selectCurrentUnit(repeatedUnits, firstReview, "2026-08-18").id, "day-15");
assert.equal(selectCurrentUnit(repeatedUnits, firstReview, "2026-08-19").id, "day-06");
assert.equal(selectCurrentUnit(repeatedUnits, [], "2026-08-13", "day-15").id, "day-15");
assert.equal(studyUnitHref(repeatedUnits[1]), "review/quick-review.html?unit=day-15");
const competingReviews = [
  { id: "day-06", plannedDate: "2026-08-18", sessions: [{ date: "2026-08-29", result: "explain" }] },
  { id: "day-15", plannedDate: "2026-08-27", sessions: [{ date: "2026-08-27", result: "explain" }] },
];
const due = dueStudyEntries(repeatedUnits.map((unit) => ({ unit, entry: competingReviews.find((item) => item.id === unit.id) || { id: unit.id, plannedDate: unit.date, sessions: [] } })), "2026-08-31");
assert.equal(due[0].unit.id, "day-15");
assert.equal(selectCurrentUnit(repeatedUnits, competingReviews, "2026-08-31").id, due[0].unit.id);

const backupText = makeStudyBackup({ cards: [card], misconceptions: [misconception], progress }, "2026-08-13T00:00:00.000Z");
const backup = parseStudyBackup(backupText);
assert.deepEqual(backup.cards, [card]);
assert.deepEqual(backup.misconceptions, [misconception]);
assert.deepEqual(backup.progress, progress);
assert.throws(() => parseStudyBackup('{"version":2,"exportedAt":"now","cards":[],"misconceptions":[],"progress":[]}'), /지원하지 않는/);
assert.throws(() => parseStudyBackup('{"version":1,"exportedAt":"now","cards":[{"id":"partial"}],"misconceptions":[],"progress":[]}'), /카드 데이터 형식/);
assert.throws(() => parseStudyBackup(makeStudyBackup({ cards: [card, card], misconceptions: [], progress: [] })), /카드 ID가 중복/);
assert.throws(() => parseStudyBackup(makeStudyBackup({ cards: [{ ...card, id: "unsafe", url: "javascript:alert(1)" }], misconceptions: [], progress: [] })), /안전하지 않/);
assert.throws(() => parseStudyBackup(makeStudyBackup({ cards: [], misconceptions: [], progress: [{ id: "unknown", plannedDate: "2026-08-13", sessions: [] }] })), /알 수 없는 학습 기록/);

const stored = new Map([["bigdata-study-data-v1", "old-data"]]);
let writes = 0;
const failingStorage = {
  removeItem(key) {
    stored.delete(key);
  },
  setItem(key, value) {
    writes += 1;
    throw new Error("QuotaExceededError");
  },
};
assert.throws(() => replaceStoredStudyData(failingStorage, { cards: [card], misconceptions: [misconception], progress }), /QuotaExceededError/);
assert.equal(writes, 1, "복원은 저장소를 한 번만 써야 한다");
assert.equal(stored.get("bigdata-study-data-v1"), "old-data", "실패한 단일 쓰기는 기존 데이터를 건드리지 않는다");
const currentData = { cards: [card], misconceptions: [misconception], progress };
const failedCommit = commitStudyData(failingStorage, currentData, { cards: [], misconceptions: [], progress: [] });
assert.equal(failedCommit.ok, false);
assert.equal(failedCommit.data, currentData, "저장 실패 시 메모리 상태도 기존 스냅샷을 유지한다");
const memoryStorage = { setItem(key, value) { stored.set(key, value); } };
const nextData = { cards: [], misconceptions: [misconception], progress };
const successfulCommit = commitStudyData(memoryStorage, currentData, nextData);
assert.equal(successfulCommit.ok, true);
assert.equal(successfulCommit.data, nextData, "저장 성공 후에만 새 스냅샷을 확정한다");
assert.deepEqual(parseStudyBackup(stored.get("bigdata-study-data-v1")).cards, []);
const validStoredData = stored.get("bigdata-study-data-v1");
assert.throws(() => replaceStoredStudyData(memoryStorage, { cards: [{ ...card, url: "javascript:alert(1)" }], misconceptions: [], progress: [] }), /안전하지 않/);
assert.throws(() => replaceStoredStudyData(memoryStorage, { cards: [], misconceptions: [misconception, misconception], progress: [] }), /오개념 ID가 중복/);
assert.throws(() => replaceStoredStudyData(memoryStorage, { cards: [], misconceptions: [], progress: [{ id: "unknown", plannedDate: "2026-08-13", sessions: [] }] }), /알 수 없는 학습 기록/);
assert.equal(stored.get("bigdata-study-data-v1"), validStoredData, "거부한 데이터는 기존 통합 저장값을 바꾸지 않는다");

const legacyValues = new Map([
  ["bigdata-study-card-candidates-v1", JSON.stringify([card])],
  ["bigdata-study-misconceptions-v1", JSON.stringify([misconception])],
  ["bigdata-study-progress-v1", JSON.stringify(progress)],
]);
let blockBundle = true;
const quotaStorage = {
  getItem(key) { return legacyValues.get(key) ?? null; },
  removeItem(key) { legacyValues.delete(key); },
  setItem(key, value) {
    if (key === "bigdata-study-data-v1" && blockBundle) throw new Error("QuotaExceededError");
    legacyValues.set(key, value);
  },
};
const legacyData = { cards: [card], misconceptions: [misconception], progress };
const failedMigration = migrateStoredStudyData(quotaStorage, legacyData);
assert.equal(failedMigration.migrated, false);
assert.deepEqual(parseStudyBackup(makeStudyBackup(failedMigration.data)).cards, [card], "이관 실패 후 백업에도 기존 카드를 유지한다");
assert.equal(legacyValues.has("bigdata-study-card-candidates-v1"), true, "이관 실패 시 기존 키를 유지한다");
assert.equal(legacyValues.has("bigdata-study-misconceptions-v1"), true);
assert.equal(legacyValues.has("bigdata-study-progress-v1"), true);
assert.equal(legacyValues.has("bigdata-study-data-v1"), false);
blockBundle = false;
const retriedMigration = migrateStoredStudyData(quotaStorage, { ...legacyData, cards: [] });
assert.equal(retriedMigration.migrated, true);
assert.equal(legacyValues.has("bigdata-study-card-candidates-v1"), false, "후속 저장 성공 후 기존 키를 정리한다");
assert.equal(legacyValues.has("bigdata-study-misconceptions-v1"), false);
assert.equal(legacyValues.has("bigdata-study-progress-v1"), false);
assert.deepEqual(parseStudyBackup(legacyValues.get("bigdata-study-data-v1")).cards, []);

console.log("카드·학습 기록·백업 검사 통과");
