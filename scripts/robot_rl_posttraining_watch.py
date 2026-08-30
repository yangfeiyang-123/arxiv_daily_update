#!/usr/bin/env python3
"""Daily, deduplicated arXiv watch for robot-manipulation RL post-training."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

API = "https://export.arxiv.org/api/query"
NS = {"a": "http://www.w3.org/2005/Atom", "x": "http://arxiv.org/schemas/atom"}
TZ = ZoneInfo("America/Los_Angeles")
UA = "robot-rl-watch/1.0 (github.com/yangfeiyang-123/arxiv_daily_update)"

QUERIES = {
    "robot-rl-posttraining":
        '(cat:cs.RO OR cat:cs.AI OR cat:cs.LG) AND '
        '(all:"reinforcement learning" OR all:"policy optimization" OR all:"policy gradient") AND '
        '(all:robot OR all:robotic OR all:manipulation OR all:visuomotor) AND '
        '(all:"post-training" OR all:"fine-tuning" OR all:finetuning OR all:refinement OR all:pretrained)',
    "generative-policy-rl":
        '(cat:cs.RO OR cat:cs.AI OR cat:cs.LG) AND '
        '(all:diffusion OR all:"flow matching" OR all:"flow-matching" OR all:denoising OR all:MeanFlow) AND '
        '(all:policy OR all:policies) AND '
        '(all:"reinforcement learning" OR all:PPO OR all:GRPO OR all:"Q-learning")',
    "vla-rl":
        '(cat:cs.RO OR cat:cs.AI OR cat:cs.LG) AND '
        '(all:"vision-language-action" OR all:"vision language action" OR all:VLA) AND '
        '(all:"reinforcement learning" OR all:"post-training" OR all:"preference optimization" OR all:critic OR all:"world model")',
    "residual-offline-online":
        '(cat:cs.RO OR cat:cs.AI OR cat:cs.LG) AND '
        '(all:"real-world reinforcement learning" OR all:"offline-to-online" OR '
        'all:"residual reinforcement learning" OR all:"residual policy" OR all:"latent space reinforcement learning")',
    "world-model-hitl":
        '(cat:cs.RO OR cat:cs.AI OR cat:cs.LG) AND '
        '(all:robot OR all:robotic OR all:manipulation OR all:visuomotor) AND '
        '(all:"world model" OR all:preference OR all:intervention OR all:"human-in-the-loop" OR all:corrective) AND '
        '(all:"post-training" OR all:"fine-tuning" OR all:"reinforcement learning" OR all:refinement)',
}

GROUPS = {
    "robot": ("robot", "robotic", "manipulation", "visuomotor", "dexterous", "loco-manipulation", "embodied agent"),
    "rl": ("rl", "reinforcement learning", "policy optimization", "policy gradient", "actor-critic", "q-learning", "ppo", "grpo"),
    "post": ("post-training", "post training", "fine-tuning", "finetuning", "refinement", "pretrained policy", "behavior cloning", "imitation learning", "offline-to-online"),
    "gen": ("diffusion", "flow matching", "flow-matching", "generative policy", "denoising", "meanflow", "action chunk"),
    "vla": ("vision-language-action", "vision language action", "vla", "pi0", "pi_0", "π0"),
    "residual": ("residual", "steering", "frozen", "adapter"),
    "world": ("world model", "predictive model", "imagined rollout", "imagination"),
    "pref": ("preference optimization", "preference learning", "human-in-the-loop", "human intervention", "intervention", "rollback", "corrective", "reward model", "critic model"),
    "real": ("real-world", "real world", "real robot", "physical robot", "deployment"),
    "fast": ("one-step", "one step", "distillation", "distill", "consistency model", "latency", "high-frequency", "real-time"),
    "contact": ("tactile", "force feedback", "contact-rich", "assembly", "bimanual", "dexterous"),
}
SHORT = {"rl", "ppo", "grpo", "vla", "pi0", "pi_0", "π0"}
EXCLUDE = ("autonomous driving", "text-to-image", "image generation", "molecular", "wireless network", "financial market")


def args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--state", type=Path, default=Path("data/robot_rl_watch_state.json"))
    p.add_argument("--report-dir", type=Path, default=Path("outputs/robot_rl_watch"))
    p.add_argument("--latest-report", type=Path, default=Path("data/robot_rl_watch_latest.md"))
    p.add_argument("--lookback-days", type=int, default=21)
    p.add_argument("--min-score", type=int, default=10)
    p.add_argument("--max-results", type=int, default=200)
    p.add_argument("--request-interval", type=float, default=3.0)
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args()


def clean(s: str | None) -> str:
    return " ".join(html.unescape(s or "").split())


def text(e: ET.Element, path: str) -> str:
    n = e.find(path, NS)
    return clean(n.text if n is not None else "")


def dt(s: str) -> datetime:
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)


def hit(s: str, term: str) -> bool:
    s, term = s.lower(), term.lower()
    if term in SHORT:
        return re.search(rf"(?<![a-z0-9_]){re.escape(term)}(?![a-z0-9_])", s) is not None
    return term in s


def any_hit(s: str, group: str) -> bool:
    return any(hit(s, t) for t in GROUPS[group])


def title_hash(title: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
    return hashlib.sha1(normalized.encode()).hexdigest()


def canonical(raw: str) -> str:
    return re.sub(r"v\d+$", "", raw.rstrip("/").rsplit("/", 1)[-1], flags=re.I)


def fetch(query: str, max_results: int) -> bytes:
    url = API + "?" + urllib.parse.urlencode({
        "search_query": query, "start": 0, "max_results": max_results,
        "sortBy": "submittedDate", "sortOrder": "descending",
    })
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/atom+xml"})
    last = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read()
        except Exception as exc:  # network/API failures are retried, then surfaced
            last = exc
            if attempt < 2:
                time.sleep(2 ** (attempt + 1))
    raise RuntimeError(f"arXiv request failed: {last}")


def parse_feed(payload: bytes, query_name: str) -> list[dict]:
    out = []
    root = ET.fromstring(payload)
    for e in root.findall("a:entry", NS):
        raw_id = text(e, "a:id")
        paper_id = canonical(raw_id)
        if not paper_id:
            continue
        links = {n.attrib.get("title") or n.attrib.get("rel"): n.attrib.get("href", "") for n in e.findall("a:link", NS)}
        primary = e.find("x:primary_category", NS)
        out.append({
            "id": paper_id,
            "title": text(e, "a:title"),
            "summary": text(e, "a:summary"),
            "authors": [text(a, "a:name") for a in e.findall("a:author", NS)],
            "published": dt(text(e, "a:published")),
            "updated": dt(text(e, "a:updated")),
            "abs_url": links.get("alternate") or raw_id,
            "pdf_url": links.get("pdf", ""),
            "primary": primary.attrib.get("term", "") if primary is not None else "",
            "categories": [c.attrib.get("term", "") for c in e.findall("a:category", NS)],
            "comment": text(e, "x:comment"),
            "journal_ref": text(e, "x:journal_ref"),
            "queries": [query_name],
        })
    return out


def score(p: dict) -> tuple[int, list[str], str]:
    title, body = p["title"].lower(), f'{p["title"]} {p["summary"]}'.lower()
    robot, rl, post = any_hit(body, "robot"), any_hit(body, "rl"), any_hit(body, "post")
    adjacent = any_hit(body, "world") or any_hit(body, "pref")
    policy = any(x in body for x in ("policy", "controller", "action generation", "manipulation", "visuomotor"))
    if not robot or not policy or (not rl and not (post and adjacent)):
        return 0, [], ""

    weights_title = {"robot": 5, "rl": 5, "post": 4, "gen": 4, "vla": 4, "world": 3, "pref": 3, "fast": 2}
    weights_body = {"robot": 3, "rl": 3, "post": 2, "gen": 2, "vla": 2, "world": 2, "pref": 2, "real": 1, "fast": 1, "contact": 1}
    value = sum(w for g, w in weights_title.items() if any_hit(title, g))
    value += sum(w for g, w in weights_body.items() if any_hit(body, g))
    value += 2 if p["primary"] == "cs.RO" or "cs.RO" in p["categories"] else 0
    value += 2 if "robot manipulation" in body or "robotic manipulation" in body else 0
    value -= 4 * sum(t in body for t in EXCLUDE)

    tags = []
    for condition, label in (
        (any_hit(body, "vla"), "VLA-RL"), (any_hit(body, "gen"), "Diffusion/Flow"),
        (any_hit(body, "residual"), "Residual/Steering"),
        ("offline-to-online" in body or "offline rl" in body or "online rl" in body, "Offline→Online"),
        (any_hit(body, "world"), "World Model"), (any_hit(body, "pref"), "Preference/HITL"),
        (any_hit(body, "real"), "Real Robot"), ("action chunk" in body, "Action Chunking"),
        (any_hit(body, "fast"), "Fast Deployment"), (any_hit(body, "contact"), "Contact-rich"),
        ("humanoid" in body, "Humanoid"),
    ):
        if condition:
            tags.append(label)
    tags = list(dict.fromkeys(tags or ["Robot RL"]))

    if any_hit(body, "world"):
        relation = "世界模型想象/打分/纠错路线：重点是减少真实机器人交互成本。"
    elif any_hit(body, "pref") and not rl:
        relation = "偏好或人工纠错路线：用比较信号替代显式奖励与在线 critic。"
    elif any_hit(body, "residual"):
        relation = "更接近 DICE：保留行为先验，只学习受约束的局部修正。"
    elif any(x in body for x in ("ppo", "policy gradient", "grpo", "denoising process")):
        relation = "更接近 RL-100/DPPO：直接对生成过程做近端策略梯度。"
    elif any_hit(body, "fast"):
        relation = "聚焦一步/少步部署，与 RL-100 的一致性蒸馏问题直接相关。"
    else:
        relation = "从模仿先验出发，用离线或在线反馈突破 BC 上限。"
    return value, tags, relation


def load_state(path: Path) -> dict:
    if path.exists():
        state = json.loads(path.read_text())
    else:
        state = {"schema_version": 1, "created_at": datetime.now(timezone.utc).isoformat()}
    state.setdefault("reported", {})
    state.setdefault("reported_title_hashes", {})
    return state


def output(values: dict) -> None:
    path = os.getenv("GITHUB_OUTPUT")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            for k, v in values.items():
                f.write(f"{k}={v}\n")


def clipped(s: str, n: int = 650) -> str:
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + "…"


def report(now: datetime, items: list[tuple], candidates: int, lookback: int) -> str:
    day = now.astimezone(TZ).strftime("%Y-%m-%d")
    lines = [f"## 机器人操作 RL Post-Training 每日新增｜{day}", "",
             f"检索窗口：最近 {lookback} 天；候选论文 {candidates} 篇。",
             "去重：canonical arXiv ID（忽略版本号）+ 规范化标题哈希。", ""]
    if not items:
        return "\n".join(lines + ["今天没有发现达到阈值且此前未推送的新论文。", ""])
    lines += [f"**发现 {len(items)} 篇此前未推送的新论文。**", ""]
    for i, (p, value, tags, relation) in enumerate(items, 1):
        authors = ", ".join(p["authors"][:8]) + (f", et al.（共 {len(p['authors'])} 位）" if len(p["authors"]) > 8 else "")
        links = f"[arXiv]({p['abs_url']})" + (f" · [PDF]({p['pdf_url']})" if p["pdf_url"] else "")
        lines += [f"### {i}. [{p['title']}]({p['abs_url']})", "",
                  f"- **作者**：{authors}",
                  f"- **提交时间**：{p['published'].date().isoformat()}；**相关性分数**：{value}",
                  f"- **标签**：{' · '.join(tags)}",
                  f"- **与 DICE / RL-100 的关系**：{relation}",
                  f"- **摘要摘录**：{clipped(p['summary'])}", f"- **链接**：{links}"]
        if p["comment"]:
            lines.append(f"- **论文备注**：{clipped(p['comment'], 260)}")
        if p["journal_ref"]:
            lines.append(f"- **发表信息**：{p['journal_ref']}")
        lines.append("")
    return "\n".join(lines + ["---", "仅在论文从未出现过时，工作流才会向监控 issue 推送。", ""])


def main() -> int:
    a = args()
    if a.lookback_days < 1 or a.max_results < 1 or a.request_interval < 0:
        raise SystemExit("invalid watcher arguments")
    now, papers, errors = datetime.now(timezone.utc), {}, []
    for i, (name, query) in enumerate(QUERIES.items()):
        try:
            rows = parse_feed(fetch(query, a.max_results), name)
            print(f"[{name}] {len(rows)} records")
            for p in rows:
                if p["id"] in papers:
                    papers[p["id"]]["queries"] = list(dict.fromkeys(papers[p["id"]]["queries"] + [name]))
                else:
                    papers[p["id"]] = p
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            print(f"::warning::{name}: {exc}")
        if i + 1 < len(QUERIES):
            time.sleep(a.request_interval)
    if not papers:
        raise SystemExit("all arXiv queries failed: " + "; ".join(errors))

    cutoff, state = now - timedelta(days=a.lookback_days), load_state(a.state)
    candidates = [p for p in papers.values() if p["published"] >= cutoff]
    unseen = []
    for p in candidates:
        value, tags, relation = score(p)
        key, th = "arxiv:" + p["id"], title_hash(p["title"])
        if value >= a.min_score and key not in state["reported"] and th not in state["reported_title_hashes"]:
            unseen.append((p, value, tags, relation))
    unseen.sort(key=lambda x: (x[0]["published"], x[1], x[0]["title"]), reverse=True)

    day = now.astimezone(TZ).strftime("%Y-%m-%d")
    body = report(now, unseen, len(candidates), a.lookback_days)
    a.latest_report.parent.mkdir(parents=True, exist_ok=True)
    a.latest_report.write_text(body, encoding="utf-8")
    dated = a.report_dir / f"{day}.md"
    if unseen:
        dated.parent.mkdir(parents=True, exist_ok=True)
        dated.write_text(body, encoding="utf-8")

    if not a.dry_run:
        stamp = now.isoformat()
        for p, value, tags, _ in unseen:
            key, th = "arxiv:" + p["id"], title_hash(p["title"])
            state["reported"][key] = {"title": p["title"], "reported_at": stamp, "published": p["published"].isoformat(), "score": value, "tags": tags}
            state["reported_title_hashes"][th] = {"title": p["title"], "reported_at": stamp, "arxiv_id": p["id"]}
        state.update({"last_checked_at": stamp, "last_new_count": len(unseen), "lookback_days": a.lookback_days,
                      "query_names": list(QUERIES), "last_query_errors": errors})
        a.state.parent.mkdir(parents=True, exist_ok=True)
        a.state.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    path = dated if unseen else a.latest_report
    output({"new_count": len(unseen), "report_path": path.as_posix(), "report_date": day, "candidate_count": len(candidates)})
    print(f"new={len(unseen)} candidates={len(candidates)} report={path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
