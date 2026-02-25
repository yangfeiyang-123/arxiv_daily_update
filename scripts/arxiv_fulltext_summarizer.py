#!/usr/bin/env python3
"""arXiv Robotics Paper Abstract Summarizer.

Features:
- summarize newest N papers from a local JSON/SQLite input.
- summarize one paper by arxiv_id or index.
- use abstract-only summarization for lower latency and higher stability.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import sqlite3
import sys
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

try:
    import fitz  # PyMuPDF
except ModuleNotFoundError:
    fitz = None

try:
    import requests
except ModuleNotFoundError:
    requests = None

try:
    from bs4 import BeautifulSoup
except ModuleNotFoundError:
    BeautifulSoup = None

try:
    from openai import OpenAI
except ModuleNotFoundError:
    OpenAI = None

DEFAULT_BASE_URL = os.getenv(
    "LLM_BASE_URL",
    os.getenv("OPENAI_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
)
DEFAULT_MODEL_FAST = os.getenv("LLM_MODEL_FAST", os.getenv("OPENAI_MODEL_FAST", "qwen-plus-latest"))
DEFAULT_MODEL_DEEP = os.getenv("LLM_MODEL_DEEP", os.getenv("OPENAI_MODEL_DEEP", "qwen3.5-397b-a17b"))
DEFAULT_MIN_CHARS = int(os.getenv("FULLTEXT_MIN_CHARS", "30000"))
DEFAULT_CHUNK_MAX_CHARS = int(os.getenv("FULLTEXT_CHUNK_MAX_CHARS", "12000"))
DEFAULT_HTTP_RETRIES = int(os.getenv("FULLTEXT_HTTP_RETRIES", "4"))
DEFAULT_HTTP_BACKOFF = float(os.getenv("FULLTEXT_HTTP_BACKOFF", "1.8"))

METHOD_KEYWORDS = ["method", "approach", "model", "architecture", "training"]
EXPERIMENT_KEYWORDS = ["experiment", "evaluation", "results", "ablation"]

ABSTRACT_OUTPUT_PROMPT = """只基于给定的论文 abstract 回答，禁止使用外部信息和臆测。

请输出 Markdown，包含以下 4 节：

[1] 文章做了什么事
[2] 文章的创新点是什么
[3] 文章解决了什么问题
[4] 效果怎么样

