(function (root) {
  "use strict";

  const STORAGE_KEY = "bigdata-study-card-candidates-v1";
  const MISCONCEPTION_KEY = "bigdata-study-misconceptions-v1";
  const SELECTOR = ".concept, #recall .details-list > details, #quiz .quiz-list > li";
  const MISCONCEPTION_FIELDS = ["question", "myAnswer", "correctAnswer", "misconception", "rule"];

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
      isCompleteMisconception,
      makeAnkiText,
      misconceptionCard,
      parseMisconceptions,
      parseSaved,
      uniqueCards,
    };
  }

  if (typeof document === "undefined") return;

  let storage;
  let cards = [];
  let storageMessage = "";

  try {
    storage = root.localStorage;
    const raw = storage.getItem(STORAGE_KEY);
    try {
      cards = uniqueCards(parseSaved(raw));
    } catch (error) {
      if (raw) storage.setItem(`${STORAGE_KEY}-corrupt-${Date.now()}`, raw);
      storage.removeItem(STORAGE_KEY);
      storageMessage = "읽을 수 없는 저장 데이터는 백업하고 새 목록으로 시작했어요.";
    }
  } catch (error) {
    storageMessage = "이 브라우저에서는 카드 저장소를 사용할 수 없어요.";
  }

  function writeCards() {
    if (!storage) return false;
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(cards));
      return true;
    } catch (error) {
      announce("저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.");
      return false;
    }
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
  function announce(message) {
    if (!liveRegion) return;
    liveRegion.textContent = "";
    root.setTimeout(() => { liveRegion.textContent = message; }, 10);
  }

  function toggleCard(candidate) {
    if (!storage) {
      announce("브라우저 저장소를 사용할 수 없어 저장하지 못했어요.");
      return;
    }
    if (isSaved(candidate.id)) {
      cards = cards.filter((card) => card.id !== candidate.id);
      if (writeCards()) announce("카드 후보에서 뺐어요.");
    } else {
      cards = uniqueCards(cards.concat(candidate));
      if (writeCards()) announce("Anki 카드 후보로 저장했어요.");
    }
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
    if (element.matches("details")) element.before(button);
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
      empty.textContent = "저장한 카드 후보가 아직 없어요.";
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

  function downloadAnkiFile() {
    if (cards.length === 0) return;
    const blob = new Blob([makeAnkiText(cards)], { type: "text/tab-separated-values;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bigdata-analysis-engineer-anki-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    root.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    announce("Anki 가져오기용 TSV 파일을 만들었어요.");
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
    intro.textContent = "이 브라우저에 저장돼요. Anki에서는 내보낸 파일의 Front·Back·Tags 열을 맞춰 가져오면 됩니다.";
    savedList = document.createElement("div");
    savedList.className = "saved-card-list";
    const footer = document.createElement("div");
    footer.className = "card-dialog-actions";
    exportButton = document.createElement("button");
    exportButton.type = "button";
    exportButton.className = "button";
    exportButton.textContent = "Anki TSV 내보내기";
    exportButton.addEventListener("click", downloadAnkiFile);
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "button secondary";
    clear.textContent = "모두 지우기";
    clear.addEventListener("click", () => {
      if (cards.length === 0 || !root.confirm("저장한 카드 후보를 모두 지울까요?")) return;
      cards = [];
      if (writeCards()) announce("저장한 카드 후보를 모두 지웠어요.");
      updateButtons();
      renderSavedCards();
    });
    footer.append(exportButton, clear);
    dialog.append(header, intro, savedList, footer);
    document.body.append(liveRegion, tray, dialog);
  }

  function setupMisconceptionLab() {
    const lab = document.querySelector("[data-misconception-lab]");
    if (!lab) return;

    const slots = Array.from(lab.querySelectorAll("[data-misconception-slot]"));
    const status = document.querySelector("[data-misconception-status]");
    let records = [];

    if (storage) {
      const raw = storage.getItem(MISCONCEPTION_KEY);
      try {
        records = parseMisconceptions(raw);
      } catch (error) {
        if (raw) storage.setItem(`${MISCONCEPTION_KEY}-corrupt-${Date.now()}`, raw);
        storage.removeItem(MISCONCEPTION_KEY);
        status.textContent = "읽을 수 없는 기록은 백업하고 새 기록으로 시작했어요.";
      }
    } else {
      status.textContent = "이 브라우저에서는 자동 저장을 사용할 수 없어요.";
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
      records = readRecords();
      try {
        storage.setItem(MISCONCEPTION_KEY, JSON.stringify(records));
        const filled = records.filter((record) => MISCONCEPTION_FIELDS.some((field) => cleanText(record[field]))).length;
        status.textContent = `${filled}/7개 기록 자동 저장됨`;
      } catch (error) {
        status.textContent = "자동 저장하지 못했어요. 브라우저 저장 공간을 확인해 주세요.";
      }
    }

    lab.addEventListener("input", saveRecords);

    document.querySelector("[data-misconception-save-cards]")?.addEventListener("click", () => {
      if (!storage) {
        status.textContent = "브라우저 저장소를 사용할 수 없어 카드로 옮기지 못했어요.";
        return;
      }
      records = readRecords();
      const completed = records.filter(isCompleteMisconception);
      if (completed.length === 0) {
        status.textContent = "핵심 조건·정답·교정 규칙을 모두 쓴 기록이 아직 없어요.";
        return;
      }
      const source = { pathname: root.location.pathname, title: document.title, url: root.location.href };
      const merged = new Map(cards.map((card) => [card.id, card]));
      completed.map((record) => misconceptionCard(record, source)).forEach((card) => merged.set(card.id, card));
      cards = Array.from(merged.values());
      if (writeCards()) {
        updateButtons();
        renderSavedCards();
        status.textContent = `${completed.length}개 기록을 Anki 카드 후보로 저장했어요.`;
        announce(status.textContent);
      }
    });

    document.querySelector("[data-misconception-clear]")?.addEventListener("click", () => {
      if (!root.confirm("입력한 7개 오개념 기록을 모두 지울까요?")) return;
      slots.forEach((slot) => slot.querySelectorAll("[data-misconception-field]").forEach((field) => { field.value = ""; }));
      if (storage) storage.removeItem(MISCONCEPTION_KEY);
      records = [];
      status.textContent = "7개 기록을 지웠어요. 이미 옮긴 카드 후보는 그대로 남아 있어요.";
    });
  }

  candidates.forEach((candidate, index) => addCandidateButton(candidateElements[index], candidate));
  buildTools();
  updateButtons();
  renderSavedCards();
  setupMisconceptionLab();
})(typeof globalThis !== "undefined" ? globalThis : this);
