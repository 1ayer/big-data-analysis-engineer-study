(function (root) {
  "use strict";

  const STORAGE_KEY = "bigdata-study-card-candidates-v1";
  const MISCONCEPTION_KEY = "bigdata-study-misconceptions-v1";
  const PROGRESS_KEY = "bigdata-study-progress-v1";
  const DATA_KEY = "bigdata-study-data-v1";
  const LEGACY_KEYS = [STORAGE_KEY, MISCONCEPTION_KEY, PROGRESS_KEY];
  const SELECTOR = ".concept, #recall .details-list > details, #quiz .quiz-list > li";
  const MISCONCEPTION_FIELDS = ["question", "myAnswer", "correctAnswer", "misconception", "rule"];
  const EXAM_DATE = "2026-09-05";
  const REVIEW_INTERVALS = [1, 3, 7, 14];
  const STUDY_UNITS = [
    { id: "day-01", date: "2026-08-13", phase: "3과목", title: "분석모형 설계와 데이터 분할", path: "chapters/03-model-design.html", spaced: true },
    { id: "day-02", date: "2026-08-14", phase: "3과목", title: "회귀·로지스틱 회귀", path: "chapters/03-regression.html", spaced: true },
    { id: "day-03", date: "2026-08-15", phase: "3과목", title: "의사결정나무·신경망·SVM", path: "chapters/03-classification.html", spaced: true },
    { id: "day-04", date: "2026-08-16", phase: "3과목", title: "연관성·군집·고급 분석기법", path: "chapters/03-unsupervised-advanced.html", spaced: true },
    { id: "day-05", date: "2026-08-17", phase: "3과목", title: "모델링 판단 집중훈련", path: "review/modeling-challenge.html" },
    { id: "day-06", date: "2026-08-18", phase: "3과목", title: "3과목 개념 연결 복습", path: "review/quick-review.html", anchor: "subject-3" },
    { id: "day-07", date: "2026-08-19", phase: "3과목", title: "모델링 오개념 적용", path: "review/misconception-lab.html" },
    { id: "day-08", date: "2026-08-20", phase: "2과목", title: "데이터 전처리", path: "chapters/02-preprocessing.html", spaced: true },
    { id: "day-09", date: "2026-08-21", phase: "2과목", title: "데이터 탐색", path: "chapters/02-exploration.html", spaced: true },
    { id: "day-10", date: "2026-08-22", phase: "2과목", title: "통계기법 이해", path: "chapters/02-statistics.html", spaced: true },
    { id: "day-11", date: "2026-08-23", phase: "2과목", title: "공식과 기준집단 훈련", path: "review/formula-drills.html" },
    { id: "day-12", date: "2026-08-24", phase: "2과목", title: "필기에서 실기로 잇는 파이프라인", path: "practice/practical-pipeline.html" },
    { id: "day-13", date: "2026-08-25", phase: "4과목", title: "분석모형 평가와 개선", path: "chapters/04-evaluation-improvement.html", spaced: true },
    { id: "day-14", date: "2026-08-26", phase: "4과목", title: "분석결과 해석과 활용", path: "chapters/04-interpretation-utilization.html", spaced: true },
    { id: "day-15", date: "2026-08-27", phase: "4과목", title: "평가·해석 연결 복습", path: "review/quick-review.html", anchor: "subject-4" },
    { id: "day-16", date: "2026-08-28", phase: "1과목", title: "빅데이터의 이해", path: "chapters/01-bigdata-understanding.html", spaced: true },
    { id: "day-17", date: "2026-08-29", phase: "1과목", title: "데이터분석 계획", path: "chapters/01-analysis-planning.html", spaced: true },
    { id: "day-18", date: "2026-08-30", phase: "1과목", title: "데이터 수집 및 저장 계획", path: "chapters/01-collection-storage.html", spaced: true },
    { id: "day-19", date: "2026-08-31", phase: "최종복습", title: "개념 연결 지도와 직전요약", path: "review/quick-review.html", anchor: "use" },
    { id: "day-20", date: "2026-09-01", phase: "최종복습", title: "80문항 모의고사", path: "review/mock-exam.html" },
    { id: "day-21", date: "2026-09-02", phase: "최종복습", title: "틀린 7문제 오개념 교정", path: "review/misconception-lab.html" },
    { id: "day-22", date: "2026-09-03", phase: "최종복습", title: "3과목 취약점 재검증", path: "review/modeling-challenge.html" },
    { id: "day-23", date: "2026-09-04", phase: "최종복습", title: "시험 전날 체크", path: "review/exam-guide.html" },
  ];

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function parseSaved(raw) {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("저장 데이터가 배열이 아닙니다.");
    return parsed.filter((item) => item && ["id", "front", "back", "kind", "tags", "title", "url"]
      .every((field) => typeof item[field] === "string"));
  }

  function uniqueCards(cards) {
    const seen = new Set();
    return cards.filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
  }

  function parseMisconceptions(raw) {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("오개념 저장 데이터가 배열이 아닙니다.");
    return parsed.filter((item) => item && typeof item.id === "string" && MISCONCEPTION_FIELDS
      .every((field) => typeof item[field] === "string"));
  }

  function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isDateString(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00`);
    return !Number.isNaN(date.getTime()) && localDateString(date) === value;
  }

  function dateFromLocal(value) {
    if (!isDateString(value)) throw new TypeError("날짜는 YYYY-MM-DD 형식이어야 합니다.");
    return new Date(`${value}T12:00:00`);
  }

  function addDays(value, days) {
    const date = dateFromLocal(value);
    date.setDate(date.getDate() + days);
    return localDateString(date);
  }

  function daysBetween(from, to) {
    return Math.round((dateFromLocal(to) - dateFromLocal(from)) / 86400000);
  }

  function parseProgress(raw) {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("학습 기록이 배열이 아닙니다.");
    const ids = new Set();
    return parsed.map((item) => {
      if (!item || typeof item.id !== "string" || !item.id || !isDateString(item.plannedDate) || !Array.isArray(item.sessions)) {
        throw new TypeError("학습 기록 형식이 올바르지 않습니다.");
      }
      if (ids.has(item.id)) throw new TypeError("학습 기록 ID가 중복됩니다.");
      ids.add(item.id);
      const dates = new Set();
      const sessions = item.sessions.map((session) => {
        if (!session || !isDateString(session.date) || !["review", "explain"].includes(session.result)) {
          throw new TypeError("학습일 기록 형식이 올바르지 않습니다.");
        }
        if (dates.has(session.date)) throw new TypeError("같은 날짜의 학습 기록이 중복됩니다.");
        dates.add(session.date);
        return { date: session.date, result: session.result };
      }).sort((a, b) => a.date.localeCompare(b.date));
      return { id: item.id, plannedDate: item.plannedDate, sessions };
    });
  }

  function recordStudySession(records, id, plannedDate, date, result) {
    const validated = parseProgress(JSON.stringify(records));
    if (typeof id !== "string" || !id || !isDateString(plannedDate) || !isDateString(date) || !["review", "explain"].includes(result)) {
      throw new TypeError("추가할 학습 기록 형식이 올바르지 않습니다.");
    }
    const current = validated.find((item) => item.id === id) || { id, plannedDate, sessions: [] };
    const sessions = current.sessions.filter((session) => session.date !== date).concat({ date, result })
      .sort((a, b) => a.date.localeCompare(b.date));
    const next = { id, plannedDate: current.plannedDate || plannedDate, sessions };
    return validated.some((item) => item.id === id)
      ? validated.map((item) => item.id === id ? next : item)
      : validated.concat(next);
  }

  function explanationStreak(entry) {
    let count = 0;
    for (let index = entry.sessions.length - 1; index >= 0 && entry.sessions[index].result === "explain"; index -= 1) count += 1;
    return count;
  }

  function nextReviewDate(entry) {
    if (!entry.sessions.length) return entry.plannedDate;
    const last = entry.sessions[entry.sessions.length - 1];
    if (last.result === "review") return addDays(last.date, 1);
    const unit = STUDY_UNITS.find((item) => item.id === entry.id);
    if (unit && !unit.spaced) return null;
    const successCount = explanationStreak(entry);
    return addDays(last.date, REVIEW_INTERVALS[Math.min(successCount - 1, REVIEW_INTERVALS.length - 1)]);
  }

  function progressStatus(entry, today = localDateString()) {
    if (!entry.sessions.length) return "미시작";
    const last = entry.sessions[entry.sessions.length - 1];
    if (last.result === "review") return "다시 복습 필요";
    const reviewDate = nextReviewDate(entry);
    if (!reviewDate) return "완료";
    if (reviewDate <= today) return "복습 예정";
    if (explanationStreak(entry) >= 3) return "설명 가능";
    return "학습 중";
  }

  function dueStudyEntries(entries, today = localDateString()) {
    return entries.filter(({ entry }) => {
      const reviewDate = nextReviewDate(entry);
      return entry.sessions.length && reviewDate && reviewDate <= today;
    }).sort((a, b) => nextReviewDate(a.entry).localeCompare(nextReviewDate(b.entry)));
  }

  function studyUnitHref(unit) {
    return `${unit.path}?unit=${encodeURIComponent(unit.id)}${unit.anchor ? `#${unit.anchor}` : ""}`;
  }

  function selectCurrentUnit(units, records, today = localDateString(), preferredId = "") {
    const entries = units.map((unit) => ({
      unit,
      entry: records.find((item) => item.id === unit.id) || { id: unit.id, plannedDate: unit.date, sessions: [] },
    }));
    const preferred = entries.find(({ unit }) => unit.id === preferredId);
    if (preferred) return preferred.unit;
    const due = dueStudyEntries(entries, today);
    if (due.length) return due[0].unit;
    const unfinished = entries.filter(({ entry }) => !entry.sessions.length)
      .sort((a, b) => a.entry.plannedDate.localeCompare(b.entry.plannedDate));
    return (unfinished.find(({ entry }) => entry.plannedDate <= today) || unfinished[0])?.unit || units[units.length - 1];
  }

  function formatDuration(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = String(Math.floor(value / 3600)).padStart(2, "0");
    const minutes = String(Math.floor(value % 3600 / 60)).padStart(2, "0");
    const remainder = String(value % 60).padStart(2, "0");
    return `${hours}:${minutes}:${remainder}`;
  }

  function timerRemainingMilliseconds(remaining, startedAt, now) {
    return Math.max(0, remaining - Math.max(0, now - startedAt));
  }

  function validateBackupList(value, parser, label) {
    if (!Array.isArray(value)) throw new TypeError(`${label} 데이터가 배열이 아닙니다.`);
    const parsed = parser(JSON.stringify(value));
    if (parsed.length !== value.length) throw new TypeError(`${label} 데이터 형식이 올바르지 않습니다.`);
    return parsed;
  }

  function isSafeCardUrl(value) {
    try {
      return ["http:", "https:", "file:"].includes(new URL(value, "https://study.invalid/").protocol);
    } catch (error) {
      return false;
    }
  }

  function validateStudyData(data) {
    const cards = validateBackupList(data.cards, parseSaved, "카드");
    const misconceptions = validateBackupList(data.misconceptions, parseMisconceptions, "오개념");
    const progress = parseProgress(JSON.stringify(data.progress));
    if (uniqueCards(cards).length !== cards.length) throw new TypeError("카드 ID가 중복됩니다.");
    if (cards.some((card) => !isSafeCardUrl(card.url))) throw new TypeError("카드 원문 주소가 안전하지 않습니다.");
    if (new Set(misconceptions.map((item) => item.id)).size !== misconceptions.length) throw new TypeError("오개념 ID가 중복됩니다.");
    if (progress.some((item) => !STUDY_UNITS.some((unit) => unit.id === item.id))) throw new TypeError("알 수 없는 학습 기록 ID가 있습니다.");
    return { cards, misconceptions, progress };
  }

  function makeStudyBackup(data, exportedAt = new Date().toISOString()) {
    const validated = validateStudyData(data);
    const backup = {
      version: 1,
      exportedAt,
      ...validated,
    };
    return JSON.stringify(backup, null, 2) + "\n";
  }

  function replaceStoredStudyData(storage, data) {
    storage.setItem(DATA_KEY, makeStudyBackup(data));
    return data;
  }

  function commitStudyData(storage, current, next) {
    try {
      return { ok: true, data: replaceStoredStudyData(storage, next) };
    } catch (error) {
      return { ok: false, data: current, error };
    }
  }

  function removeLegacyStudyData(storage) {
    let removed = true;
    LEGACY_KEYS.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch (error) {
        removed = false;
      }
    });
    return removed;
  }

  function migrateStoredStudyData(storage, data) {
    const validated = validateStudyData(data);
    const result = commitStudyData(storage, validated, validated);
    if (!result.ok) return { ...result, migrated: false, cleanupOk: false };
    return { ...result, migrated: true, cleanupOk: removeLegacyStudyData(storage) };
  }

  function parseStudyBackup(raw) {
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.exportedAt !== "string") {
      throw new TypeError("지원하지 않는 학습 백업 형식입니다.");
    }
    const data = validateStudyData(parsed);
    return {
      version: 1,
      exportedAt: parsed.exportedAt,
      ...data,
    };
  }

  function isCompleteMisconception(item) {
    return [item.question, item.correctAnswer, item.rule].every((value) => cleanText(value));
  }

  function misconceptionCard(item, source = {}) {
    const number = cleanText(item.id);
    const anchor = `mistake-${number}`;
    const pageUrl = String(source.url || "").split("#")[0];
    return {
      id: `${source.pathname || "/review/misconception-lab.html"}#${anchor}`,
      front: cleanText(item.question),
      back: [
        `정답: ${cleanText(item.correctAnswer)}`,
        cleanText(item.myAnswer) && `내 답: ${cleanText(item.myAnswer)}`,
        cleanText(item.misconception) && `내가 놓친 점: ${cleanText(item.misconception)}`,
        `교정 규칙: ${cleanText(item.rule)}`,
      ].filter(Boolean).join("\n"),
      kind: "오개념",
      tags: "빅데이터분석기사 종합복습 오개념",
      title: source.title || "틀린 7문제 오개념 교정실",
      url: pageUrl ? `${pageUrl}#${anchor}` : `#${anchor}`,
    };
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function ankiCell(value) {
    return escapeHtml(value).replace(/\t/g, " ").replace(/\r?\n/g, "<br>");
  }

  function makeAnkiText(cards) {
    const headers = ["#separator:Tab", "#html:true", "#columns:Front\tBack\tTags"];
    const rows = cards.map((card) => {
      const source = card.url
        ? `<br><br><small><a href="${escapeHtml(card.url)}">교재에서 다시 보기</a></small>`
        : "";
      return [ankiCell(card.front), `${ankiCell(card.back)}${source}`, cleanText(card.tags)].join("\t");
    });
    return headers.concat(rows).join("\n") + "\n";
  }

  if (typeof module === "object" && module.exports) {
    module.exports = {
      STUDY_UNITS,
      addDays,
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
      commitStudyData,
      replaceStoredStudyData,
      selectCurrentUnit,
      studyUnitHref,
      timerRemainingMilliseconds,
      uniqueCards,
    };
  }

  if (typeof document === "undefined") return;

  let storage;
  let cards = [];
  let misconceptions = [];
  let progress = [];
  let storageMessage = "";

  function addStorageMessage(message) {
    storageMessage = [storageMessage, message].filter(Boolean).join(" ");
  }

  function readLegacyData(key, parser, label) {
    const raw = storage.getItem(key);
    try {
      const parsed = parser(raw);
      if (raw && parsed.length !== JSON.parse(raw).length) throw new TypeError(`일부 ${label} 형식이 올바르지 않습니다.`);
      return parsed;
    } catch (error) {
      if (raw) storage.setItem(`${key}-corrupt-${Date.now()}`, raw);
      storage.removeItem(key);
      addStorageMessage(`읽을 수 없는 ${label}는 별도 키에 보존하고 새 기록으로 시작했습니다.`);
      return [];
    }
  }

  try {
    storage = root.localStorage;
    const raw = storage.getItem(DATA_KEY);
    if (raw) {
      try {
        const saved = parseStudyBackup(raw);
        cards = saved.cards;
        misconceptions = saved.misconceptions;
        progress = saved.progress;
      } catch (error) {
        storage.setItem(`${DATA_KEY}-corrupt-${Date.now()}`, raw);
        storage.removeItem(DATA_KEY);
        addStorageMessage("읽을 수 없는 학습 데이터는 별도 키에 보존하고 새 기록으로 시작했습니다.");
      }
    } else {
      try {
        const legacy = validateStudyData({
          cards: uniqueCards(readLegacyData(STORAGE_KEY, parseSaved, "카드 데이터")),
          misconceptions: readLegacyData(MISCONCEPTION_KEY, parseMisconceptions, "오개념 데이터"),
          progress: readLegacyData(PROGRESS_KEY, parseProgress, "학습 기록"),
        });
        cards = legacy.cards;
        misconceptions = legacy.misconceptions;
        progress = legacy.progress;
        if (cards.length || misconceptions.length || progress.length) {
          const migration = migrateStoredStudyData(storage, legacy);
          if (!migration.migrated) addStorageMessage("기존 기록은 읽었지만 새 저장 형식으로 아직 옮기지 못했습니다.");
          else if (!migration.cleanupOk) addStorageMessage("새 저장 형식으로 옮겼지만 기존 저장 키 일부를 정리하지 못했습니다.");
        }
      } catch (error) {
        cards = [];
        misconceptions = [];
        progress = [];
        addStorageMessage("검증하지 못한 기존 기록은 브라우저 저장소의 원래 키에 유지했습니다.");
      }
    }
  } catch (error) {
    storage = undefined;
    cards = [];
    misconceptions = [];
    progress = [];
    addStorageMessage("이 브라우저에서는 로컬 저장소를 사용할 수 없습니다.");
  }

  function writeStudyData(next, message) {
    if (!storage) return false;
    const result = commitStudyData(storage, { cards, misconceptions, progress }, next);
    if (!result.ok) {
      announce(message);
      return false;
    }
    cards = result.data.cards;
    misconceptions = result.data.misconceptions;
    progress = result.data.progress;
    removeLegacyStudyData(storage);
    return true;
  }

  function writeCards(nextCards) {
    return writeStudyData({ cards: nextCards, misconceptions, progress }, "카드를 저장하지 못했습니다. 브라우저 저장 공간을 확인하세요.");
  }

  function writeProgress(nextProgress) {
    return writeStudyData({ cards, misconceptions, progress: nextProgress }, "학습 기록을 저장하지 못했습니다. 브라우저 저장 공간을 확인하세요.");
  }

  function directChild(element, selector) {
    return Array.from(element.children).find((child) => child.matches(selector));
  }

  function elementTextWithoutButton(element, heading) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll(".card-save-button").forEach((button) => button.remove());
    if (heading) {
      const clonedHeading = clone.querySelector(heading.tagName.toLowerCase());
      if (clonedHeading) clonedHeading.remove();
    }
    return cleanText(clone.textContent);
  }

  function subjectTag() {
    const breadcrumb = cleanText(document.querySelector(".breadcrumb")?.textContent);
    return breadcrumb.match(/[1-4]과목/)?.[0] || (breadcrumb.includes("종합복습") ? "종합복습" : "공통");
  }

  function candidateFrom(element, index) {
    let kind;
    let front;
    let back;

    if (element.matches("details")) {
      kind = "회상";
      front = cleanText(directChild(element, "summary")?.textContent);
      back = elementTextWithoutButton(element, directChild(element, "summary"));
    } else if (element.matches("li")) {
      kind = "문제";
      const question = cleanText(directChild(element, "p")?.textContent);
      const choiceList = directChild(element, "ol");
      const choices = choiceList
        ? Array.from(choiceList.children).map((choice, choiceIndex) => `${String.fromCharCode(65 + choiceIndex)}. ${cleanText(choice.textContent)}`)
        : [];
      front = [question].concat(choices).filter(Boolean).join("\n");
      back = cleanText(directChild(element, "details")?.textContent.replace(/^정답과(?: 선택지)? 해설\s*/, ""));
    } else {
      kind = "개념";
      const heading = element.querySelector("h2, h3, h4");
      front = `${document.title} — ${cleanText(heading?.textContent || "핵심 개념")}`;
      back = elementTextWithoutButton(element, heading);
    }

    if (!element.id) element.id = `card-item-${index + 1}`;
    const pageUrl = root.location.href.split("#")[0];
    return {
      id: `${root.location.pathname}#${element.id}`,
      front,
      back,
      kind,
      tags: `빅데이터분석기사 ${subjectTag()} ${kind}`,
      title: document.title,
      url: `${pageUrl}#${element.id}`,
    };
  }

  const candidateElements = Array.from(document.querySelectorAll(SELECTOR));
  const candidates = candidateElements.map(candidateFrom);
  const buttons = new Map();

  function isSaved(id) {
    return cards.some((card) => card.id === id);
  }

  function updateButtons() {
    buttons.forEach((button, id) => {
      const saved = isSaved(id);
      button.textContent = saved ? "★ 카드에 저장됨" : "☆ 카드 후보";
      button.setAttribute("aria-pressed", String(saved));
      button.classList.toggle("is-saved", saved);
    });
    const count = document.querySelector("[data-card-count]");
    if (count) count.textContent = String(cards.length);
  }

  let liveRegion;
  let toolStatus;
  function announce(message) {
    if (!liveRegion) return;
    if (toolStatus) toolStatus.textContent = message;
    liveRegion.textContent = "";
    root.setTimeout(() => { liveRegion.textContent = message; }, 10);
  }

  function toggleCard(candidate) {
    if (!storage) {
      announce("브라우저 저장소를 사용할 수 없어 저장하지 못했습니다.");
      return;
    }
    const removing = isSaved(candidate.id);
    const nextCards = removing ? cards.filter((card) => card.id !== candidate.id) : uniqueCards(cards.concat(candidate));
    if (!writeCards(nextCards)) return;
    announce(removing ? "카드 후보에서 제외했습니다." : "Anki 카드 후보로 저장했습니다.");
    updateButtons();
    renderSavedCards();
  }

  function addCandidateButton(element, candidate) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "card-save-button";
    button.addEventListener("click", () => toggleCard(candidate));
    buttons.set(candidate.id, button);
    element.classList.add("card-candidate");
    if (element.matches("details")) directChild(element, "summary")?.after(button);
    else if (element.matches("li")) directChild(element, "details")?.append(button);
    else element.insertBefore(button, element.firstChild);
  }

  let dialog;
  let savedList;
  let exportButton;

  function renderSavedCards() {
    if (!savedList) return;
    savedList.replaceChildren();
    exportButton.disabled = cards.length === 0;

    if (storageMessage) {
      const warning = document.createElement("p");
      warning.className = "card-storage-warning";
      warning.textContent = storageMessage;
      savedList.append(warning);
    }

    if (cards.length === 0) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "저장한 카드 후보가 아직 없습니다.";
      savedList.append(empty);
      return;
    }

    cards.forEach((card) => {
      const item = document.createElement("article");
      item.className = "saved-card";
      const meta = document.createElement("p");
      meta.className = "saved-card-meta";
      meta.textContent = `${card.kind} · ${card.title}`;
      const front = document.createElement("p");
      front.className = "saved-card-front";
      front.textContent = card.front;
      const actions = document.createElement("div");
      actions.className = "saved-card-actions";
      const link = document.createElement("a");
      link.href = card.url;
      link.textContent = "원문 보기";
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "목록에서 빼기";
      remove.addEventListener("click", () => toggleCard(card));
      actions.append(link, remove);
      item.append(meta, front, actions);
      savedList.append(item);
    });
  }

  function downloadFile(name, text, type) {
    const blob = new Blob([text], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    root.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function downloadAnkiFile() {
    if (cards.length === 0) return;
    downloadFile(`bigdata-analysis-engineer-anki-${localDateString()}.txt`, makeAnkiText(cards), "text/tab-separated-values;charset=utf-8");
    announce("Anki 가져오기용 TSV 파일을 만들었습니다.");
  }

  function readStoredMisconceptions() {
    return misconceptions;
  }

  function exportStudyBackup() {
    if (!storage) {
      announce("브라우저 저장소를 사용할 수 없어 백업하지 못했습니다.");
      return;
    }
    try {
      const text = makeStudyBackup({ cards, misconceptions: readStoredMisconceptions(), progress });
      downloadFile(`bigdata-analysis-engineer-backup-${localDateString()}.json`, text, "application/json;charset=utf-8");
      announce("카드·오개념·학습 기록을 JSON 파일로 백업했습니다.");
    } catch (error) {
      announce(`백업 파일을 만들지 못했습니다. ${error.message}`);
    }
  }

  function importStudyBackup(file) {
    if (!storage || !file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const backup = parseStudyBackup(String(reader.result));
        const date = new Date(backup.exportedAt);
        const exportedAt = Number.isNaN(date.getTime()) ? "시각 정보 없음" : date.toLocaleString("ko-KR");
        const summary = `백업: ${exportedAt}\n카드 ${backup.cards.length}개 · 오개념 ${backup.misconceptions.length}개 · 학습 기록 ${backup.progress.length}개\n\n현재 데이터를 이 내용으로 교체할까요?`;
        if (!root.confirm(summary)) return;
        replaceStoredStudyData(storage, backup);
        root.alert("학습 데이터를 복원했습니다. 페이지를 새로 불러옵니다.");
        root.location.reload();
      } catch (error) {
        announce(`복원하지 않았습니다. ${error.message}`);
      }
    });
    reader.addEventListener("error", () => announce("백업 파일을 읽지 못했습니다."));
    reader.readAsText(file);
  }

  function openDialog() {
    renderSavedCards();
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function buildTools() {
    document.body.classList.add("has-study-tools");

    liveRegion = document.createElement("p");
    liveRegion.className = "sr-only";
    liveRegion.setAttribute("aria-live", "polite");

    const tray = document.createElement("div");
    tray.className = "card-tray";
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.innerHTML = '저장한 카드 <strong data-card-count>0</strong>개';
    openButton.addEventListener("click", openDialog);
    tray.append(openButton);

    dialog = document.createElement("dialog");
    dialog.className = "card-dialog";
    const header = document.createElement("div");
    header.className = "card-dialog-header";
    const title = document.createElement("h2");
    title.textContent = "Anki 카드 후보";
    const close = document.createElement("button");
    close.type = "button";
    close.className = "card-dialog-close";
    close.setAttribute("aria-label", "닫기");
    close.textContent = "×";
    close.addEventListener("click", () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    });
    header.append(title, close);

    const intro = document.createElement("p");
    intro.textContent = "카드와 학습 기록은 이 브라우저에만 저장됩니다. Anki용 TSV 또는 전체 JSON 백업으로 내보낼 수 있습니다.";
    toolStatus = document.createElement("p");
    toolStatus.className = "tool-status";
    savedList = document.createElement("div");
    savedList.className = "saved-card-list";
    const footer = document.createElement("div");
    footer.className = "card-dialog-actions";
    exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "button";
    exportButton.textContent = "Anki TSV 내보내기";
    exportButton.addEventListener("click", downloadAnkiFile);
    const backup = document.createElement("button");
    backup.type = "button";
    backup.className = "button secondary";
    backup.textContent = "전체 JSON 백업";
    backup.addEventListener("click", exportStudyBackup);
    const restore = document.createElement("label");
    restore.className = "button secondary file-button";
    restore.textContent = "JSON 복원";
    const restoreInput = document.createElement("input");
    restoreInput.type = "file";
    restoreInput.accept = "application/json,.json";
    restoreInput.addEventListener("change", () => {
      importStudyBackup(restoreInput.files?.[0]);
      restoreInput.value = "";
    });
    restore.append(restoreInput);
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "button secondary";
    clear.textContent = "카드 모두 지우기";
    clear.addEventListener("click", () => {
      if (cards.length === 0 || !root.confirm("저장한 카드 후보를 모두 지울까요?")) return;
      if (!writeCards([])) return;
      announce("저장한 카드 후보를 모두 지웠습니다.");
      updateButtons();
      renderSavedCards();
    });
    footer.append(exportButton, backup, restore, clear);
    dialog.append(header, intro, toolStatus, savedList, footer);
    document.body.append(liveRegion, tray, dialog);
  }

  function unitEntry(unit) {
    return progress.find((item) => item.id === unit.id) || { id: unit.id, plannedDate: unit.date, sessions: [] };
  }

  function studyRecordPanel(unit) {
    const entry = unitEntry(unit);
    let criterion = "핵심 내용을 화면 없이 설명하고 문제를 푼 뒤 현재 상태를 선택한다.";
    if (unit.path === "review/quick-review.html") criterion = "해당 과목의 제목만 보고 구분 기준을 설명한 뒤 현재 상태를 선택한다.";
    else if (unit.path === "review/misconception-lab.html") criterion = "오개념의 적용 경계와 교정 규칙을 작성한 뒤 현재 상태를 선택한다.";
    else if (unit.path === "practice/practical-pipeline.html") criterion = "예제를 실행하고 점검 질문에 답한 뒤 현재 상태를 선택한다.";
    else if (unit.path === "review/exam-guide.html") criterion = "시험 일정·준비물·당일 행동을 확인한 뒤 현재 상태를 선택한다.";
    else if (!unit.path.startsWith("chapters/")) criterion = "문제를 풀고 각 선택의 근거를 확인한 뒤 현재 상태를 선택한다.";
    const section = document.createElement("section");
    section.className = "panel study-record";
    section.setAttribute("aria-labelledby", "study-record-title");
    section.innerHTML = `
      <p class="eyebrow">학습 기록</p>
      <h2 id="study-record-title">학습 기준을 충족한 뒤 기록</h2>
      <p class="muted">기록 대상: <strong>${escapeHtml(unit.title)}</strong></p>
      <p>페이지를 읽은 것만으로 완료하지 않는다. ${escapeHtml(criterion)}</p>
      <label>학습일 <input type="date" value="${localDateString()}" data-study-session-date></label>
      <div class="study-record-actions">
        <button class="button secondary" type="button" data-study-result="review">다시 복습 필요</button>
        <button class="button" type="button" data-study-result="explain">학습 기준 충족</button>
        <a class="button secondary" href="../index.html" data-study-home hidden>학습 홈으로</a>
      </div>
      <p class="muted" data-study-record-status aria-live="polite"></p>`;
    const status = section.querySelector("[data-study-record-status]");

    function render() {
      const current = unitEntry(unit);
      const last = current.sessions[current.sessions.length - 1];
      const reviewDate = nextReviewDate(current);
      const history = current.sessions.map((session) => `${session.date} ${session.result === "explain" ? "설명 가능" : "다시 복습"}`).join(" · ");
      status.textContent = last
        ? `현재: ${progressStatus(current)}${reviewDate ? ` · 다음 복습 ${reviewDate}` : ""} · 기록 ${history}`
        : `현재: 미시작 · 권장일 ${current.plannedDate}`;
      section.querySelector("[data-study-home]").hidden = !last;
    }

    section.querySelectorAll("[data-study-result]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!storage) {
          status.textContent = "브라우저 저장소를 사용할 수 없어 기록하지 못했습니다.";
          announce(status.textContent);
          return;
        }
        const date = section.querySelector("[data-study-session-date]").value;
        try {
          const nextProgress = recordStudySession(progress, unit.id, entry.plannedDate, date, button.dataset.studyResult);
          if (writeProgress(nextProgress)) {
            render();
            announce(`${date} 학습 기록을 저장했습니다.`);
          }
        } catch (error) {
          status.textContent = error.message;
          announce(error.message);
        }
      });
    });
    render();
    return section;
  }

  function setupStudyRecord() {
    const path = root.location.pathname.split("/").slice(-2).join("/");
    const units = STUDY_UNITS.filter((unit) => unit.path === path);
    if (!units.length) return;
    const bottomNav = document.querySelector("main > nav.bottom-nav");
    const preferredId = new URLSearchParams(root.location.search).get("unit") || "";
    const panel = studyRecordPanel(selectCurrentUnit(units, progress, localDateString(), preferredId));
    if (bottomNav) bottomNav.before(panel);
    else document.querySelector("main")?.append(panel);
  }

  function setupStudyDashboard() {
    const dashboard = document.querySelector("[data-study-dashboard]");
    if (!dashboard) return;
    const today = localDateString();
    const dday = daysBetween(today, EXAM_DATE);
    const ddayElement = dashboard.querySelector("[data-exam-dday]");
    ddayElement.textContent = dday > 0 ? `D-${dday}` : dday === 0 ? "D-DAY" : `+${Math.abs(dday)}일 경과`;

    const summary = dashboard.querySelector("[data-study-summary]");
    const plan = dashboard.querySelector("[data-study-plan]");
    if (!storage) {
      const warning = document.createElement("p");
      warning.className = "card-storage-warning";
      warning.textContent = "이 브라우저에서는 학습 기록을 저장할 수 없습니다.";
      dashboard.append(warning);
    }

    function render() {
      const entries = STUDY_UNITS.map((unit) => ({ unit, entry: unitEntry(unit) }));
      const due = dueStudyEntries(entries, today);
      const overdue = entries.filter(({ entry }) => !entry.sessions.length && entry.plannedDate < today)
        .sort((a, b) => a.entry.plannedDate.localeCompare(b.entry.plannedDate));
      const scheduled = entries.filter(({ entry }) => !entry.sessions.length && entry.plannedDate >= today)
        .sort((a, b) => a.entry.plannedDate.localeCompare(b.entry.plannedDate));
      const complete = entries.filter(({ entry }) => entry.sessions.length).length;
      summary.innerHTML = `
        <article><strong>${complete}/23</strong><span>학습 기록 있음</span></article>
        <article><strong>${due.length}</strong><span>복습할 항목</span></article>
        <article><strong>${overdue.length}</strong><span>미학습 지연</span></article>`;
      const focus = dashboard.querySelector("[data-study-focus]");
      focus.replaceChildren();
      const focusEntries = [
        due[0] && { ...due[0], label: `오늘 복습 (${due.length})` },
        overdue[0] && { ...overdue[0], label: `밀린 학습 (${overdue.length})` },
        scheduled[0] && { ...scheduled[0], label: scheduled[0].entry.plannedDate === today ? "오늘 학습" : "다음 학습" },
      ].filter(Boolean);
      if (focusEntries.length) {
        focusEntries.forEach(({ unit, label }) => {
        const link = document.createElement("a");
        link.className = "button";
        link.href = studyUnitHref(unit);
        link.textContent = `${label}: ${unit.title}`;
        focus.append(link);
        });
      } else {
        focus.textContent = "23일 계획의 학습 기록이 모두 있습니다. 복습 예정일을 확인하세요.";
      }

      plan.replaceChildren();
      entries.forEach(({ unit, entry }) => {
        const item = document.createElement("li");
        item.className = "study-plan-item";
        const main = document.createElement("div");
        const link = document.createElement("a");
        link.href = studyUnitHref(unit);
        link.textContent = unit.title;
        const meta = document.createElement("span");
        const last = entry.sessions[entry.sessions.length - 1];
        const reviewDate = nextReviewDate(entry);
        meta.textContent = `${unit.phase} · ${progressStatus(entry, today)}${last ? ` · 최근 ${last.date}${reviewDate ? ` · 다음 ${reviewDate}` : ""}` : ""}`;
        main.append(link, meta);
        const label = document.createElement("label");
        label.textContent = "계획일 ";
        const date = document.createElement("input");
        date.type = "date";
        date.setAttribute("aria-label", `${unit.title} 계획일`);
        date.value = entry.plannedDate;
        date.addEventListener("change", () => {
          if (!storage || !isDateString(date.value)) {
            date.value = entry.plannedDate;
            announce("계획일은 YYYY-MM-DD 형식으로 입력하세요.");
            return;
          }
          const updated = { ...entry, plannedDate: date.value };
          const nextProgress = progress.some((item) => item.id === unit.id)
            ? progress.map((item) => item.id === unit.id ? updated : item)
            : progress.concat(updated);
          if (writeProgress(nextProgress)) render();
          else date.value = entry.plannedDate;
        });
        label.append(date);
        item.append(main, label);
        plan.append(item);
      });
    }
    render();
  }

  function setupMockTimer() {
    const timer = document.querySelector("[data-mock-timer]");
    if (!timer) return;
    const display = timer.querySelector("[data-mock-timer-display]");
    const status = timer.querySelector("[data-mock-timer-status]");
    const startButton = timer.querySelector("[data-mock-timer-start]");
    const pauseButton = timer.querySelector("[data-mock-timer-pause]");
    let remaining = 7200000;
    let startedAt;
    let interval;

    function stop() {
      root.clearInterval(interval);
      interval = undefined;
      startedAt = undefined;
    }

    function tick() {
      if (startedAt === undefined) return;
      const current = timerRemainingMilliseconds(remaining, startedAt, Date.now());
      display.textContent = formatDuration(Math.ceil(current / 1000));
      if (current === 0) {
        remaining = 0;
        stop();
        startButton.disabled = true;
        pauseButton.disabled = true;
        status.textContent = "120분이 끝났다.";
      }
    }

    startButton.addEventListener("click", () => {
      if (startedAt !== undefined || remaining === 0) return;
      startedAt = Date.now();
      interval = root.setInterval(tick, 250);
      startButton.disabled = true;
      pauseButton.disabled = false;
      status.textContent = "타이머가 진행 중이다.";
    });
    pauseButton.addEventListener("click", () => {
      if (startedAt === undefined) return;
      remaining = timerRemainingMilliseconds(remaining, startedAt, Date.now());
      stop();
      display.textContent = formatDuration(Math.ceil(remaining / 1000));
      startButton.disabled = remaining === 0;
      pauseButton.disabled = true;
      status.textContent = remaining === 0 ? "120분이 끝났다." : "타이머를 일시정지했다.";
    });
    timer.querySelector("[data-mock-timer-reset]").addEventListener("click", () => {
      stop();
      remaining = 7200000;
      display.textContent = formatDuration(remaining / 1000);
      startButton.disabled = false;
      pauseButton.disabled = true;
      status.textContent = "타이머를 초기화했다.";
    });
    pauseButton.disabled = true;
  }

  function setupMisconceptionLab() {
    const lab = document.querySelector("[data-misconception-lab]");
    if (!lab) return;

    const slots = Array.from(lab.querySelectorAll("[data-misconception-slot]"));
    const status = document.querySelector("[data-misconception-status]");
    let records = misconceptions;

    if (!storage) {
      status.textContent = "이 브라우저에서는 자동 저장을 사용할 수 없습니다.";
    }

    const byId = new Map(records.map((record) => [record.id, record]));
    slots.forEach((slot) => {
      const record = byId.get(slot.dataset.misconceptionSlot);
      if (!record) return;
      slot.querySelectorAll("[data-misconception-field]").forEach((field) => {
        field.value = record[field.dataset.misconceptionField];
      });
    });
    if (records.length) {
      const filled = records.filter((record) => MISCONCEPTION_FIELDS.some((field) => cleanText(record[field]))).length;
      status.textContent = `${filled}/7개 저장 기록 불러옴`;
    }

    function readRecords() {
      return slots.map((slot) => {
        const record = { id: slot.dataset.misconceptionSlot };
        slot.querySelectorAll("[data-misconception-field]").forEach((field) => {
          record[field.dataset.misconceptionField] = field.value;
        });
        return record;
      });
    }

    function saveRecords() {
      if (!storage) return;
      const nextRecords = readRecords();
      if (writeStudyData({ cards, misconceptions: nextRecords, progress }, "오개념 기록을 저장하지 못했습니다. 브라우저 저장 공간을 확인하세요.")) {
        records = nextRecords;
        const filled = nextRecords.filter((record) => MISCONCEPTION_FIELDS.some((field) => cleanText(record[field]))).length;
        status.textContent = `${filled}/7개 기록 자동 저장됨`;
      } else {
        const previous = new Map(records.map((record) => [record.id, record]));
        slots.forEach((slot) => slot.querySelectorAll("[data-misconception-field]").forEach((field) => {
          field.value = previous.get(slot.dataset.misconceptionSlot)?.[field.dataset.misconceptionField] || "";
        }));
        status.textContent = "자동 저장하지 못했습니다. 브라우저 저장 공간을 확인하세요.";
      }
    }

    lab.addEventListener("input", saveRecords);

    document.querySelector("[data-misconception-save-cards]")?.addEventListener("click", () => {
      if (!storage) {
        status.textContent = "브라우저 저장소를 사용할 수 없어 카드로 옮기지 못했습니다.";
        return;
      }
      const completed = readRecords().filter(isCompleteMisconception);
      if (completed.length === 0) {
        status.textContent = "핵심 조건·정답·교정 규칙을 모두 쓴 기록이 아직 없습니다.";
        return;
      }
      const source = { pathname: root.location.pathname, title: document.title, url: root.location.href };
      const merged = new Map(cards.map((card) => [card.id, card]));
      completed.map((record) => misconceptionCard(record, source)).forEach((card) => merged.set(card.id, card));
      if (writeCards(Array.from(merged.values()))) {
        updateButtons();
        renderSavedCards();
        status.textContent = `${completed.length}개 기록을 Anki 카드 후보로 저장했습니다.`;
        announce(status.textContent);
      }
    });

    document.querySelector("[data-misconception-clear]")?.addEventListener("click", () => {
      if (!root.confirm("입력한 7개 오개념 기록을 모두 지울까요?")) return;
      if (writeStudyData({ cards, misconceptions: [], progress }, "오개념 기록을 지우지 못했습니다. 브라우저 저장 공간을 확인하세요.")) {
        slots.forEach((slot) => slot.querySelectorAll("[data-misconception-field]").forEach((field) => { field.value = ""; }));
        records = [];
        status.textContent = "7개 기록을 지웠습니다. 이미 옮긴 카드 후보는 그대로 남습니다.";
      } else {
        status.textContent = "기록을 지우지 못했습니다. 브라우저 저장 공간을 확인하세요.";
      }
    });
  }

  candidates.forEach((candidate, index) => addCandidateButton(candidateElements[index], candidate));
  buildTools();
  updateButtons();
  renderSavedCards();
  setupMisconceptionLab();
  setupStudyDashboard();
  setupStudyRecord();
  setupMockTimer();
})(typeof globalThis !== "undefined" ? globalThis : this);
