#!/usr/bin/env python3
"""Fetch recent robot-RL/post-training candidates directly from the arXiv API.

This supplements the repository's broad cs.RO/cs.CV/cs.CL/cs.SY feed with focused
queries that also catch primary-category cs.LG papers. Relevance filtering and permanent
deduplication are performed later by ``robot_rl_post_training_watch.py``.

The script follows arXiv's request-rate guidance by sleeping between API requests. A
temporary API failure is non-fatal: it writes an empty list so the daily watch can still
fall back to the repository's existing paper feed.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ATOM = "{http://www.w3.org/2005/Atom}"
ARXIV = "{http://arxiv.org/schemas/atom}"
SPACE_RE = re.compile(r"\s+")
ARXIV_ID_RE = re.compile(r"(\d{4}\.\d{4,5})(?:v\d+)?$")
API_ENDPOINT = "https://export.arxiv.org/api/query"
USER_AGENT = "arxiv-daily-update/robot-rl-watch (github.com/yangfeiyang-123/arxiv_daily_update)"

# Separate focused queries keep each result set small enough that recent relevant papers
# are not displaced by the much larger general cs.LG stream.
SEARCH_QUERIES = (
    '(all:robot OR all:robotic) AND (all:"reinforcement learning" OR all:"offline RL" OR all:"online RL")',
    '(all:VLA OR all:"vision-language-action") AND (all:reinforcement OR all:PPO OR all:GRPO OR all:critic)',
    '(all:"diffusion policy" OR all:"flow policy" OR all:"flow matching") AND (all:reinforcement OR all:finetuning OR all:"fine-tuning")',
    '(all:"policy post-training" OR all:"policy refinement" OR all:"policy steering" OR all:"reinforcement adaptation") AND (all:robot OR all:robotic)',
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--days", type=int, default=21)
    parser.add_argument("--max-results", type=int, default=150)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--request-gap", type=float, default=3.2)
    return parser.parse_args()


def clean_text(value: str | None) -> str:
    return SPACE_RE.sub(" ", value or "").strip()


def parse_datetime(value: str | None) -> datetime:
    raw = clean_text(value)
    if not raw:
        return datetime.min.replace(tzinfo=timezone.utc)
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def canonical_id(value: str) -> str:
    match = ARXIV_ID_RE.search(value.rstrip("/"))
    return match.group(1) if match else value.rstrip("/").rsplit("/", 1)[-1]


def fetch_query(query: str, max_results: int, retries: int) -> bytes:
    params = urllib.parse.urlencode(
        {
            "search_query": query,
            "start": 0,
            "max_results": max_results,
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
    )
    request = urllib.request.Request(
        f"{API_ENDPOINT}?{params}",
        headers={"User-Agent": USER_AGENT, "Accept": "application/atom+xml"},
    )

    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=90) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            wait = min(30.0, 2.0**attempt)
            print(
                f"warning: arXiv query attempt {attempt}/{retries} failed: {exc}; "
                f"retrying in {wait:.0f}s",
                file=sys.stderr,
            )
            time.sleep(wait)

    raise RuntimeError(f"arXiv query failed after {retries} attempts: {last_error}")


def parse_feed(payload: bytes, cutoff: datetime) -> list[dict[str, Any]]:
    root = ET.fromstring(payload)
    papers: list[dict[str, Any]] = []

    for entry in root.findall(f"{ATOM}entry"):
        raw_id = clean_text(entry.findtext(f"{ATOM}id"))
        published = parse_datetime(entry.findtext(f"{ATOM}published"))
        if published < cutoff:
            continue

        authors = [
            clean_text(author.findtext(f"{ATOM}name"))
            for author in entry.findall(f"{ATOM}author")
        ]
        authors = [author for author in authors if author]

        pdf_url = ""
        for link in entry.findall(f"{ATOM}link"):
            if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                pdf_url = clean_text(link.attrib.get("href"))
                break

        categories = [
            clean_text(category.attrib.get("term"))
            for category in entry.findall(f"{ATOM}category")
            if clean_text(category.attrib.get("term"))
        ]
        primary = entry.find(f"{ARXIV}primary_category")

        papers.append(
            {
                "id": raw_id,
                "arxiv_id": canonical_id(raw_id),
                "title": clean_text(entry.findtext(f"{ATOM}title")),
                "summary": clean_text(entry.findtext(f"{ATOM}summary")),
                "authors": authors,
                "published": published.isoformat(),
                "updated": parse_datetime(entry.findtext(f"{ATOM}updated")).isoformat(),
                "pdf_url": pdf_url,
                "primary_category": clean_text(primary.attrib.get("term")) if primary is not None else "",
                "categories": categories,
                "comment": clean_text(entry.findtext(f"{ARXIV}comment")),
                "journal_ref": clean_text(entry.findtext(f"{ARXIV}journal_ref")),
                "source": "focused_arxiv_api",
            }
        )

    return papers


def main() -> int:
    args = parse_args()
    if args.days < 1 or args.max_results < 1 or args.retries < 1:
        print("error: --days, --max-results, and --retries must be positive", file=sys.stderr)
        return 2

    cutoff = datetime.now(timezone.utc) - timedelta(days=args.days)
    best_by_id: dict[str, dict[str, Any]] = {}
    successful_queries = 0

    for index, query in enumerate(SEARCH_QUERIES):
        if index:
            time.sleep(max(0.0, args.request_gap))
        try:
            payload = fetch_query(query, args.max_results, args.retries)
            successful_queries += 1
            for paper in parse_feed(payload, cutoff):
                paper_id = str(paper.get("arxiv_id", ""))
                previous = best_by_id.get(paper_id)
                if previous is None or paper.get("updated", "") > previous.get("updated", ""):
                    best_by_id[paper_id] = paper
        except (RuntimeError, ET.ParseError) as exc:
            print(f"warning: focused query skipped: {exc}", file=sys.stderr)

    papers = sorted(
        best_by_id.values(),
        key=lambda item: (item.get("published", ""), item.get("updated", "")),
        reverse=True,
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(papers, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(
        f"Focused arXiv fetch: {len(papers)} unique recent candidates from "
        f"{successful_queries}/{len(SEARCH_QUERIES)} successful queries."
    )
    # Non-fatal by design: the broad repository feed remains available as fallback.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