要求：
- 每节 2-5 条要点，简洁明确。
- 如果 abstract 没提到，写“Abstract未明确说明”。
- 在末尾追加“[依据]”小节，列 2-5 条你依据的 abstract 关键句（可简短摘录或近义转述）。
"""


class FullTextUnavailableError(RuntimeError):
    """Raised when full paper body cannot be reliably extracted."""


@dataclass
class PaperRecord:
    arxiv_id: str
    title: str
    html_url: str
    pdf_url: str
    published_date: str
    abstract: str


@dataclass
class HtmlSection:
    heading: str
    anchor_id: str
    paragraphs: list[str]


@dataclass
class TextChunk:
    chunk_id: str
    text: str
    evidence_pointer: str


@dataclass
class ExtractionResult:
    source_type: str  # html | pdf
    source_url: str
    full_text: str
    html_sections: list[HtmlSection]
    pdf_pages: list[tuple[int, str]]


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def live_log(message: str) -> None:
    print(f"[LIVE] {message}", flush=True)


def model_log(message: str) -> None:
    print(f"[MODEL] {message}", flush=True)


def short_list_preview(values: Any, max_items: int = 2, max_chars: int = 120) -> str:
    if not isinstance(values, list):
        return ""
    items = [clean_text(str(v)) for v in values if clean_text(str(v))]
    if not items:
        return ""
    picked = items[:max_items]
    preview = " | ".join(x[:max_chars] for x in picked)
    if len(items) > max_items:
        preview += " | ..."
    return preview


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Summarize arXiv robotics papers from abstract using OpenAI-compatible API."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--input", required=True, help="Path to papers JSON/SQLite input.")
    common.add_argument(
        "--output-dir",
        default="outputs/summaries",
        help="Directory for markdown summaries and JSON records.",
    )
    common.add_argument(
        "--min-chars",
        type=int,
        default=DEFAULT_MIN_CHARS,
        help=f"Legacy option for full-text mode (ignored in abstract mode, default: {DEFAULT_MIN_CHARS}).",
    )
    common.add_argument(
        "--chunk-max-chars",
        type=int,
        default=DEFAULT_CHUNK_MAX_CHARS,
        help=f"Legacy option for full-text mode (ignored in abstract mode, default: {DEFAULT_CHUNK_MAX_CHARS}).",
    )
    common.add_argument(
        "--mode",
        choices=["fast", "deep"],
        default="fast",
        help="fast=batch cost-effective, deep=stronger single-paper synthesis.",
    )
    common.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=f"OpenAI-compatible base URL (default: {DEFAULT_BASE_URL}).",
    )
    common.add_argument(
        "--model-fast",
        default=DEFAULT_MODEL_FAST,
        help=f"Model used for chunk/batch summarization (default: {DEFAULT_MODEL_FAST}).",
    )
    common.add_argument(
        "--model-deep",
        default=DEFAULT_MODEL_DEEP,
        help=f"Model used for deep final synthesis (default: {DEFAULT_MODEL_DEEP}).",
    )
    common.add_argument(
        "--no-save",
        action="store_true",
        help="Do not write summary markdown/index/records files to disk.",
    )

    p_new = subparsers.add_parser(
        "summarize_new", parents=[common], help="Summarize newest N papers."
    )
    p_new.add_argument("--n", type=int, default=10, help="Newest N papers to summarize.")
    p_new.add_argument(
        "--latest-day-only",
        action="store_true",
        help="Summarize all papers from the latest date (Asia/Shanghai) in the input list.",
    )
    p_new.add_argument(
        "--daily-report",
        action="store_true",
        help="Also generate one daily report that synthesizes successful paper summaries.",
    )

    p_one = subparsers.add_parser(
        "summarize_one", parents=[common], help="Summarize one paper by ID or index."
    )
    p_one.add_argument("--arxiv_id", help="Target arXiv ID, e.g. 2401.12345 or 2401.12345v2.")
    p_one.add_argument(
        "--index",
        type=int,
        help="Target index in newest-first list (0-based). Useful when selecting from UI list.",
    )

    return parser.parse_args()


def require_runtime_deps() -> None:
    missing: list[str] = []
    if OpenAI is None:
        missing.append("openai")
    if missing:
        raise RuntimeError(
            "Missing dependencies: "
            + ", ".join(missing)
            + ". Install with: python3 -m pip install -r requirements.txt"
        )


def resolve_api_key() -> str:
    for env_name in ("LLM_API_KEY", "DASHSCOPE_API_KEY", "OPENAI_API_KEY"):
        value = os.getenv(env_name, "").strip()
        if value:
            return value

    if sys.stdin.isatty() and not os.getenv("CI"):
        value = getpass.getpass("Enter LLM API key (input hidden): ").strip()
        if value:
            return value

    return ""


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def parse_datetime(raw: str) -> datetime | None:
    if not raw:
        return None
    raw = raw.strip()
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def normalize_arxiv_id(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        return ""
    value = re.sub(r"\?.*$", "", value)
    value = re.sub(r"#.*$", "", value)
    if value.endswith(".pdf"):
        value = value[:-4]
    for marker in ("/abs/", "/pdf/", "/html/"):
        if marker in value:
            value = value.split(marker, 1)[1]
            break
    value = value.strip("/")
    return value


def canonical_arxiv_id(raw: str) -> str:
    return re.sub(r"v\\d+$", "", normalize_arxiv_id(raw), flags=re.IGNORECASE)


def sanitize_id_for_filename(arxiv_id: str) -> str:
    return re.sub(r"[^0-9A-Za-z._-]", "_", arxiv_id)


def coalesce(*values: Any) -> str:
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def derive_urls(arxiv_id: str) -> tuple[str, str]:
    return (
        f"https://arxiv.org/html/{arxiv_id}",
        f"https://arxiv.org/pdf/{arxiv_id}.pdf",
    )


def normalize_record(raw: dict[str, Any]) -> PaperRecord | None:
    rid = normalize_arxiv_id(coalesce(raw.get("arxiv_id"), raw.get("id")))
    if not rid:
        return None

    html_url = coalesce(raw.get("html_url"))
    pdf_url = coalesce(raw.get("pdf_url"))
    default_html, default_pdf = derive_urls(rid)

    return PaperRecord(
        arxiv_id=rid,
        title=coalesce(raw.get("title"), "Untitled"),
        html_url=html_url or default_html,
        pdf_url=pdf_url or default_pdf,
        published_date=coalesce(raw.get("published_date"), raw.get("published")),
        abstract=coalesce(raw.get("summary"), raw.get("abstract")),
    )


def load_json_records(path: Path) -> list[PaperRecord]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    rows: list[dict[str, Any]] = []

    if isinstance(payload, list):
        rows = [r for r in payload if isinstance(r, dict)]
    elif isinstance(payload, dict):
        if isinstance(payload.get("papers"), list):
            rows.extend(r for r in payload["papers"] if isinstance(r, dict))
        if isinstance(payload.get("fields"), list):
            for field in payload["fields"]:
                if not isinstance(field, dict):
                    continue
                papers = field.get("papers")
                if isinstance(papers, list):
                    rows.extend(r for r in papers if isinstance(r, dict))
    else:
        raise ValueError("Unsupported JSON structure for paper input.")

    normalized: list[PaperRecord] = []
    seen: set[str] = set()
    for row in rows:
        item = normalize_record(row)
        if item is None:
            continue
        if item.arxiv_id in seen:
            continue
        seen.add(item.arxiv_id)
        normalized.append(item)

    return normalized


def _choose_sql_table(conn: sqlite3.Connection) -> str:
    tables = [
        r[0]
        for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )
    ]
    for table in tables:
        cols = [r[1] for r in conn.execute(f"PRAGMA table_info('{table}')")]
        lowered = {c.lower() for c in cols}
        if "arxiv_id" in lowered or "id" in lowered:
            return table
    raise ValueError("No suitable table found in SQLite input.")


def load_sqlite_records(path: Path) -> list[PaperRecord]:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    try:
        table = _choose_sql_table(conn)
        cols = [r[1] for r in conn.execute(f"PRAGMA table_info('{table}')")]
        lowered = {c.lower() for c in cols}

        def pick_col(*names: str) -> str | None:
            for n in names:
                if n in lowered:
                    for c in cols:
                        if c.lower() == n:
                            return c
            return None

        c_id = pick_col("arxiv_id", "id")
        c_title = pick_col("title")
        c_html = pick_col("html_url")
        c_pdf = pick_col("pdf_url")
        c_published = pick_col("published_date", "published")
        c_abstract = pick_col("summary", "abstract")

        select_cols = [c for c in [c_id, c_title, c_html, c_pdf, c_published, c_abstract] if c]
        query = f"SELECT {', '.join(select_cols)} FROM '{table}'"

        normalized: list[PaperRecord] = []
        seen: set[str] = set()
        for row in conn.execute(query):
            raw = {
                "arxiv_id": row[c_id] if c_id else "",
                "title": row[c_title] if c_title else "",
                "html_url": row[c_html] if c_html else "",
                "pdf_url": row[c_pdf] if c_pdf else "",
                "published_date": row[c_published] if c_published else "",
                "summary": row[c_abstract] if c_abstract else "",
            }
            item = normalize_record(raw)
            if item is None:
                continue
            if item.arxiv_id in seen:
                continue
            seen.add(item.arxiv_id)
            normalized.append(item)

        return normalized
    finally:
        conn.close()


def load_records(input_path: Path) -> list[PaperRecord]:
    if not input_path.exists():
        raise FileNotFoundError(f"Input not found: {input_path}")

    if input_path.suffix.lower() == ".json":
        return load_json_records(input_path)
    if input_path.suffix.lower() in {".sqlite", ".db"}:
        return load_sqlite_records(input_path)

    raise ValueError("Unsupported input format. Use JSON or SQLite.")


def sort_newest(records: Iterable[PaperRecord]) -> list[PaperRecord]:
    def key_fn(item: PaperRecord) -> float:
        dt = parse_datetime(item.published_date)
        if dt is None:
            return 0.0
        return dt.timestamp()

    return sorted(records, key=key_fn, reverse=True)


def date_key_asia_shanghai(item: PaperRecord) -> str:
    dt = parse_datetime(item.published_date)
    if dt is None:
        return ""
    utc_dt = dt.astimezone(timezone.utc)
    # Dependency-free UTC+8 conversion for day-level grouping.
    return (utc_dt + timedelta(hours=8)).date().isoformat()


def pick_one_record(records: list[PaperRecord], arxiv_id: str | None, index: int | None) -> PaperRecord:
    if arxiv_id:
        target = canonical_arxiv_id(arxiv_id)
        for item in records:
            if canonical_arxiv_id(item.arxiv_id) == target:
                return item
        raise ValueError(f"arXiv ID not found in input: {target}")

    if index is None:
        raise ValueError("For summarize_one, provide --arxiv_id or --index.")
    if index < 0 or index >= len(records):
        raise IndexError(f"index out of range: {index}")
    return records[index]


def retry_sleep(base: float, attempt: int) -> None:
    time.sleep(base ** attempt)


def fetch_with_retries(
    session: requests.Session,
    url: str,
    expect_binary: bool,
    retries: int = DEFAULT_HTTP_RETRIES,
    backoff: float = DEFAULT_HTTP_BACKOFF,
) -> tuple[bytes | str, str]:
    last_error: str = ""
    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=45, allow_redirects=True)
            status = resp.status_code
            if status in {429, 500, 502, 503, 504}:
                last_error = f"HTTP {status}"
                if attempt < retries - 1:
                    retry_sleep(backoff, attempt)
                    continue
                raise RuntimeError(last_error)
            if status >= 400:
                raise RuntimeError(f"HTTP {status}")
            return (resp.content if expect_binary else resp.text), str(resp.url)
        except requests.RequestException as err:
            last_error = str(err)
            if attempt < retries - 1:
                retry_sleep(backoff, attempt)
                continue
            raise RuntimeError(last_error) from err
    raise RuntimeError(last_error or "unknown network error")


def extract_html_sections(html: str, source_url: str) -> ExtractionResult:
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    root = (
        soup.find("article")
        or soup.find("main")
        or soup.find("div", attrs={"id": "content"})
        or soup.body
        or soup
    )

    sections: list[HtmlSection] = []
    current = HtmlSection(heading="Front Matter", anchor_id="", paragraphs=[])

    for node in root.find_all(["h1", "h2", "h3", "h4", "p"], recursive=True):
        name = (node.name or "").lower()
        if name in {"h1", "h2", "h3", "h4"}:
            heading = clean_text(node.get_text(" ", strip=True))
            if not heading:
                continue
            if current.paragraphs:
                sections.append(current)
            anchor = ""
            if node.get("id"):
                anchor = str(node.get("id"))
            else:
                parent_with_id = node.find_parent(attrs={"id": True})
                if parent_with_id is not None:
                    anchor = str(parent_with_id.get("id") or "")
            current = HtmlSection(heading=heading[:180], anchor_id=anchor, paragraphs=[])
            continue

        if name == "p":
            text = clean_text(node.get_text(" ", strip=True))
            if len(text) >= 40:
                current.paragraphs.append(text)

    if current.paragraphs:
        sections.append(current)

    full_text_parts: list[str] = []
    for sec in sections:
        full_text_parts.append(f"\n## {sec.heading}")
        full_text_parts.extend(sec.paragraphs)
    full_text = "\n".join(full_text_parts).strip()

    return ExtractionResult(
        source_type="html",
        source_url=source_url,
        full_text=full_text,
        html_sections=sections,
        pdf_pages=[],
    )


def extract_pdf_pages(pdf_bytes: bytes, source_url: str) -> ExtractionResult:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages: list[tuple[int, str]] = []
    try:
        for i in range(doc.page_count):
            text = clean_text(doc.load_page(i).get_text("text"))
            if text:
                pages.append((i + 1, text))
    finally:
        doc.close()

    full_text = "\n".join([f"[Page {n}]\n{text}" for n, text in pages])
    return ExtractionResult(
        source_type="pdf",
        source_url=source_url,
        full_text=full_text,
        html_sections=[],
        pdf_pages=pages,
    )


def has_heading_like(text: str, keywords: list[str]) -> bool:
    pattern = re.compile(
        r"^\s*(?:\d+(?:\.\d+)*\s+)?(?:[A-Z][A-Za-z0-9\-,: ]{0,80})?\b(" + "|".join(re.escape(k) for k in keywords) + r")\b",
        re.IGNORECASE | re.MULTILINE,
    )
    return bool(pattern.search(text))


def pass_full_body_checks(result: ExtractionResult, min_chars: int) -> None:
    if len(result.full_text) <= min_chars:
        raise FullTextUnavailableError("Full text not available; cannot summarize.")

    heading_candidates = [sec.heading.lower() for sec in result.html_sections]
    method_ok = any(any(k in h for k in METHOD_KEYWORDS) for h in heading_candidates)
    exp_ok = any(any(k in h for k in EXPERIMENT_KEYWORDS) for h in heading_candidates)

    if not method_ok:
        method_ok = has_heading_like(result.full_text, METHOD_KEYWORDS)
    if not exp_ok:
        exp_ok = has_heading_like(result.full_text, EXPERIMENT_KEYWORDS)

    if not (method_ok and exp_ok):
        raise FullTextUnavailableError("Full text not available; cannot summarize.")


def retrieve_full_text(
    session: requests.Session,
    paper: PaperRecord,
    min_chars: int,
) -> ExtractionResult:
    html_candidates = [paper.html_url] if paper.html_url else []
    pdf_candidates = [paper.pdf_url] if paper.pdf_url else []

    derived_html, derived_pdf = derive_urls(paper.arxiv_id)
    if derived_html not in html_candidates:
        html_candidates.append(derived_html)
    if derived_pdf not in pdf_candidates:
        pdf_candidates.append(derived_pdf)

    errors: list[str] = []

    for html_url in html_candidates:
        try:
            html_text, final_url = fetch_with_retries(session, html_url, expect_binary=False)
            extracted = extract_html_sections(str(html_text), final_url)
            pass_full_body_checks(extracted, min_chars=min_chars)
            return extracted
        except Exception as err:  # noqa: BLE001
            errors.append(f"HTML failed ({html_url}): {err}")

    for pdf_url in pdf_candidates:
        try:
            pdf_data, final_url = fetch_with_retries(session, pdf_url, expect_binary=True)
            extracted = extract_pdf_pages(bytes(pdf_data), final_url)
            pass_full_body_checks(extracted, min_chars=min_chars)
            return extracted
        except Exception as err:  # noqa: BLE001
            errors.append(f"PDF failed ({pdf_url}): {err}")

    raise FullTextUnavailableError("Full text not available; cannot summarize.")


def chunk_html_sections(sections: list[HtmlSection], max_chars: int) -> list[TextChunk]:
    chunks: list[TextChunk] = []
    chunk_idx = 1

    for sec in sections:
        if not sec.paragraphs:
            continue
        start = 1
        current: list[str] = []
        current_len = 0

        for i, para in enumerate(sec.paragraphs, start=1):
            candidate_len = current_len + len(para) + 1
            if current and candidate_len > max_chars:
                end = i - 1
                evidence = f"({sec.heading}, paragraphs {start}-{end}, anchor {sec.anchor_id or 'N/A'})"
                text = f"Section: {sec.heading}\n" + "\n".join(current)
                chunks.append(TextChunk(chunk_id=f"C{chunk_idx:03d}", text=text, evidence_pointer=evidence))
                chunk_idx += 1
                current = []
                current_len = 0
                start = i

            current.append(para)
            current_len += len(para) + 1

        if current:
            end = len(sec.paragraphs)
            evidence = f"({sec.heading}, paragraphs {start}-{end}, anchor {sec.anchor_id or 'N/A'})"
            text = f"Section: {sec.heading}\n" + "\n".join(current)
            chunks.append(TextChunk(chunk_id=f"C{chunk_idx:03d}", text=text, evidence_pointer=evidence))
            chunk_idx += 1

    return chunks


def chunk_pdf_pages(pages: list[tuple[int, str]], max_chars: int) -> list[TextChunk]:
    chunks: list[TextChunk] = []
    chunk_idx = 1
    current_pages: list[tuple[int, str]] = []
    current_len = 0

    def flush() -> None:
        nonlocal chunk_idx, current_pages, current_len
        if not current_pages:
            return
        p_start = current_pages[0][0]
        p_end = current_pages[-1][0]
        evidence = f"(pages {p_start}-{p_end})"
        text = "\n".join([f"[Page {n}] {t}" for n, t in current_pages])
        chunks.append(TextChunk(chunk_id=f"C{chunk_idx:03d}", text=text, evidence_pointer=evidence))
        chunk_idx += 1
        current_pages = []
        current_len = 0

    for page_no, page_text in pages:
        candidate_len = current_len + len(page_text) + 20
        if current_pages and candidate_len > max_chars:
            flush()
        current_pages.append((page_no, page_text))
        current_len += len(page_text) + 20

    flush()
    return chunks


def build_chunks(result: ExtractionResult, max_chars: int) -> list[TextChunk]:
    if result.source_type == "html":
        chunks = chunk_html_sections(result.html_sections, max_chars=max_chars)
    else:
        chunks = chunk_pdf_pages(result.pdf_pages, max_chars=max_chars)

    if not chunks:
        fallback_text = result.full_text[:max_chars]
        evidence = "(document body, location not segmented)"
        chunks = [TextChunk(chunk_id="C001", text=fallback_text, evidence_pointer=evidence)]
    return chunks


def parse_json_response(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    return {
        "key_points": [clean_text(text)[:2000]] if text else [],
        "method_details": [],
        "experiment_details": [],
        "resources": [],
        "reasoning_brief": [],
    }


def build_abstract_messages(paper: PaperRecord) -> list[dict[str, str]]:
    abstract = clean_text(paper.abstract)
    if not abstract:
        raise ValueError("Abstract is empty")
    date_text = paper.published_date or "Not specified"
    return [
        {
            "role": "system",
            "content": "You are a concise research assistant. Answer only from the provided abstract.",
        },
        {
            "role": "user",
            "content": (
                f"{ABSTRACT_OUTPUT_PROMPT}\n\n"
                f"Title: {paper.title}\n"
                f"arXiv ID: {paper.arxiv_id}\n"
                f"Date: {date_text}\n\n"
                f"Abstract:\n{abstract}"
            ),
        },
    ]


class LLMRunner:
    def __init__(self, model_fast: str, model_deep: str, base_url: str | None = None) -> None:
        if OpenAI is None:
            raise RuntimeError(
                "Missing dependency: openai. Install with: python3 -m pip install -r requirements.txt"
            )
        api_key = resolve_api_key()
        if not api_key:
            raise RuntimeError("API key is required. Set LLM_API_KEY / DASHSCOPE_API_KEY / OPENAI_API_KEY.")
        final_base_url = (
            (base_url or "").strip()
            or os.getenv("LLM_BASE_URL", "").strip()
            or os.getenv("OPENAI_BASE_URL", "").strip()
            or None
        )
        self.client = OpenAI(api_key=api_key, base_url=final_base_url)
        self.model_fast = model_fast
        self.model_deep = model_deep

    def _chat(self, model: str, messages: list[dict[str, str]], temperature: float) -> str:
        last_error: Exception | None = None
        for attempt in range(4):
            try:
                resp = self.client.chat.completions.create(
                    model=model,
                    temperature=temperature,
                    messages=messages,
                )
                text = resp.choices[0].message.content or ""
                return text.strip()
            except Exception as err:  # noqa: BLE001
                last_error = err
                if attempt < 3:
                    retry_sleep(1.8, attempt)
                    continue
                raise
        raise RuntimeError(str(last_error) if last_error else "LLM request failed")

    def summarize_chunk(self, paper: PaperRecord, chunk: TextChunk, mode: str) -> dict[str, Any]:
        model = self.model_fast if mode == "fast" else self.model_fast
        prompt = {
            "role": "user",
            "content": (
                "Read this robotics paper chunk and extract grounded facts. "
                "Focus on Method/Approach and Experiments/Evaluation. "
                "If missing, use 'Not specified'.\n\n"
                f"Paper title: {paper.title}\n"
                f"arXiv ID: {paper.arxiv_id}\n"
                f"Evidence pointer: {chunk.evidence_pointer}\n"
                f"Chunk ID: {chunk.chunk_id}\n\n"
                "Return strict JSON:\n"
                "{\n"
                '  "key_points": ["..."],\n'
                '  "method_details": ["..."],\n'
                '  "experiment_details": ["..."],\n'
                '  "resources": ["..."],\n'
                '  "reasoning_brief": ["3-6 short bullets of visible reasoning based only on this chunk"]\n'
                "}\n\n"
                "Chunk text:\n"
                f"{chunk.text}"
            ),
        }
        out = self._chat(
            model=model,
            temperature=0.1,
            messages=[
                {
                    "role": "system",
                    "content": "You are a careful robotics research reader. Use only provided chunk text.",
                },
                prompt,
            ],
        )
        return parse_json_response(out)

    def summarize_abstract(self, paper: PaperRecord, mode: str) -> str:
        model = self.model_fast if mode == "fast" else self.model_deep
        messages = build_abstract_messages(paper)
        return self._chat(
            model=model,
            temperature=0.1,
            messages=messages,
        )

    def synthesize_final(
        self,
        paper: PaperRecord,
        source_type: str,
        chunk_summaries: list[dict[str, Any]],
        mode: str,
    ) -> str:
        model = self.model_fast if mode == "fast" else self.model_deep

        evidence_catalog = "\n".join(
            [f"- {item['chunk_id']}: {item['evidence_pointer']}" for item in chunk_summaries]
        )
        summaries_blob = "\n\n".join(
            [
                f"### {item['chunk_id']}\n"
                f"Evidence: {item['evidence_pointer']}\n"
                f"key_points: {json.dumps(item['summary'].get('key_points', []), ensure_ascii=False)}\n"
                f"method_details: {json.dumps(item['summary'].get('method_details', []), ensure_ascii=False)}\n"
                f"experiment_details: {json.dumps(item['summary'].get('experiment_details', []), ensure_ascii=False)}\n"
                f"resources: {json.dumps(item['summary'].get('resources', []), ensure_ascii=False)}"
                for item in chunk_summaries
            ]
        )

        date_text = paper.published_date or "Not specified"
        user_prompt = (
            "Read this robotics paper as a research collaborator.\n\n"
            f"{FINAL_OUTPUT_PROMPT}\n\n"
            "Constraints:\n"
            "- Use only the section summaries and evidence catalog below.\n"
            "- Do not fabricate any claim or citation.\n"
            "- In [9], only cite evidence pointers from the catalog exactly as written.\n"
            "- If a requested item is not present, write 'Not specified'.\n\n"
            f"Paper metadata:\nTitle: {paper.title}\narXiv ID: {paper.arxiv_id}\nDate: {date_text}\nSource type: {source_type}\n\n"
            f"Evidence catalog:\n{evidence_catalog}\n\n"
            f"Section summaries:\n{summaries_blob}"
        )

        return self._chat(
            model=model,
            temperature=0.1,
            messages=[
                {
                    "role": "system",
                    "content": "You are a robotics research collaborator. Produce concise, technical, structured Markdown.",
                },
                {"role": "user", "content": user_prompt},
            ],
        )

    def synthesize_daily_report(self, records: list[dict[str, Any]], mode: str) -> str:
        model = self.model_fast if mode == "fast" else self.model_deep
        payload = []
        for item in records:
            if item.get("status") != "success":
                continue
            payload.append(
                {
                    "arxiv_id": item.get("arxiv_id", ""),
                    "summary_excerpt": item.get("summary_excerpt", ""),
                }
            )

        prompt = (
            "Create a daily robotics paper report from abstract-grounded summaries.\n"
            "Output Markdown with sections:\n"
            "1) Daily highlights\n"
            "2) Method trends\n"
            "3) Evaluation patterns\n"
            "4) Risks and open gaps\n"
            "5) Suggested follow-up reading order\n\n"
            "If no evidence for an item, write 'Not specified'.\n\n"
            f"Input summaries JSON:\n{json.dumps(payload, ensure_ascii=False)}"
        )

        return self._chat(
            model=model,
            temperature=0.1,
            messages=[
                {"role": "system", "content": "You are an efficient robotics research analyst."},
                {"role": "user", "content": prompt},
            ],
        )


def build_http_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "arxiv-fulltext-summarizer/1.0 (+https://arxiv.org)",
            "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.8",
        }
    )
    return session


def summary_filename(paper: PaperRecord) -> str:
    dt = parse_datetime(paper.published_date)
    date_part = (dt.date().isoformat() if dt else now_utc().date().isoformat())
    aid = sanitize_id_for_filename(paper.arxiv_id)
    return f"{date_part}_{aid}.md"


def write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def summarize_single_paper(
    paper: PaperRecord,
    output_dir: Path,
    runner: LLMRunner,
    _session: requests.Session | None,
    mode: str,
    min_chars: int,
    chunk_max_chars: int,
    save_result: bool,
    emit_final_stdout: bool = False,
) -> dict[str, Any]:
    _ = (min_chars, chunk_max_chars)
    aid = paper.arxiv_id
    record: dict[str, Any] = {
        "arxiv_id": aid,
        "summary_path": "",
        "status": "failed",
        "error": "",
    }

    try:
        abstract = clean_text(paper.abstract)
        if not abstract:
            raise ValueError("Abstract未提供，无法总结。")
        live_log(f"{aid} | abstract_ready chars={len(abstract)}")
        live_log(f"{aid} | abstract_summarize start mode={mode}")
        final_md = runner.summarize_abstract(paper=paper, mode=mode)
        final_preview = clean_text(final_md).replace("\n", " ")[:220]
        if final_preview:
            model_log(f"{aid} | final_preview: {final_preview}")
        if emit_final_stdout:
            print("[FINAL_BEGIN]", flush=True)
            print(final_md, flush=True)
            print("[FINAL_END]", flush=True)

        if save_result:
            out_path = output_dir / summary_filename(paper)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(final_md, encoding="utf-8")
            live_log(f"{aid} | write_summary ok {out_path}")
            record["summary_path"] = str(out_path)
        else:
            live_log(f"{aid} | save_disabled")
            record["summary_path"] = ""

        record["status"] = "success"
        record["error"] = ""
        record["summary_excerpt"] = clean_text(final_md)[:1200]
        record["summary_text"] = final_md
        return record

    except Exception as err:  # noqa: BLE001
        record["error"] = str(err)
        live_log(f"{aid} | summarize_error {record['error']}")
        return record


def write_records(output_dir: Path, command: str, records: list[dict[str, Any]]) -> Path:
    ts = now_utc().strftime("%Y%m%dT%H%M%SZ")
    path = output_dir / f"{ts}_{command}_records.json"
    normalized = [
        {
            "arxiv_id": r.get("arxiv_id", ""),
            "summary_path": r.get("summary_path", ""),
            "status": r.get("status", "failed"),
            "error": r.get("error", ""),
        }
        for r in records
    ]
    write_json(path, normalized)
    return path


def build_summary_web_path(output_dir: Path, summary_path: str) -> tuple[str, str]:
    p = Path(summary_path)
    file_name = p.name
    parts = list(output_dir.parts)
    if len(parts) >= 2 and parts[-2:] == ["outputs", "summaries"]:
        return file_name, f"outputs/summaries/{file_name}"
    return file_name, file_name


def upsert_summary_index(output_dir: Path, records: list[dict[str, Any]]) -> Path:
    index_path = output_dir / "summary_index.json"
    index_payload: dict[str, Any] = {
        "updated_at": now_utc().isoformat(),
        "items": {},
    }

    if index_path.exists():
        try:
            existing = json.loads(index_path.read_text(encoding="utf-8"))
            if isinstance(existing, dict):
                index_payload.update(existing)
            if not isinstance(index_payload.get("items"), dict):
                index_payload["items"] = {}
        except Exception:
            index_payload = {
                "updated_at": now_utc().isoformat(),
                "items": {},
            }

    items: dict[str, Any] = index_payload["items"]
    ts = now_utc().isoformat()

    for rec in records:
        if rec.get("status") != "success":
            continue
        aid = normalize_arxiv_id(str(rec.get("arxiv_id", "")))
        summary_path = str(rec.get("summary_path", "")).strip()
        if not aid or not summary_path:
            continue

        summary_file, web_path = build_summary_web_path(output_dir, summary_path)
        entry = {
            "arxiv_id": aid,
            "summary_file": summary_file,
            "summary_path": web_path,
            "updated_at": ts,
        }
        items[aid] = entry

        canonical = canonical_arxiv_id(aid)
        if canonical and canonical != aid:
            items[canonical] = entry

    index_payload["updated_at"] = ts
    write_json(index_path, index_payload)
    return index_path


def run_summarize_new(args: argparse.Namespace) -> int:
    require_runtime_deps()
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    records = sort_newest(load_records(input_path))
    if args.latest_day_only:
        latest_key = ""
        for item in records:
            key = date_key_asia_shanghai(item)
            if key > latest_key:
                latest_key = key
        selected = [item for item in records if date_key_asia_shanghai(item) == latest_key] if latest_key else []
    else:
        selected = records[: args.n]
    live_log(
        f"batch_start mode={args.mode} latest_day_only={bool(args.latest_day_only)} selected={len(selected)}"
    )

    runner = LLMRunner(
        model_fast=args.model_fast,
        model_deep=args.model_deep,
        base_url=args.base_url,
    )
    save_result = not args.no_save

    run_records: list[dict[str, Any]] = []
    for i, paper in enumerate(selected, start=1):
        print(f"[{i}/{len(selected)}] summarizing {paper.arxiv_id} ...", flush=True)
        rec = summarize_single_paper(
            paper=paper,
            output_dir=output_dir,
            runner=runner,
            _session=None,
            mode=args.mode,
            min_chars=args.min_chars,
            chunk_max_chars=args.chunk_max_chars,
            save_result=save_result,
        )
        run_records.append(rec)
        if rec["status"] == "success":
            target_path = rec.get("summary_path") or "(in-memory)"
            print(f"  success -> {target_path}", flush=True)
        else:
            print(f"  failed  -> {rec['error']}", flush=True)

    if args.daily_report and save_result:
        successful = [r for r in run_records if r.get("status") == "success"]
        if successful:
            live_log(f"daily_report start source_count={len(successful)}")
            report_md = runner.synthesize_daily_report(successful, mode=args.mode)
            day = now_utc().date().isoformat()
            report_path = output_dir / f"{day}_daily_report.md"
            report_path.write_text(report_md, encoding="utf-8")
            print(f"daily report -> {report_path}", flush=True)
            preview = clean_text(report_md)[:220]
            if preview:
                model_log(f"daily_report preview: {preview}")

    if save_result:
        index_path = upsert_summary_index(output_dir, run_records)
        print(f"summary index -> {index_path}")
        records_path = write_records(output_dir, "summarize_new", run_records)
        print(f"records -> {records_path}")
    else:
        print("save disabled -> no files written")

    failed = sum(1 for r in run_records if r.get("status") != "success")
    success = len(run_records) - failed
    live_log(f"batch_done success={success} failed={failed}")
    if success > 0:
        return 0
    return 0 if failed == 0 else 2


def run_summarize_one(args: argparse.Namespace) -> int:
    require_runtime_deps()
    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    records = sort_newest(load_records(input_path))
    paper = pick_one_record(records, arxiv_id=args.arxiv_id, index=args.index)

    runner = LLMRunner(
        model_fast=args.model_fast,
        model_deep=args.model_deep,
        base_url=args.base_url,
    )
    save_result = not args.no_save

    rec = summarize_single_paper(
        paper=paper,
        output_dir=output_dir,
        runner=runner,
        _session=None,
        mode=args.mode,
        min_chars=args.min_chars,
        chunk_max_chars=args.chunk_max_chars,
        save_result=save_result,
        emit_final_stdout=True,
    )
    if save_result:
        index_path = upsert_summary_index(output_dir, [rec])
        print(f"summary index -> {index_path}")
        records_path = write_records(output_dir, "summarize_one", [rec])
        print(f"records -> {records_path}")
    else:
        print("save disabled -> no files written")

    if rec["status"] == "success":
        target_path = rec.get("summary_path") or "(in-memory)"
        print(f"success -> {target_path}")
        live_log("single_done success=1 failed=0")
        return 0

    print(f"failed -> {rec['error']}")
    live_log("single_done success=0 failed=1")
    return 2


def main() -> int:
    try:
        args = parse_args()
        if args.command == "summarize_new":
            return run_summarize_new(args)
        if args.command == "summarize_one":
            return run_summarize_one(args)
        raise ValueError(f"Unsupported command: {args.command}")
    except Exception as err:  # noqa: BLE001
        print(f"ERROR: {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
