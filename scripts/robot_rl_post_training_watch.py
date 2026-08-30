#!/usr/bin/env python3
"""Daily, permanently deduplicated watch for robot manipulation RL post-training."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

ARXIV_RE = re.compile(r"(?<!\d)(\d{4}\.\d{4,5})(?:v\d+)?(?!\d)", re.I)
SPACE_RE = re.compile(r"\s+")
TITLE_RL_RE = re.compile(
    r"(?:\breinforcement learning\b|\boffline rl\b|\bonline rl\b|\brl\b|"
    r"q-learning|policy optimization|post-training|fine-tun)",
    re.I,
)
# Same-sentence claim avoids false positives such as "we propose a VLA. Existing RL...".
METHOD_RL_RE = re.compile(
    r"(?:\bwe\b|\bthis work\b|\bour (?:method|framework|approach|algorithm)\b)"
    r"[^.!?]{0,180}(?:reinforcement learning|offline rl|online rl|policy gradient|"
    r"actor-critic|q-learning|ppo|grpo)",
    re.I,
)

ROBOT = {
    "robot": 2.0,
    "robotic": 2.0,
    "manipulation": 2.0,
    "visuomotor": 3.0,
    "vision-language-action": 4.0,
    "vision language action": 4.0,
    "vla": 3.0,
    "dexterous": 2.0,
    "loco-manipulation": 3.0,
    "loco manipulation": 3.0,
    "embodied agent": 2.0,
}
RL = {
    "reinforcement learning": 6.0,
    "offline rl": 5.0,
    "online rl": 5.0,
    "real-world rl": 5.0,
    "real world rl": 5.0,
    "policy gradient": 4.0,
    "actor-critic": 4.0,
    "actor critic": 4.0,
    "q-learning": 4.0,
    "q learning": 4.0,
    "ppo": 3.0,
    "grpo": 3.0,
    "advantage-weighted": 3.0,
    "advantage weighted": 3.0,
    "reward model": 3.0,
    "value function": 2.0,
    "critic model": 2.0,
}
SPECIFIC_RL = {
    "offline rl": 3.0,
    "online rl": 3.0,
    "real-world rl": 3.0,
    "real world rl": 3.0,
    "policy gradient": 3.0,
    "actor-critic": 3.0,
    "actor critic": 3.0,
    "q-learning": 3.0,
    "q learning": 3.0,
    "ppo": 2.5,
    "grpo": 2.5,
    "advantage-weighted": 2.5,
    "advantage weighted": 2.5,
}
POST = {
    "post-training": 5.0,
    "post training": 5.0,
    "fine-tuning": 4.0,
    "fine tuning": 4.0,
    "finetuning": 4.0,
    "policy refinement": 4.0,
    "policy adaptation": 3.0,
    "self-improving": 3.0,
    "self improving": 3.0,
    "policy improvement": 3.0,
}
GENERATIVE = {
    "diffusion policy": 4.0,
    "flow policy": 4.0,
    "flow-based": 3.0,
    "flow based": 3.0,
    "flow-matching": 4.0,
    "flow matching": 4.0,
    "normalizing flow": 3.0,
    "generative policy": 3.0,
    "action chunk": 2.0,
    "behavior cloning": 1.5,
    "behaviour cloning": 1.5,
    "imitation learning": 1.5,
}
ADAPT = {
    "residual policy": 3.0,
    "residual rl": 3.0,
    "latent space": 2.5,
    "noise space": 2.5,
    "human-in-the-loop": 3.0,
    "human in the loop": 3.0,
    "human intervention": 2.5,
    "world model": 3.0,
    "digital twin": 3.0,
    "distillation": 2.5,
    "one-step": 2.0,
    "one step": 2.0,
    "reward shaping": 2.0,
    "success detector": 2.0,
    "prompt space": 2.0,
    "semantic action": 2.0,
}
DEPLOY = {
    "real-world": 2.5,
    "real world": 2.5,
    "real robot": 2.5,
    "sample-efficient": 2.0,
    "sample efficient": 2.0,
    "long-horizon": 1.5,
    "long horizon": 1.5,
    "high-frequency": 1.0,
    "high frequency": 1.0,
    "deployment": 1.0,
}
NEGATIVE = {
    "autonomous driving": 8.0,
    "language model reasoning": 6.0,
    "multi-agent": 4.0,
    "multi agent": 4.0,
    "wireless network": 6.0,
    "medical diagnosis": 6.0,
    "navigation": 2.5,
    "path planning": 2.0,
    "drone": 3.0,
    "uav": 3.0,
}
TITLE_MULTIPLIER = 2.2


@dataclass(frozen=True)
class Paper:
    raw: dict[str, Any]
    arxiv_id: str
    title_hash: str
    score: float
    tags: tuple[str, ...]
    relation: str
    published: datetime

    @property
    def title(self) -> str:
        return clean(str(self.raw.get("title", "")))


def clean(value: str) -> str:
    return SPACE_RE.sub(" ", value).strip()


def normalize_title(title: str) -> str:
    value = unicodedata.normalize("NFKC", clean(title)).casefold()
    return SPACE_RE.sub(" ", re.sub(r"[^\w]+", " ", value)).strip()


def title_hash(title: str) -> str:
    return hashlib.sha1(normalize_title(title).encode()).hexdigest()


def canonical_id(raw: dict[str, Any]) -> str:
    for key in ("id", "arxiv_id", "pdf_url"):
        match = ARXIV_RE.search(str(raw.get(key, "")))
        if match:
            return match.group(1)
    return "title:" + title_hash(str(raw.get("title", "")))


def parse_time(value: Any) -> datetime:
    try:
        result = datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except ValueError:
        return datetime.min.replace(tzinfo=timezone.utc)
    if result.tzinfo is None:
        result = result.replace(tzinfo=timezone.utc)
    return result.astimezone(timezone.utc)


def phrase_score(text: str, terms: dict[str, float]) -> float:
    return sum(weight for phrase, weight in terms.items() if phrase in text)


def weighted(title: str, abstract: str, terms: dict[str, float]) -> float:
    return TITLE_MULTIPLIER * phrase_score(title, terms) + phrase_score(abstract, terms)


def tags_for(text: str) -> tuple[str, ...]:
    tags: list[str] = []

    def add(name: str, condition: bool) -> None:
        if condition and name not in tags:
            tags.append(name)

    add("VLA", "vision-language-action" in text or "vision language action" in text or bool(re.search(r"\bvla\b", text)))
    add("Diffusion", "diffusion" in text)
    add("Flow", any(x in text for x in ("flow-matching", "flow matching", "flow-based", "flow based")))
    add("Normalizing Flow", "normalizing flow" in text)
    add("Offline RL", "offline rl" in text or "offline reinforcement learning" in text)
    add("Online RL", any(x in text for x in ("online rl", "online reinforcement learning", "on-policy", "on policy")))
    add("Real Robot", any(x in text for x in ("real-world", "real world", "real robot")))
    add("World Model", "world model" in text or "digital twin" in text)
    add("Human-in-the-loop", any(x in text for x in ("human-in-the-loop", "human in the loop", "human intervention")))
    add("Residual", "residual" in text)
    add("Latent Steering", "latent space" in text or "noise space" in text)
    add("Distillation", any(x in text for x in ("distillation", "one-step", "one step")))
    add("Reward/Value", any(x in text for x in ("reward model", "process reward", "success detector", "dense reward")))
    add("Action Chunking", "action chunk" in text)
    add("GRPO", "grpo" in text)
    add("PPO", "ppo" in text and "grpo" not in text)
    add("Hierarchy", "hierarchical" in text or "subgoal" in text)
    add("Semantic Control", "semantic" in text or "prompt space" in text)
    return tuple(tags[:8])


def relation(tags: Iterable[str], text: str) -> str:
    tag_set = set(tags)
    dice = bool(tag_set & {"Residual", "Latent Steering"}) or "frozen" in text
    rl100 = {"Offline RL", "Online RL"}.issubset(tag_set) or "data flywheel" in text or "iterative offline" in text
    if dice and rl100:
        return "同时贴近 DICE 的受约束轻量纠偏与 RL-100 的离线→在线部署链路。"
    if "World Model" in tag_set:
        return "用世界模型/数字孪生减少真实 rollout，缓解 DICE 与 RL-100 的真实交互成本。"
    if "Reward/Value" in tag_set:
        return "补齐真实机器人 RL 的奖励与价值评估层，可作为 DICE/RL-100 的上游反馈模块。"
    if dice:
        return "更接近 DICE：冻结或锚定行为先验，只在残差/潜变量小空间内做可控改进。"
    if rl100:
        return "更接近 RL-100：强调离线到在线的数据闭环与最终可部署策略。"
    if "VLA" in tag_set and tag_set & {"GRPO", "PPO", "Online RL"}:
        return "把 PPO/GRPO 式优化扩展到 flow/VLA，是 DICE/RL-100 向通用机器人模型延伸的主线。"
    if "Offline RL" in tag_set:
        return "属于无额外真实交互的策略提升分支，可作为在线 RL 前的保守初始化。"
    return "属于机器人策略后训练的相邻方向，重点在更稳的探索、适配或部署。"


def score_paper(raw: dict[str, Any], minimum: float) -> tuple[float, tuple[str, ...], str] | None:
    title = clean(str(raw.get("title", ""))).casefold()
    abstract = clean(str(raw.get("summary", raw.get("abstract", "")))).casefold()
    text = title + " " + abstract
    robot = weighted(title, abstract, ROBOT)
    rl = weighted(title, abstract, RL)
    post = weighted(title, abstract, POST)
    generative = weighted(title, abstract, GENERATIVE)
    adapt = weighted(title, abstract, ADAPT)
    deploy = weighted(title, abstract, DEPLOY)
    specific_rl = weighted(title, abstract, SPECIFIC_RL)

    claimed_rl = bool(TITLE_RL_RE.search(title) or METHOD_RL_RE.search(text))
    direct = robot >= 2 and rl >= 5 and (claimed_rl or specific_rl >= 3)
    adjacent = robot >= 3 and post >= 4 and (generative >= 3 or adapt >= 3)
    feedback = (
        robot >= 3
        and any(x in text for x in ("reward model", "process reward", "world model", "digital twin", "human intervention", "human-in-the-loop"))
        and any(x in text for x in ("reinforcement learning", "post-training", "fine-tuning", "finetuning"))
    )
    if not (direct or adjacent or feedback):
        return None
    if "manipulation" not in text and "visuomotor" not in text and not re.search(r"\bvla\b", text):
        if any(x in text for x in ("navigation", "path planning", "drone", "uav")):
            return None

    total = robot + rl + post + 0.8 * generative + 0.8 * adapt + 0.5 * deploy - phrase_score(text, NEGATIVE)
    if total < minimum:
        return None
    labels = tags_for(text)
    return total, labels, relation(labels, text)


def papers_in(payload: Any) -> Iterable[dict[str, Any]]:
    if isinstance(payload, list):
        yield from (x for x in payload if isinstance(x, dict))
        return
    if not isinstance(payload, dict):
        raise ValueError("feed must be a JSON object or list")
    if isinstance(payload.get("fields"), list):
        for field in payload["fields"]:
            if isinstance(field, dict) and isinstance(field.get("papers"), list):
                yield from (x for x in field["papers"] if isinstance(x, dict))
        return
    if isinstance(payload.get("papers"), list):
        yield from (x for x in payload["papers"] if isinstance(x, dict))
        return
    raise ValueError("feed contains neither fields[].papers nor papers")


def compact(text: str, limit: int = 650) -> str:
    value = clean(text)
    if len(value) <= limit:
        return value
    return value[: limit - 1].rsplit(" ", 1)[0].rstrip(".,;:") + "…"


def paper_links(paper: Paper) -> str:
    if ARXIV_RE.fullmatch(paper.arxiv_id):
        return f"[arXiv](https://arxiv.org/abs/{paper.arxiv_id}) · [PDF](https://arxiv.org/pdf/{paper.arxiv_id})"
    links = [str(paper.raw.get("id", "")).strip(), str(paper.raw.get("pdf_url", "")).strip()]
    return " · ".join(x for x in links if x) or "未提供"


def make_report(papers: list[Paper], now: datetime) -> str:
    marker = ",".join(sorted(p.arxiv_id for p in papers))
    lines = [
        f"<!-- robot-rl-watch:{marker} -->",
        f"# Robot Manipulation RL Post-Training Daily Watch — {now.date().isoformat()}",
        "",
        f"本次发现 **{len(papers)}** 篇此前未推送、且与 DICE / RL-100 主线高度相关的新论文。",
        "",
        "> 去重：canonical arXiv ID（忽略版本号）+ 规范化标题 SHA-1；无新论文时不发消息。",
        "",
    ]
    for index, paper in enumerate(papers, 1):
        authors = paper.raw.get("authors", [])
        if isinstance(authors, list):
            author_text = ", ".join(clean(str(x)) for x in authors if clean(str(x)))
        else:
            author_text = clean(str(authors))
        abstract = compact(str(paper.raw.get("summary", paper.raw.get("abstract", ""))))
        lines += [
            f"## {index}. {paper.title.replace('|', '\\|')}",
            "",
            f"- **发布日期**：{paper.published.date().isoformat()} · **相关性分数**：{paper.score:.1f}",
            f"- **标签**：{' / '.join(paper.tags) or 'Robot RL Post-Training'}",
            f"- **作者**：{author_text.replace('|', '\\|') or '未提供'}",
            f"- **链接**：{paper_links(paper)}",
            f"- **与 DICE / RL-100 的关系**：{paper.relation}",
            f"- **摘要摘录**：{abstract.replace('|', '\\|') or '未提供'}",
            "",
        ]
    lines += [
        "---",
        "监控范围：机器人操作 RL post-training、diffusion/flow/VLA offline-to-online RL、残差/潜变量纠偏、奖励/价值模型、世界模型、human-in-the-loop、策略蒸馏与真实机器人部署。",
        "",
    ]
    return "\n".join(lines)


def github_outputs(count: int, report: str, changed: bool) -> None:
    path = os.environ.get("GITHUB_OUTPUT")
    if not path:
        return
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(f"new_count={count}\nreport_path={report}\nstate_changed={'true' if changed else 'false'}\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("data/latest_cs_daily.json"))
    parser.add_argument("--state", type=Path, default=Path("data/robot_rl_watch_seen.json"))
    parser.add_argument("--report-dir", type=Path, default=Path("outputs/robot_rl_watch"))
    parser.add_argument("--min-score", type=float, default=13.0)
    parser.add_argument("--max-papers", type=int, default=20)
    parser.add_argument("--include-backlog", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.max_papers < 1:
        print("--max-papers must be >= 1", file=sys.stderr)
        return 2
    try:
        payload = json.loads(args.input.read_text(encoding="utf-8"))
        state = json.loads(args.state.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"watch input/state error: {exc}", file=sys.stderr)
        return 1

    state.setdefault("watch_started_at", datetime.now(timezone.utc).isoformat())
    state.setdefault("seen_arxiv_ids", {})
    state.setdefault("seen_title_hashes", {})
    started = parse_time(state["watch_started_at"])
    candidates: dict[str, Paper] = {}
    for raw in papers_in(payload):
        title = clean(str(raw.get("title", "")))
        if not title:
            continue
        aid, digest = canonical_id(raw), title_hash(title)
        if aid in state["seen_arxiv_ids"] or digest in state["seen_title_hashes"]:
            continue
        published = parse_time(raw.get("published"))
        if not args.include_backlog and published < started:
            continue
        scored = score_paper(raw, args.min_score)
        if scored is None:
            continue
        score, labels, why = scored
        candidate = Paper(raw, aid, digest, score, labels, why, published)
        if aid not in candidates or score > candidates[aid].score:
            candidates[aid] = candidate

    selected = sorted(candidates.values(), key=lambda x: (x.published, x.score), reverse=True)[: args.max_papers]
    if not selected:
        print("No new relevant papers.")
        github_outputs(0, "", False)
        return 0

    now = datetime.now(timezone.utc)
    args.report_dir.mkdir(parents=True, exist_ok=True)
    report_path = args.report_dir / f"{now.date().isoformat()}.md"
    report = make_report(selected, now)
    report_path.write_text(report, encoding="utf-8")
    (args.report_dir / "latest.md").write_text(report, encoding="utf-8")

    if not args.dry_run:
        stamp = now.isoformat()
        for paper in selected:
            state["seen_arxiv_ids"][paper.arxiv_id] = {
                "title": paper.title,
                "first_reported_at": stamp,
                "published": paper.published.isoformat(),
            }
            state["seen_title_hashes"][paper.title_hash] = {"title": paper.title, "arxiv_id": paper.arxiv_id}
        state["last_reported_at"] = stamp
        state["last_report_count"] = len(selected)
        temporary = args.state.with_suffix(args.state.suffix + ".tmp")
        temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(args.state)

    print(f"Found {len(selected)} new relevant paper(s); report: {report_path}")
    github_outputs(len(selected), str(report_path), not args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
