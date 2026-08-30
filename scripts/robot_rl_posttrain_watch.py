#!/usr/bin/env python3
"""Daily arXiv monitor for robot manipulation RL post-training.

The monitor is intentionally deterministic and dependency-free so it can run in
GitHub Actions without an API key. It queries focused arXiv searches, ranks
candidate papers, permanently deduplicates them by canonical arXiv ID and
normalized-title hash, and writes a Markdown digest only when new relevant
papers are found.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterable
from zoneinfo import ZoneInfo

ARXIV_API_URL = "https://export.arxiv.org/api/query"
ARXIV_NS = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}
DEFAULT_TIMEZONE = "America/Los_Angeles"
DEFAULT_ISSUE_NUMBER = 6

# Multiple precise searches are more reliable than a single enormous OR query.
SEARCH_QUERIES = [
    '(cat:cs.RO OR cat:cs.AI OR cat:cs.LG) AND all:"reinforcement learning" '
    'AND (all:robot OR all:robotic OR all:manipulation)',
    '(cat:cs.RO OR cat:cs.AI OR cat:cs.LG) AND '
    '(all:"post-training" OR all:"fine-tuning" OR all:finetuning) '
    'AND (all:robot OR all:robotic OR all:manipulation)',
    '(all:"vision-language-action" OR all:VLA) AND '
    '(all:"reinforcement learning" OR all:"policy optimization" '
    'OR all:"offline RL" OR all:"online RL")',
    '(all:"diffusion policy" OR all:"flow policy" OR all:"flow-based policy" '
    'OR all:"flow matching policy") AND '
    '(all:"reinforcement learning" OR all:"policy optimization" '
    'OR all:"actor-critic")',
    'cat:cs.RO AND (all:"offline-to-online" OR all:"residual RL" '
    'OR all:"Q-planning" OR all:"human-in-the-loop")',
    'cat:cs.RO AND (all:"one-step distillation" OR all:"inference latency" '
    'OR all:"asynchronous reinforcement learning")',
]

ROBOT_PATTERNS = [
    r"\brobot(?:ic|ics|s)?\b",
    r"\bmanipulat(?:e|ion|or|ors|ing)\b",
    r"\bvisuomotor\b",
    r"\bdexter(?:ity|ous)\b",
    r"\bvision[- ]language[- ]action\b",
    r"\bvla(?:s)?\b",
]
RL_PATTERNS = [
    r"\breinforcement learning\b",
    r"\boffline rl\b",
    r"\bonline rl\b",
    r"\bresidual rl\b",
    r"\bpolicy optimization\b",
    r"\bactor[- ]critic\b",
    r"\bq[- ](?:learning|function|value|planning)\b",
    r"\bpost[- ]train(?:ing)?\b",
    r"\bfine[- ]tun(?:e|ing)\b",
    r"\bfinetun(?:e|ing)\b",
    r"\boffline[- ]to[- ]online\b",
    r"\bself[- ]improv(?:e|ement|ing)\b",
    r"\bhuman[- ]in[- ]the[- ]loop\b",
]

WEIGHTED_PHRASES: list[tuple[str, int]] = [
    ("vision-language-action", 6),
    ("vision language action", 6),
    (" vla ", 5),
    ("robot manipulation", 5),
    ("robotic manipulation", 5),
    ("reinforcement learning", 5),
    ("post-training", 5),
    ("post training", 5),
    ("policy optimization", 4),
    ("offline-to-online", 4),
    ("offline to online", 4),
    ("residual rl", 4),
    ("diffusion policy", 4),
    ("flow policy", 4),
    ("flow-based", 3),
    ("flow matching", 3),
    ("real-world", 3),
    ("real world", 3),
    ("real-robot", 3),
    ("real robot", 3),
    ("human-in-the-loop", 3),
    ("human intervention", 3),
    ("offline rl", 3),
    ("online rl", 3),
    ("q-function", 3),
    ("q-learning", 3),
    ("q-planning", 3),
    ("critic", 2),
    ("reward model", 2),
    ("value function", 2),
    ("action chunk", 2),
    ("one-step", 2),
    ("distillation", 2),
    ("latency", 2),
    ("asynchronous", 2),
    ("tactile", 2),
    ("visuotactile", 2),
    ("contact-rich", 2),
    ("dexterous", 2),
]

TAG_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("VLA", ("vision-language-action", "vision language action", " vla ")),
    ("Diffusion", ("diffusion policy", "denoising policy")),
    ("Flow", ("flow policy", "flow-based", "flow matching")),
    ("Online RL", ("online reinforcement learning", "online rl", "on-policy")),
    ("Offline RL", ("offline reinforcement learning", "offline rl", "off-policy")),
    ("Residual/Edit", ("residual policy", "residual rl", "edit policy", "policy editing")),
    ("Value/Q", ("q-function", "q-learning", "q-value", "q planning", "q-planning", "critic")),
    ("Human-in-loop", ("human-in-the-loop", "human intervention", "human correction")),
    ("Real robot", ("real-world", "real world", "real-robot", "real robot")),
    ("Latency", ("latency", "asynchronous", "inference delay")),
    ("Distillation", ("distillation", "one-step", "consistency model")),
    ("Dexterity/Tactile", ("dexterous", "dexterity", "tactile", "visuotactile", "contact-rich")),
    ("Model-based", ("world model", "model-based", "digital twin", "synthetic rollout")),
]

NEGATIVE_RULES: list[tuple[str, int]] = [
    ("large language model", -5),
    ("language model alignment", -5),
    ("recommendation system", -6),
    ("wireless network", -6),
    ("autonomous driving", -4),
    ("protein", -6),
    ("molecule", -6),
    ("financial", -6),
]


@dataclass(frozen=True)
class Paper:
    arxiv_id: str
    title: str
    summary: str
    authors: tuple[str, ...]
    published: datetime
    updated: datetime
    categories: tuple[str, ...]
    abs_url: str
    pdf_url: str
    comment: str


@dataclass(frozen=True)
class RankedPaper:
    paper: Paper
    score: int
    tags: tuple[str, ...]
    relation: str


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--state",
        type=Path,
        default=Path("data/robot_rl_posttrain_seen.json"),
        help="Persistent deduplication state.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("outputs/robot_rl_posttrain"),
        help="Directory for dated Markdown reports.",
    )
    parser.add_argument("--days", type=int, default=45, help="Recent-paper window.")
    parser.add_argument(
        "--per-query",
        type=int,
        default=100,
        help="Maximum arXiv results requested for each focused query.",
    )
    parser.add_argument(
        "--min-score",
        type=int,
        default=12,
        help="Minimum deterministic relevance score.",
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=20,
        help="Maximum papers included in one issue digest.",
    )
    parser.add_argument(
        "--timezone",
        default=DEFAULT_TIMEZONE,
        help="IANA timezone used for report dates.",
    )
    parser.add_argument(
        "--request-interval",
        type=float,
        default=3.0,
        help="Delay between arXiv requests, in seconds.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print findings without changing state or reports.",
    )
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run deterministic parser/scoring/dedup tests and exit.",
    )
    return parser.parse_args()


def normalize_space(text: str) -> str:
    return " ".join(html.unescape(text or "").split())


def normalize_title(title: str) -> str:
    lowered = normalize_space(title).casefold()
    return re.sub(r"[^\w]+", " ", lowered, flags=re.UNICODE).strip()


def title_key(title: str) -> str:
    digest = hashlib.sha1(normalize_title(title).encode("utf-8")).hexdigest()
    return f"title:{digest}"


def canonical_arxiv_id(raw: str) -> str:
    value = normalize_space(raw).rstrip("/")
    if "/" in value:
        value = value.rsplit("/", 1)[-1]
    value = re.sub(r"v\d+$", "", value, flags=re.IGNORECASE)
    return value


def arxiv_key(arxiv_id: str) -> str:
    return f"arxiv:{canonical_arxiv_id(arxiv_id)}"


def parse_datetime(raw: str) -> datetime:
    value = normalize_space(raw)
    if not value:
        return datetime.min.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def text_at(parent: ET.Element, path: str) -> str:
    element = parent.find(path, ARXIV_NS)
    if element is None or element.text is None:
        return ""
    return normalize_space(element.text)


def parse_atom_feed(xml_bytes: bytes) -> list[Paper]:
    root = ET.fromstring(xml_bytes)
    papers: list[Paper] = []
    for entry in root.findall("atom:entry", ARXIV_NS):
        raw_id = text_at(entry, "atom:id")
        paper_id = canonical_arxiv_id(raw_id)
        if not paper_id:
            continue

        abs_url = raw_id or f"https://arxiv.org/abs/{paper_id}"
        pdf_url = f"https://arxiv.org/pdf/{paper_id}"
        for link in entry.findall("atom:link", ARXIV_NS):
            href = link.attrib.get("href", "")
            title = link.attrib.get("title", "")
            rel = link.attrib.get("rel", "")
            link_type = link.attrib.get("type", "")
            if title == "pdf" or link_type == "application/pdf":
                pdf_url = href
            elif rel == "alternate" and href:
                abs_url = href

        authors = tuple(
            text_at(author, "atom:name")
            for author in entry.findall("atom:author", ARXIV_NS)
            if text_at(author, "atom:name")
        )
        categories = tuple(
            category.attrib.get("term", "")
            for category in entry.findall("atom:category", ARXIV_NS)
            if category.attrib.get("term", "")
        )

        papers.append(
            Paper(
                arxiv_id=paper_id,
                title=text_at(entry, "atom:title"),
                summary=text_at(entry, "atom:summary"),
                authors=authors,
                published=parse_datetime(text_at(entry, "atom:published")),
                updated=parse_datetime(text_at(entry, "atom:updated")),
                categories=categories,
                abs_url=abs_url,
                pdf_url=pdf_url,
                comment=text_at(entry, "arxiv:comment"),
            )
        )
    return papers


def build_api_url(query: str, per_query: int) -> str:
    params = {
        "search_query": query,
        "start": 0,
        "max_results": per_query,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    return f"{ARXIV_API_URL}?{urllib.parse.urlencode(params)}"


def fetch_url(url: str, retries: int = 3) -> bytes:
    headers = {
        "User-Agent": (
            "robot-rl-posttrain-watch/1.0 "
            "(https://github.com/yangfeiyang-123/arxiv_daily_update)"
        ),
        "Accept": "application/atom+xml",
    }
    last_error: Exception | None = None
    for attempt in range(1, retries + 1):
        request = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt == retries:
                break
            time.sleep(min(30.0, 4.0 * attempt))
    raise RuntimeError(f"Failed to fetch arXiv after {retries} attempts: {last_error}")


def fetch_candidates(per_query: int, request_interval: float) -> list[Paper]:
    papers_by_id: dict[str, Paper] = {}
    errors: list[str] = []
    for index, query in enumerate(SEARCH_QUERIES):
        if index and request_interval > 0:
            time.sleep(request_interval)
        try:
            payload = fetch_url(build_api_url(query, per_query))
            for paper in parse_atom_feed(payload):
                existing = papers_by_id.get(paper.arxiv_id)
                if existing is None or paper.updated > existing.updated:
                    papers_by_id[paper.arxiv_id] = paper
        except (RuntimeError, ET.ParseError) as exc:
            errors.append(f"query {index + 1}: {exc}")

    if not papers_by_id:
        detail = "; ".join(errors) or "no results"
        raise RuntimeError(f"All focused arXiv searches failed: {detail}")
    if errors:
        print("Warning: " + "; ".join(errors), file=sys.stderr)
    return list(papers_by_id.values())


def contains_any(text: str, patterns: Iterable[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def score_paper(paper: Paper) -> RankedPaper | None:
    padded = f" {paper.title} {paper.summary} {paper.comment} ".casefold()
    title_padded = f" {paper.title} ".casefold()

    if not contains_any(padded, ROBOT_PATTERNS):
        return None
    if not contains_any(padded, RL_PATTERNS):
        return None

    score = 0
    for phrase, weight in WEIGHTED_PHRASES:
        if phrase in padded:
            score += weight
            if phrase in title_padded:
                score += max(1, weight // 2)

    if "cs.RO" in paper.categories:
        score += 2
    if re.search(r"\b(manipulation|manipulator|robot arm|bimanual)\b", padded):
        score += 3
    if re.search(r"\b(vision[- ]language[- ]action|vla)\b", padded):
        score += 3

    for phrase, penalty in NEGATIVE_RULES:
        if phrase in padded:
            score += penalty

    is_navigation_or_locomotion = bool(
        re.search(r"\b(navigation|locomotion|quadruped|driving)\b", padded)
    )
    has_manipulation = bool(
        re.search(r"\b(manipulation|manipulator|grasp|pick[- ]and[- ]place|bimanual|dexter)\b", padded)
    )
    has_transferable_policy_mechanism = bool(
        re.search(r"\b(diffusion policy|flow policy|vision[- ]language[- ]action|vla|post[- ]training)\b", padded)
    )
    if is_navigation_or_locomotion and not has_manipulation:
        score -= 4 if has_transferable_policy_mechanism else 8

    tags = tuple(
        tag for tag, phrases in TAG_RULES if any(phrase in padded for phrase in phrases)
    )
    relation = explain_relation(tags, padded)
    return RankedPaper(paper=paper, score=score, tags=tags, relation=relation)


def explain_relation(tags: tuple[str, ...], text: str) -> str:
    reasons: list[str] = []
    tag_set = set(tags)
    if "Residual/Edit" in tag_set:
        reasons.append("与 DICE 相近：在冻结/受约束的行为先验旁学习残差或编辑策略")
    if "Value/Q" in tag_set:
        reasons.append("用 critic/Q 值把失败数据转化为改进信号，可替代或辅助直接策略梯度")
    if "Offline RL" in tag_set and "Online RL" in tag_set:
        reasons.append("与 RL-100 相近：采用 offline-to-online 数据飞轮")
    elif "Offline RL" in tag_set:
        reasons.append("关注离线失败/次优数据的再利用，降低真实交互成本")
    elif "Online RL" in tag_set:
        reasons.append("关注真实或仿真在线交互后的策略提升")
    if "VLA" in tag_set:
        reasons.append("直接面向 VLA/机器人基础策略的后训练")
    if "Latency" in tag_set or "Distillation" in tag_set:
        reasons.append("解决后训练走向真实部署时的推理延迟或单步化问题")
    if "Dexterity/Tactile" in tag_set:
        reasons.append("扩展到灵巧、触觉或接触丰富操作")
    if "Model-based" in tag_set:
        reasons.append("通过世界模型/数字孪生放大可用于 RL 的经验")
    if not reasons:
        if "reward" in text or "critic" in text:
            reasons.append("研究如何为机器人策略构造更有效的奖励或价值学习信号")
        else:
            reasons.append("属于机器人策略从模仿学习走向强化学习改进的同一技术链")
    return "；".join(reasons[:3])


def load_state(path: Path) -> dict:
    if not path.exists():
        return {
            "version": 1,
            "watch_name": "Robot Manipulation RL Post-Training — DICE / RL-100",
            "issue_number": DEFAULT_ISSUE_NUMBER,
            "seen": {},
        }
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read state file {path}: {exc}") from exc
    if not isinstance(payload, dict) or not isinstance(payload.get("seen"), dict):
        raise RuntimeError(f"Invalid state file format: {path}")
    return payload


def identity_keys(paper: Paper) -> tuple[str, str]:
    return arxiv_key(paper.arxiv_id), title_key(paper.title)


def is_seen(paper: Paper, seen: dict) -> bool:
    return any(key in seen for key in identity_keys(paper))


def mark_seen(seen: dict, ranked: RankedPaper, first_seen: str) -> None:
    paper = ranked.paper
    metadata = {
        "title": paper.title,
        "arxiv_id": paper.arxiv_id,
        "first_seen": first_seen,
        "published": paper.published.date().isoformat(),
        "score": ranked.score,
        "source": "daily-watch",
    }
    for key in identity_keys(paper):
        seen[key] = metadata


def truncate(text: str, limit: int = 700) -> str:
    value = normalize_space(text)
    if len(value) <= limit:
        return value
    shortened = value[: limit - 1].rsplit(" ", 1)[0]
    return shortened + "…"


def render_report(
    ranked_papers: list[RankedPaper],
    now_local: datetime,
    total_new: int,
) -> str:
    date_label = now_local.date().isoformat()
    lines = [
        f"# Robot Manipulation RL Post-Training Daily Watch · {date_label}",
        "",
        f"> 本次发现 **{total_new}** 篇此前从未推送的新论文。",
        "> 去重键：去版本号的 canonical arXiv ID + 规范化标题 SHA1。",
        "",
    ]
    if total_new > len(ranked_papers):
        lines.append(
            f"> 为控制单次消息长度，仅展示相关度最高的 {len(ranked_papers)} 篇；其余论文也已写入去重状态，不会重复推送。"
        )
        lines.append("")

    for index, ranked in enumerate(ranked_papers, start=1):
        paper = ranked.paper
        author_text = ", ".join(paper.authors[:8])
        if len(paper.authors) > 8:
            author_text += ", et al."
        tags = " · ".join(ranked.tags) if ranked.tags else "Robot RL"
        lines.extend(
            [
                f"## {index}. {paper.title}",
                "",
                f"- **arXiv**: [{paper.arxiv_id}]({paper.abs_url}) · [PDF]({paper.pdf_url})",
                f"- **日期**: {paper.published.date().isoformat()} · **相关度**: {ranked.score}",
                f"- **作者**: {author_text or 'Unknown'}",
                f"- **标签**: {tags}",
                f"- **与主线的关系**: {ranked.relation}",
                f"- **摘要摘录**: {truncate(paper.summary)}",
                "",
            ]
        )

    lines.extend(
        [
            "---",
            "监控范围：DICE / RL-100、diffusion/flow policy RL、VLA post-training、offline-to-online、residual/edit policy、value/Q-guided improvement、human-in-the-loop、world-model/digital-twin、触觉/灵巧操作及部署延迟。",
            "",
        ]
    )
    return "\n".join(lines)


def write_github_output(has_new: bool, count: int, report_path: Path | None) -> None:
    output_file = os.environ.get("GITHUB_OUTPUT")
    if not output_file:
        return
    with open(output_file, "a", encoding="utf-8") as handle:
        handle.write(f"has_new={'true' if has_new else 'false'}\n")
        handle.write(f"new_count={count}\n")
        handle.write(f"report_path={report_path.as_posix() if report_path else ''}\n")


def run_self_test() -> int:
    sample = b'''<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
      <entry>
        <id>https://arxiv.org/abs/2608.99999v2</id>
        <updated>2026-08-29T12:00:00Z</updated>
        <published>2026-08-28T12:00:00Z</published>
        <title>Residual RL Post-Training for Vision-Language-Action Robot Manipulation</title>
        <summary>We use online reinforcement learning and a Q-function to improve a diffusion policy on real-world robot manipulation.</summary>
        <author><name>Ada Robot</name></author>
        <category term="cs.RO"/>
        <link href="https://arxiv.org/abs/2608.99999v2" rel="alternate" type="text/html"/>
        <link title="pdf" href="https://arxiv.org/pdf/2608.99999v2" rel="related" type="application/pdf"/>
        <arxiv:comment>Project page available.</arxiv:comment>
      </entry>
    </feed>'''
    papers = parse_atom_feed(sample)
    assert len(papers) == 1
    paper = papers[0]
    assert paper.arxiv_id == "2608.99999"
    ranked = score_paper(paper)
    assert ranked is not None and ranked.score >= 12
    seen: dict = {}
    assert not is_seen(paper, seen)
    mark_seen(seen, ranked, "2026-08-29")
    assert is_seen(paper, seen)
    same_title_new_version = Paper(
        arxiv_id="2608.99999v3",
        title=paper.title,
        summary=paper.summary,
        authors=paper.authors,
        published=paper.published,
        updated=paper.updated,
        categories=paper.categories,
        abs_url=paper.abs_url,
        pdf_url=paper.pdf_url,
        comment=paper.comment,
    )
    assert is_seen(same_title_new_version, seen)
    assert title_key("  Residual RL: Post-Training!  ") == title_key(
        "Residual RL post training"
    )
    print("Self-test passed.")
    return 0


def main() -> int:
    args = parse_args()
    if args.self_test:
        return run_self_test()
    if args.days < 1 or args.per_query < 1 or args.max_items < 1:
        print("--days, --per-query and --max-items must be positive", file=sys.stderr)
        return 2
    if args.request_interval < 0:
        print("--request-interval must be non-negative", file=sys.stderr)
        return 2

    try:
        local_tz = ZoneInfo(args.timezone)
    except Exception as exc:
        print(f"Invalid timezone {args.timezone}: {exc}", file=sys.stderr)
        return 2

    now_utc = datetime.now(timezone.utc)
    now_local = now_utc.astimezone(local_tz)
    cutoff = now_utc - timedelta(days=args.days)

    try:
        state = load_state(args.state)
        candidates = fetch_candidates(args.per_query, args.request_interval)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        write_github_output(False, 0, None)
        return 1

    ranked_candidates: list[RankedPaper] = []
    for paper in candidates:
        if paper.published < cutoff:
            continue
        ranked = score_paper(paper)
        if ranked is None or ranked.score < args.min_score:
            continue
        ranked_candidates.append(ranked)

    ranked_candidates.sort(
        key=lambda item: (item.paper.published, item.score), reverse=True
    )
    seen = state["seen"]
    new_ranked = [item for item in ranked_candidates if not is_seen(item.paper, seen)]

    if not new_ranked:
        print("No previously unseen relevant papers found.")
        write_github_output(False, 0, None)
        return 0

    total_new = len(new_ranked)
    displayed = sorted(
        new_ranked,
        key=lambda item: (item.score, item.paper.published),
        reverse=True,
    )[: args.max_items]
    report = render_report(displayed, now_local, total_new)

    if args.dry_run:
        print(report)
        write_github_output(True, total_new, None)
        return 0

    first_seen = now_local.date().isoformat()
    for ranked in new_ranked:
        mark_seen(seen, ranked, first_seen)
    state["last_new_paper_at"] = now_utc.isoformat()
    state["last_report"] = first_seen
    state["total_unique_papers"] = sum(
        1 for key in seen if key.startswith("arxiv:")
    )

    args.state.parent.mkdir(parents=True, exist_ok=True)
    args.state.write_text(
        json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    dated_path = args.output_dir / f"{first_seen}.md"
    latest_path = args.output_dir / "latest.md"
    dated_path.write_text(report, encoding="utf-8")
    latest_path.write_text(report, encoding="utf-8")

    print(f"Found {total_new} new relevant papers; report: {dated_path}")
    write_github_output(True, total_new, dated_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
