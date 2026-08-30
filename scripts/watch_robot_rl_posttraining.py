#!/usr/bin/env python3
"""Daily arXiv watcher for robot-manipulation RL post-training.

The watcher is dependency-free. It fetches recent arXiv entries, filters them
with a high-precision relevance score, permanently deduplicates by canonical
arXiv ID (version suffix removed) and normalized-title hash, and writes a
Markdown report only when unseen papers are found.
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
NAMESPACES = {
    "atom": "http://www.w3.org/2005/Atom",
    "arxiv": "http://arxiv.org/schemas/atom",
}

# The broad cs.RO feed is the coverage backbone. Targeted queries recover
# relevant cross-listed papers and improve recall for VLA/generative-policy work.
QUERY_SPECS: tuple[tuple[str, str, int], ...] = (
    ("cs.RO latest", "cat:cs.RO", 500),
    ("VLA + RL", 'all:"vision-language-action" AND all:"reinforcement learning"', 120),
    ("robot manipulation + RL", 'all:"robot manipulation" AND all:"reinforcement learning"', 120),
    ("robotic manipulation + RL", 'all:"robotic manipulation" AND all:"reinforcement learning"', 120),
    ("diffusion policy + RL", 'all:"diffusion policy" AND all:"reinforcement learning"', 120),
    ("flow policy + RL", 'all:"flow policy" AND all:"reinforcement learning"', 120),
    ("offline-to-online robot RL", 'all:"offline-to-online" AND all:robot AND all:"reinforcement learning"', 120),
    ("RL post-training + robot", 'all:"RL post-training" AND all:robot', 120),
    ("self-improving robot policy", 'all:"self-improving" AND all:"robot policy"', 120),
)

ROBOT_TERMS = (
    "robot",
    "robotic",
    "manipulation",
    "manipulator",
    "visuomotor",
    "vision-language-action",
    "vla",
    "dexterous",
    "contact-rich",
    "loco-manipulation",
    "embodied",
)

RL_TERMS = (
    "reinforcement learning",
    "rl",
    "rl post-training",
    "rl post training",
    "rl fine-tuning",
    "rl finetuning",
    "offline rl",
    "online rl",
    "offline-to-online",
    "offline to online",
    "policy gradient",
    "actor-critic",
    "q-learning",
    "proximal policy optimization",
    "group relative policy optimization",
    "grpo",
    "ppo",
    "sac",
)

MANIPULATION_TERMS = (
    "manipulation",
    "manipulator",
    "visuomotor",
    "vision-language-action",
    "vla",
    "dexterous",
    "contact-rich",
    "grasp",
    "assembly",
    "insertion",
    "action policy",
    "robot policy",
    "loco-manipulation",
    "embodied reinforcement",
)

NAVIGATION_ONLY_TERMS = (
    "crowd navigation",
    "robot navigation",
    "vision-language navigation",
    "aerial navigation",
    "uav",
    "autonomous driving",
)

TITLE_WEIGHTS: tuple[tuple[str, int], ...] = (
    ("rl post-training", 9),
    ("reinforcement learning", 6),
    ("offline-to-online", 5),
    ("vision-language-action", 5),
    ("diffusion policy", 4),
    ("flow policy", 4),
    ("flow-matching", 4),
    ("flow matching", 4),
    ("robot manipulation", 4),
    ("robotic manipulation", 4),
    ("real-world", 3),
    ("real robot", 3),
    ("policy steering", 3),
    ("policy fine-tuning", 3),
    ("policy finetuning", 3),
    ("self-improving", 3),
    ("world model", 3),
    ("critic", 2),
    ("residual", 2),
    ("distillation", 2),
    ("human-in-the-loop", 2),
    ("continual", 2),
)

ABSTRACT_WEIGHTS: tuple[tuple[str, int], ...] = (
    ("rl post-training", 5),
    ("reinforcement learning", 3),
    ("vision-language-action", 3),
    ("diffusion policy", 2),
    ("flow policy", 2),
    ("flow-matching", 2),
    ("flow matching", 2),
    ("offline-to-online", 2),
    ("real-world", 2),
    ("real robot", 2),
    ("human-in-the-loop", 2),
    ("policy gradient", 2),
    ("actor-critic", 2),
    ("q-learning", 2),
    ("world model", 2),
    ("self-improving", 2),
    ("value", 1),
    ("critic", 1),
    ("residual", 1),
    ("distillation", 1),
    ("action chunk", 1),
    ("failure recovery", 1),
    ("safety", 1),
    ("tactile", 1),
    ("force", 1),
    ("contact-rich", 1),
)

# Acronyms must be matched as tokens. Naive substring checks make "ppo" match
# words such as "support", causing many false positives.
TOKEN_TERMS = frozenset({"rl", "vla", "ppo", "grpo", "sac"})


@dataclass(frozen=True)
class Paper:
    arxiv_id: str
    title: str
    summary: str
    authors: tuple[str, ...]
    published: str
    updated: str
    categories: tuple[str, ...]
    abs_url: str
    pdf_url: str
    score: int = 0
    tags: tuple[str, ...] = ()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--state",
        type=Path,
        default=Path("data/robot_rl_watch_state.json"),
        help="Persistent deduplication state JSON.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("outputs/robot_rl_watch"),
        help="Directory for dated Markdown reports.",
    )
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=45,
        help="Only consider papers submitted within this many days.",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=10,
        help="Minimum relevance score.",
    )
    parser.add_argument(
        "--max-new",
        type=int,
        default=30,
        help="Maximum unseen papers reported per run; excess papers remain unseen.",
    )
    parser.add_argument(
        "--request-interval",
        type=float,
        default=3.0,
        help="Delay between arXiv API calls, in seconds.",
    )
    parser.add_argument(
        "--timezone",
        default="America/Los_Angeles",
        help="Timezone used in report filenames and headings.",
    )
    return parser.parse_args()


def collapse_ws(text: str) -> str:
    return " ".join(html.unescape(text or "").split())


def text_or_empty(element: ET.Element | None) -> str:
    if element is None or element.text is None:
        return ""
    return collapse_ws(element.text)


def canonical_arxiv_id(raw: str) -> str:
    value = raw.strip().rstrip("/")
    value = value.rsplit("/", 1)[-1]
    return re.sub(r"v\d+$", "", value, flags=re.IGNORECASE)


def normalized_title(title: str) -> str:
    lowered = title.casefold()
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return " ".join(lowered.split())


def title_hash(title: str) -> str:
    return hashlib.sha1(normalized_title(title).encode("utf-8")).hexdigest()


def parse_dt(raw: str) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def build_query_url(search_query: str, max_results: int) -> str:
    params = {
        "search_query": search_query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    }
    return f"{ARXIV_API_URL}?{urllib.parse.urlencode(params)}"


def fetch_bytes(url: str, attempts: int = 3) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "robot-rl-posttraining-watch/1.1 "
                "(github.com/yangfeiyang-123/arxiv_daily_update)"
            ),
            "Accept": "application/atom+xml",
        },
    )
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            last_error = exc
            if attempt < attempts:
                time.sleep(4 * attempt)
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def parse_feed(xml_bytes: bytes) -> list[Paper]:
    root = ET.fromstring(xml_bytes)
    papers: list[Paper] = []
    for entry in root.findall("atom:entry", NAMESPACES):
        raw_id = text_or_empty(entry.find("atom:id", NAMESPACES))
        arxiv_id = canonical_arxiv_id(raw_id)
        if not arxiv_id:
            continue

        links = entry.findall("atom:link", NAMESPACES)
        abs_url = raw_id or f"https://arxiv.org/abs/{arxiv_id}"
        pdf_url = f"https://arxiv.org/pdf/{arxiv_id}"
        for link in links:
            href = link.attrib.get("href", "")
            rel = link.attrib.get("rel", "")
            link_title = link.attrib.get("title", "")
            if rel == "alternate" and href:
                abs_url = href
            if link_title == "pdf" and href:
                pdf_url = href

        authors = tuple(
            text_or_empty(author.find("atom:name", NAMESPACES))
            for author in entry.findall("atom:author", NAMESPACES)
            if text_or_empty(author.find("atom:name", NAMESPACES))
        )
        categories = tuple(
            category.attrib.get("term", "")
            for category in entry.findall("atom:category", NAMESPACES)
            if category.attrib.get("term", "")
        )

        papers.append(
            Paper(
                arxiv_id=arxiv_id,
                title=text_or_empty(entry.find("atom:title", NAMESPACES)),
                summary=text_or_empty(entry.find("atom:summary", NAMESPACES)),
                authors=authors,
                published=text_or_empty(entry.find("atom:published", NAMESPACES)),
                updated=text_or_empty(entry.find("atom:updated", NAMESPACES)),
                categories=categories,
                abs_url=abs_url,
                pdf_url=pdf_url,
            )
        )
    return papers


def matches_term(text: str, term: str) -> bool:
    """Match phrases by substring and short acronyms by token boundary."""
    text_cf = text.casefold()
    term_cf = term.casefold()
    if term_cf in TOKEN_TERMS:
        return bool(
            re.search(
                rf"(?<![a-z0-9]){re.escape(term_cf)}(?![a-z0-9])",
                text_cf,
            )
        )
    return term_cf in text_cf


def contains_any(text: str, terms: Iterable[str]) -> bool:
    return any(matches_term(text, term) for term in terms)


def infer_tags(title: str, summary: str) -> tuple[str, ...]:
    text = f"{title} {summary}".casefold()
    tags: list[str] = []

    tag_rules: tuple[tuple[str, tuple[str, ...]], ...] = (
        ("VLA-RL", ("vision-language-action", "vla", "openvla", "pi0", "π0")),
        (
            "Diffusion/Flow",
            ("diffusion policy", "flow policy", "flow-matching", "flow matching"),
        ),
        (
            "Offline-to-Online",
            ("offline-to-online", "offline to online", "offline rl", "online rl"),
        ),
        (
            "Residual/Latent",
            ("residual", "latent steering", "latent reinforcement", "bottleneck latent"),
        ),
        (
            "World Model",
            ("world model", "digital twin", "imagined rollout", "synthetic transition"),
        ),
        ("Real Robot", ("real-world", "real robot", "physical robot", "on-robot")),
        (
            "Human-in-the-Loop",
            ("human-in-the-loop", "human intervention", "teleoperation"),
        ),
        ("Value/Critic", ("critic", "q-learning", "value estimator", "value function")),
        (
            "Safety/Recovery",
            ("safety", "failure-aware", "recovery policy", "intervention-requiring"),
        ),
        (
            "Continual Learning",
            ("continual", "catastrophic forgetting", "stability and plasticity"),
        ),
        (
            "Deployment/Distill",
            ("distillation", "one-step", "latency", "high-frequency control"),
        ),
        ("Contact-rich", ("contact-rich", "tactile", "force/torque", "dexterous")),
    )

    for tag, terms in tag_rules:
        if any(matches_term(text, term) for term in terms):
            tags.append(tag)
    return tuple(tags)


def relevance_score(paper: Paper) -> tuple[int, tuple[str, ...]]:
    title = paper.title.casefold()
    summary = paper.summary.casefold()
    text = f"{title} {summary}"

    # High-precision semantic gate: robotics + RL + manipulation/policy context.
    if not contains_any(text, ROBOT_TERMS):
        return 0, ()
    if not contains_any(text, RL_TERMS):
        return 0, ()
    if not contains_any(text, MANIPULATION_TERMS):
        return 0, ()

    # Remove navigation-only work unless manipulation is explicitly central.
    if contains_any(title, NAVIGATION_ONLY_TERMS) and not matches_term(title, "manipulation"):
        return 0, ()

    score = 0
    for term, weight in TITLE_WEIGHTS:
        if matches_term(title, term):
            score += weight
    for term, weight in ABSTRACT_WEIGHTS:
        if matches_term(summary, term):
            score += weight

    # Extra confidence for the combinations that define this watch.
    if matches_term(title, "manipulation") and matches_term(text, "reinforcement learning"):
        score += 3
    if matches_term(text, "vision-language-action") and matches_term(
        text, "reinforcement learning"
    ):
        score += 3
    if contains_any(
        text, ("diffusion policy", "flow policy", "flow-matching", "flow matching")
    ) and contains_any(text, RL_TERMS):
        score += 3
    if contains_any(text, ("real-world", "real robot", "physical robot", "on-robot")):
        score += 2

    tags = infer_tags(title, summary)
    return score, tags


def load_state(path: Path) -> dict:
    if not path.exists():
        return {
            "schema_version": 1,
            "seen_arxiv_ids": [],
            "seen_title_hashes": [],
        }
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read state file {path}: {exc}") from exc
    if not isinstance(payload, dict):
        raise RuntimeError(f"State file {path} must contain a JSON object")
    payload.setdefault("schema_version", 1)
    payload.setdefault("seen_arxiv_ids", [])
    payload.setdefault("seen_title_hashes", [])
    return payload


def write_state(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def truncate(text: str, limit: int = 850) -> str:
    text = collapse_ws(text)
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "…"


def why_relevant(tags: tuple[str, ...]) -> str:
    explanations = {
        "VLA-RL": "直接研究 VLA 的强化学习后训练",
        "Diffusion/Flow": "面向 diffusion/flow 生成式动作策略",
        "Offline-to-Online": "覆盖 offline→online 数据与训练闭环",
        "Residual/Latent": "采用冻结基座后的残差或潜空间适配",
        "World Model": "用 world model / digital twin 扩充或约束 RL 交互",
        "Real Robot": "包含真实机器人训练或部署证据",
        "Human-in-the-Loop": "关注人类介入与真实世界样本效率",
        "Value/Critic": "改进 value/critic 以稳定策略优化",
        "Safety/Recovery": "处理探索安全、失败检测或恢复",
        "Continual Learning": "研究多技能持续学习与防遗忘",
        "Deployment/Distill": "关注单步蒸馏、时延或高频控制",
        "Contact-rich": "与接触丰富、触觉/力觉或灵巧操作相关",
    }
    selected = [explanations[tag] for tag in tags if tag in explanations]
    return "；".join(selected[:4]) or "与机器人操作策略的 RL 后训练直接相关"


def report_marker(papers: list[Paper]) -> str:
    payload = ",".join(sorted(paper.arxiv_id for paper in papers))
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]
    return f"<!-- robot-rl-watch:{digest} -->"


def render_report(
    papers: list[Paper],
    local_now: datetime,
    lookback_days: int,
    threshold: int,
    partial_failures: list[str],
) -> str:
    date_text = local_now.strftime("%Y-%m-%d")
    lines = [
        report_marker(papers),
        f"# 机器人操作 RL Post-Training 每日新文 — {date_text}",
        "",
        (
            f"本次发现 **{len(papers)}** 篇从未推送过的高相关论文。"
            f"检索最近 {lookback_days} 天的 arXiv，最低相关性阈值为 {threshold}；"
            "按 canonical arXiv ID（去掉版本号）与规范化标题永久去重。"
        ),
        "",
    ]
    if partial_failures:
        lines.extend(
            [
                (
                    "> 部分补充检索暂时失败，但核心 `cs.RO latest` 检索成功："
                    + "；".join(partial_failures)
                ),
                "",
            ]
        )

    for index, paper in enumerate(papers, start=1):
        published = parse_dt(paper.published)
        published_text = (
            published.strftime("%Y-%m-%d") if published else paper.published
        )
        author_text = ", ".join(paper.authors[:8])
        if len(paper.authors) > 8:
            author_text += f", et al.（共 {len(paper.authors)} 位）"
        tags = " · ".join(paper.tags) if paper.tags else "Robot RL"
        lines.extend(
            [
                f"## {index}. {paper.title}",
                "",
                f"- **arXiv**：[{paper.arxiv_id}]({paper.abs_url}) · [PDF]({paper.pdf_url})",
                f"- **提交日期**：{published_text}",
                f"- **作者**：{author_text}",
                f"- **类别**：{', '.join(paper.categories)}",
                f"- **标签**：{tags}",
                f"- **相关性分数**：{paper.score}",
                f"- **为什么值得看**：{why_relevant(paper.tags)}",
                "",
                f"> {truncate(paper.summary)}",
                "",
            ]
        )

    lines.extend(
        [
            "---",
            (
                "该报告由 GitHub Actions 自动生成；已经出现过的论文不会再次推送。"
                "arXiv 修订版本默认视为同一篇论文。"
            ),
            "",
        ]
    )
    return "\n".join(lines)


def set_github_output(name: str, value: str) -> None:
    output_file = os.environ.get("GITHUB_OUTPUT")
    if not output_file:
        return
    with open(output_file, "a", encoding="utf-8") as handle:
        handle.write(f"{name}={value}\n")


def main() -> int:
    args = parse_args()
    if args.lookback_days < 1 or args.threshold < 1 or args.max_new < 1:
        print(
            "lookback-days, threshold, and max-new must be positive",
            file=sys.stderr,
        )
        return 2
    if args.request_interval < 0:
        print("request-interval must be non-negative", file=sys.stderr)
        return 2

    try:
        local_tz = ZoneInfo(args.timezone)
    except Exception as exc:  # pragma: no cover
        print(f"Invalid timezone {args.timezone}: {exc}", file=sys.stderr)
        return 2

    now_utc = datetime.now(timezone.utc)
    cutoff = now_utc - timedelta(days=args.lookback_days)

    papers_by_id: dict[str, Paper] = {}
    partial_failures: list[str] = []
    core_query_succeeded = False

    for index, (label, query, max_results) in enumerate(QUERY_SPECS):
        try:
            xml_bytes = fetch_bytes(build_query_url(query, max_results))
            fetched = parse_feed(xml_bytes)
            if index == 0:
                core_query_succeeded = True
            for paper in fetched:
                published = parse_dt(paper.published)
                if published is not None and published < cutoff:
                    continue
                papers_by_id.setdefault(paper.arxiv_id, paper)
            print(
                f"[{label}] fetched={len(fetched)} "
                f"retained_total={len(papers_by_id)}"
            )
        except (RuntimeError, ET.ParseError) as exc:
            message = f"{label}: {exc}"
            if index == 0:
                print(f"Core query failed: {message}", file=sys.stderr)
            else:
                partial_failures.append(message)
                print(f"Supplementary query failed: {message}", file=sys.stderr)
        if index + 1 < len(QUERY_SPECS) and args.request_interval > 0:
            time.sleep(args.request_interval)

    if not core_query_succeeded:
        print(
            "The core cs.RO query failed; refusing to emit a possibly incomplete "
            "daily result.",
            file=sys.stderr,
        )
        return 1

    state = load_state(args.state)
    seen_ids = {str(item) for item in state.get("seen_arxiv_ids", [])}
    seen_hashes = {str(item) for item in state.get("seen_title_hashes", [])}

    relevant: list[Paper] = []
    for paper in papers_by_id.values():
        score, tags = relevance_score(paper)
        if score < args.threshold:
            continue
        relevant.append(
            Paper(
                arxiv_id=paper.arxiv_id,
                title=paper.title,
                summary=paper.summary,
                authors=paper.authors,
                published=paper.published,
                updated=paper.updated,
                categories=paper.categories,
                abs_url=paper.abs_url,
                pdf_url=paper.pdf_url,
                score=score,
                tags=tags,
            )
        )

    unseen = [
        paper
        for paper in relevant
        if paper.arxiv_id not in seen_ids
        and title_hash(paper.title) not in seen_hashes
    ]
    unseen.sort(
        key=lambda paper: (
            parse_dt(paper.published)
            or datetime.min.replace(tzinfo=timezone.utc),
            paper.score,
        ),
        reverse=True,
    )
    selected = unseen[: args.max_new]

    set_github_output("new_count", str(len(selected)))
    if not selected:
        set_github_output("report_path", "")
        print(
            "No unseen paper passed the threshold. "
            f"candidates={len(papers_by_id)} relevant={len(relevant)}"
        )
        return 0

    local_now = now_utc.astimezone(local_tz)
    report_path = args.output_dir / f"{local_now.strftime('%Y-%m-%d_%H%M%S')}.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(
        render_report(
            papers=selected,
            local_now=local_now,
            lookback_days=args.lookback_days,
            threshold=args.threshold,
            partial_failures=partial_failures,
        ),
        encoding="utf-8",
    )

    for paper in selected:
        seen_ids.add(paper.arxiv_id)
        seen_hashes.add(title_hash(paper.title))

    state["seen_arxiv_ids"] = sorted(seen_ids)
    state["seen_title_hashes"] = sorted(seen_hashes)
    state["last_report_at"] = local_now.isoformat()
    state["last_report_path"] = report_path.as_posix()
    state["last_new_count"] = len(selected)
    write_state(args.state, state)

    set_github_output("report_path", report_path.as_posix())
    print(
        f"Wrote {report_path} with {len(selected)} new papers "
        f"(unseen_total={len(unseen)}, relevant={len(relevant)})."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
