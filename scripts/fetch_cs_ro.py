#!/usr/bin/env python3
"""Fetch recent arXiv papers for multiple CS fields and save to local JSON."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path

ARXIV_API_URL = "https://export.arxiv.org/api/query"
DEFAULT_CATEGORIES = ["cs.RO", "cs.CV", "cs.CL", "cs.SY"]
CATEGORY_NAMES = {
    "cs.RO": "Robotics",
    "cs.CV": "Computer Vision",
    "cs.CL": "Computation and Language",
    "cs.SY": "Systems and Control",
}
NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch recent arXiv papers for multiple CS categories."
    )
    parser.add_argument(
        "--window-days",
        type=int,
        default=30,
        help="Fetch papers within the latest N days (default: 30).",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=200,
        help="Page size per arXiv API request (default: 200).",
    )
    parser.add_argument(
        "--request-interval",
        type=float,
        default=3.0,
        help="Seconds to sleep between API requests (default: 3.0).",
    )
    parser.add_argument(
        "--categories",
        type=str,
        default=",".join(DEFAULT_CATEGORIES),
        help="Comma-separated arXiv categories, e.g. cs.RO,cs.CV,cs.CL,cs.SY",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/latest_cs_daily.json"),
        help="Path to output JSON file.",
    )
    parser.add_argument(
        "--full-refresh",
        action="store_true",
        help="Ignore existing output cache and refetch full window.",
    )
    return parser.parse_args()


def parse_categories(raw_categories: str) -> list[str]:
    categories = []
    for item in raw_categories.split(","):
        cat = item.strip()
        if not cat:
            continue
        if cat not in categories:
            categories.append(cat)
    return categories


def text_or_empty(element: ET.Element | None) -> str:
    if element is None or element.text is None:
        return ""
    return " ".join(element.text.split())


def parse_arxiv_datetime(raw: str) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def load_existing_payload(output_path: Path) -> dict:
    if not output_path.exists():
        return {}
    try:
        raw = output_path.read_text(encoding="utf-8")
        data = json.loads(raw)
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(data, dict):
        return {}
    return data


def extract_cached_field_papers(
    payload: dict,
    category: str,
    cutoff: datetime,
) -> list[dict]:
    fields = payload.get("fields", [])
    if not isinstance(fields, list):
        return []

    for field in fields:
        if not isinstance(field, dict) or field.get("code") != category:
            continue

        papers = field.get("papers", [])
        if not isinstance(papers, list):
            return []

        kept: list[dict] = []
        for paper in papers:
            if not isinstance(paper, dict):
                continue

            published_at = parse_arxiv_datetime(str(paper.get("published", "")))
            if published_at is not None and published_at < cutoff:
                continue

            item = dict(paper)
            item["field"] = category
            kept.append(item)
        return kept

    return []


def build_query(category: str, start: int, batch_size: int) -> str:
    params = {
        "search_query": f"cat:{category}",
        "sortBy": "submittedDate",
        "sortOrder": "descending",
        "start": start,
        "max_results": batch_size,
    }
    return f"{ARXIV_API_URL}?{urllib.parse.urlencode(params)}"


def extract_pdf_url(entry: ET.Element) -> str:
    for link in entry.findall("atom:link", NAMESPACES):
        href = link.attrib.get("href", "")
        title = link.attrib.get("title", "")
        rel = link.attrib.get("rel", "")
        if title == "pdf" or (rel == "related" and href.endswith(".pdf")):
            return href
    return ""


def parse_feed_page(xml_bytes: bytes, category: str) -> tuple[str, list[dict]]:
    root = ET.fromstring(xml_bytes)
    feed_title = text_or_empty(root.find("atom:title", NAMESPACES))

    papers = []
    for entry in root.findall("atom:entry", NAMESPACES):
        paper_id = text_or_empty(entry.find("atom:id", NAMESPACES))
        title = text_or_empty(entry.find("atom:title", NAMESPACES))
        summary = text_or_empty(entry.find("atom:summary", NAMESPACES))
        published = text_or_empty(entry.find("atom:published", NAMESPACES))
        updated = text_or_empty(entry.find("atom:updated", NAMESPACES))
        authors = [
            text_or_empty(author.find("atom:name", NAMESPACES))
            for author in entry.findall("atom:author", NAMESPACES)
        ]

        primary_category = ""
        primary = entry.find("arxiv:primary_category", NAMESPACES)
        if primary is not None:
            primary_category = primary.attrib.get("term", "")

        categories = [
            cat.attrib.get("term", "")
            for cat in entry.findall("atom:category", NAMESPACES)
        ]

        papers.append(
            {
                "id": paper_id,
                "title": title,
                "summary": summary,
                "authors": authors,
                "published": published,
                "updated": updated,
                "primary_category": primary_category,
                "categories": categories,
                "pdf_url": extract_pdf_url(entry),
                "field": category,
            }
        )

    return feed_title, papers


def fetch_xml(url: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "myArxiv-multi-cs-fetcher/1.1 (https://arxiv.org)",
            "Accept": "application/atom+xml",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


def fetch_field_recent_papers(
    category: str,
    batch_size: int,
    cutoff: datetime,
    request_interval: float,
    existing_papers: list[dict] | None = None,
) -> dict:
    existing_papers = existing_papers or []
    existing_by_id: dict[str, dict] = {}
    existing_without_id: list[dict] = []
    for paper in existing_papers:
        paper_id = str(paper.get("id", "")).strip()
        if paper_id:
            existing_by_id[paper_id] = paper
        else:
            existing_without_id.append(paper)

    new_papers: list[dict] = []
    seen_new_ids: set[str] = set()
    feed_title = ""
    start = 0
    page_count = 0

    while True:
        xml_data = fetch_xml(build_query(category, start, batch_size))
        page_count += 1
        page_title, page_papers = parse_feed_page(xml_data, category)

        if page_title and not feed_title:
            feed_title = page_title

        if not page_papers:
            break

        reached_cutoff = False
        added_count = 0
        existing_hits = 0

        for paper in page_papers:
            paper_id = str(paper.get("id", "")).strip()
            if paper_id and (paper_id in existing_by_id or paper_id in seen_new_ids):
                existing_hits += 1
                continue

            published_at = parse_arxiv_datetime(paper.get("published", ""))
            if published_at is not None and published_at < cutoff:
                reached_cutoff = True
                continue

            new_papers.append(paper)
            if paper_id:
                seen_new_ids.add(paper_id)
            added_count += 1

        if reached_cutoff:
            break

        if len(page_papers) < batch_size:
            break

        start += len(page_papers)

        if added_count == 0 and existing_hits > 0:
            break

        if request_interval > 0:
            time.sleep(request_interval)

    merged_by_id = dict(existing_by_id)
    merged_without_id = list(existing_without_id)
    for paper in new_papers:
        paper_id = str(paper.get("id", "")).strip()
        if paper_id:
            merged_by_id[paper_id] = paper
        else:
            merged_without_id.append(paper)

    all_papers = list(merged_by_id.values()) + merged_without_id
    filtered_papers: list[dict] = []
    for paper in all_papers:
        published_at = parse_arxiv_datetime(str(paper.get("published", "")))
        if published_at is not None and published_at < cutoff:
            continue
        filtered_papers.append(paper)

    filtered_papers.sort(
        key=lambda item: parse_arxiv_datetime(item.get("published", ""))
        or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )

    return {
        "code": category,
        "name": CATEGORY_NAMES.get(category, category),
        "query": f"cat:{category}",
        "feed_title": feed_title,
        "count": len(filtered_papers),
        "new_count": len(new_papers),
        "request_pages": page_count,
        "papers": filtered_papers,
    }


def write_json(data: dict, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()

    if args.window_days < 1:
        print("--window-days must be >= 1", file=sys.stderr)
        return 2

    if args.batch_size < 1:
        print("--batch-size must be >= 1", file=sys.stderr)
        return 2

    if args.request_interval < 0:
        print("--request-interval must be >= 0", file=sys.stderr)
        return 2

    categories = parse_categories(args.categories)
    if not categories:
        print("--categories is empty", file=sys.stderr)
        return 2

    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(days=args.window_days)

    existing_payload = {}
    if not args.full_refresh:
        existing_payload = load_existing_payload(args.output)

    fields = []
    errors = []
    for category in categories:
        try:
            cached_papers = (
                []
                if args.full_refresh
                else extract_cached_field_papers(existing_payload, category, cutoff)
            )
            fields.append(
                fetch_field_recent_papers(
                    category=category,
                    batch_size=args.batch_size,
                    cutoff=cutoff,
                    request_interval=args.request_interval,
                    existing_papers=cached_papers,
                )
            )
        except (urllib.error.URLError, ET.ParseError) as exc:
            errors.append(f"{category}: {exc}")

    if not fields:
        print(
            "Failed to fetch all categories: " + "; ".join(errors),
            file=sys.stderr,
        )
        return 1

    payload = {
        "source": "arXiv API",
        "fetched_at": now_utc.isoformat(),
        "window_days": args.window_days,
        "window_start": cutoff.isoformat(),
        "window_end": now_utc.isoformat(),
        "fetch_strategy": "full" if args.full_refresh else "incremental",
        "categories": categories,
        "total_count": sum(field["count"] for field in fields),
        "total_new_count": sum(field.get("new_count", 0) for field in fields),
        "total_request_pages": sum(field["request_pages"] for field in fields),
        "fields": fields,
        "errors": errors,
    }

    try:
        write_json(payload, args.output)
    except OSError as exc:
        print(f"File write error: {exc}", file=sys.stderr)
        return 1

    print(
        "Fetched "
        f"{payload['total_count']} papers across {len(fields)} categories "
        f"within last {args.window_days} days "
        f"(new: {payload['total_new_count']}, strategy: {payload['fetch_strategy']}) "
        f"-> {os.fspath(args.output)}"
    )

    if errors:
        print("Partial errors: " + "; ".join(errors), file=sys.stderr)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
