"""정적 교재의 HTML 구조와 내부 링크를 검사한다."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.duplicate_ids = set()
        self.hrefs = []
        self.scripts = []
        self.lang = None
        self.has_title = False
        self.in_title = False
        self.has_viewport = False
        self.section = None
        self.stack = []
        self.recall_count = 0
        self.quiz_count = 0
        self.quiz_by_subject = {}
        self.source_links = 0
        self.misconception_slots = 0
        self.misconception_fields = 0

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        frame = (tag, values)
        if tag == "html":
            self.lang = values.get("lang")
        if tag == "title":
            self.in_title = True
        if tag == "meta" and values.get("name") == "viewport":
            self.has_viewport = True
        element_id = values.get("id")
        if element_id:
            if element_id in self.ids:
                self.duplicate_ids.add(element_id)
            self.ids.add(element_id)
        if tag == "a" and values.get("href"):
            href = values["href"]
            self.hrefs.append(href)
            if self.section == "sources" and urlsplit(href).scheme in {"http", "https"}:
                self.source_links += 1
        if tag == "script" and values.get("src"):
            self.scripts.append(values["src"])
        if tag == "section" and element_id:
            self.section = element_id
        if tag == "details" and self.section == "recall":
            self.recall_count += 1
        classes = values.get("class", "").split()
        if "misconception-slot" in classes:
            self.misconception_slots += 1
        if values.get("data-misconception-field"):
            self.misconception_fields += 1
        if tag == "li" and self.section == "quiz" and self.stack:
            parent_tag, parent_attrs = self.stack[-1]
            if parent_tag == "ol" and "quiz-list" in parent_attrs.get("class", "").split():
                self.quiz_count += 1
                subject = values.get("data-subject")
                if subject:
                    self.quiz_by_subject[subject] = self.quiz_by_subject.get(subject, 0) + 1
        if tag not in VOID_TAGS:
            self.stack.append(frame)

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        while self.stack:
            opened_tag, attrs = self.stack.pop()
            if opened_tag == "section" and attrs.get("id") == self.section:
                self.section = None
            if opened_tag == tag:
                break

    def handle_data(self, data):
        if self.in_title and data.strip():
            self.has_title = True


def parse_page(path):
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def check():
    pages = sorted(ROOT.rglob("*.html"))
    parsed = {path: parse_page(path) for path in pages}
    errors = []

    if len(pages) != 19:
        errors.append(f"HTML {len(pages)}개(보강본은 정확히 19개 필요)")

    for path, page in parsed.items():
        label = path.relative_to(ROOT)
        if page.lang != "ko":
            errors.append(f"{label}: html lang은 ko여야 합니다")
        if not page.has_title:
            errors.append(f"{label}: 비어 있지 않은 title이 필요합니다")
        if not page.has_viewport:
            errors.append(f"{label}: viewport meta가 필요합니다")
        if page.duplicate_ids:
            errors.append(f"{label}: 중복 id {sorted(page.duplicate_ids)}")
        if not any(urlsplit(src).path.endswith("study.js") for src in page.scripts):
            errors.append(f"{label}: 카드 저장 스크립트 연결이 필요합니다")

        if path.parent.name == "chapters":
            if page.recall_count < 8:
                errors.append(f"{label}: 회상 질문 {page.recall_count}개(최소 8개)")
            if page.quiz_count < 10:
                errors.append(f"{label}: 객관식 {page.quiz_count}개(최소 10개)")
            if page.source_links < 2:
                errors.append(f"{label}: 외부 출처 {page.source_links}개(최소 2개)")

        if path.name == "mock-exam.html":
            if page.quiz_count != 80:
                errors.append(f"{label}: 모의고사 {page.quiz_count}개(정확히 80개 필요)")
            for subject in ("1", "2", "3", "4"):
                count = page.quiz_by_subject.get(subject, 0)
                if count != 20:
                    errors.append(f"{label}: {subject}과목 {count}개(정확히 20개 필요)")

        expected_quizzes = {"modeling-challenge.html": 20, "formula-drills.html": 15}
        if path.name in expected_quizzes and page.quiz_count != expected_quizzes[path.name]:
            errors.append(f"{label}: 문제 {page.quiz_count}개(정확히 {expected_quizzes[path.name]}개 필요)")

        if path.name == "misconception-lab.html":
            if page.misconception_slots != 7:
                errors.append(f"{label}: 오개념 기록 {page.misconception_slots}개(정확히 7개 필요)")
            if page.misconception_fields != 35:
                errors.append(f"{label}: 오개념 입력칸 {page.misconception_fields}개(정확히 35개 필요)")

        for href in page.hrefs:
            parts = urlsplit(href)
            if parts.scheme or parts.netloc or href.startswith(("mailto:", "tel:")):
                continue
            target = path if not parts.path else (path.parent / unquote(parts.path)).resolve()
            if not target.exists():
                errors.append(f"{label}: 없는 링크 대상 {href}")
                continue
            if parts.fragment and target.suffix.lower() == ".html":
                target_page = parsed.get(target) or parse_page(target)
                if unquote(parts.fragment) not in target_page.ids:
                    errors.append(f"{label}: 없는 앵커 {href}")

        for src in page.scripts:
            parts = urlsplit(src)
            if parts.scheme or parts.netloc:
                continue
            target = (path.parent / unquote(parts.path)).resolve()
            if not target.exists():
                errors.append(f"{label}: 없는 스크립트 {src}")

    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    if css.count("{") != css.count("}"):
        errors.append("styles.css: 중괄호 수가 맞지 않습니다")
    for token, label in (
        ("@media (max-width: 680px)", "모바일 레이아웃"),
        (".table-wrap", "표 스크롤 영역"),
        ("overflow-x: auto", "가로 넘침 처리"),
        ("@media print", "인쇄 레이아웃"),
        ("details > *:not(summary)", "인쇄 답안 펼침"),
        (".card-save-button", "카드 후보 버튼"),
        (".card-dialog", "저장 카드 목록"),
        (".misconception-slot", "오개념 교정 기록"),
    ):
        if token not in css:
            errors.append(f"styles.css: {label} 규칙이 필요합니다")

    practical = ROOT / "examples" / "practical_pipeline.py"
    if not practical.exists():
        errors.append("examples/practical_pipeline.py: 실행 예제가 필요합니다")
    else:
        code = practical.read_text(encoding="utf-8")
        for token in ("Pipeline", "ColumnTransformer", "train_test_split", "cross_val_score", "to_csv"):
            if token not in code:
                errors.append(f"examples/practical_pipeline.py: {token} 단계가 필요합니다")

    if errors:
        raise SystemExit("\n".join(errors))
    print(f"교재 검사 통과: HTML {len(pages)}개, 내부 링크·단원 계약·카드 도구·CSS 확인")


if __name__ == "__main__":
    check()
