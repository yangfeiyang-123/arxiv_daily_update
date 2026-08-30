#!/usr/bin/env python3
"""Daily arXiv watch for robot-manipulation RL post-training."""
from __future__ import annotations

import argparse
import hashlib
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
QUERIES = {
    "robot_rl": 'cat:cs.RO AND (all:"reinforcement learning" OR all:"RL post-training" OR all:"offline-to-online")',
    "generative_rl": '(cat:cs.RO OR cat:cs.LG OR cat:cs.AI) AND (all:"diffusion policy" OR all:"flow policy" OR all:"flow-matching policy") AND (all:"reinforcement learning" OR all:"policy optimization" OR all:"Q-learning")',
    "vla_rl": '(cat:cs.RO OR cat:cs.AI OR cat:cs.LG) AND (all:"vision-language-action" OR all:VLA) AND (all:"reinforcement learning" OR all:"post-training")',
    "correction": 'cat:cs.RO AND (all:"residual reinforcement learning" OR all:"latent steering" OR all:"test-time guidance" OR all:"policy correction")',
    "contact_world": 'cat:cs.RO AND (all:tactile OR all:"contact-rich" OR all:dexterous OR all:"world model") AND (all:"reinforcement learning" OR all:"policy improvement")',
}
SEEDS = {
    "2409.00588": "Diffusion Policy Policy Optimization",
    "2412.13630": "Policy Decorator",
    "2502.02538": "Flow Q-Learning",
    "2506.15799": "Steering Your Diffusion Policy with Latent Space RL",
    "2507.15073": "Reinforcement Learning for Flow-Matching Policies",
    "2507.21053": "Flow Matching Policy Gradients",
    "2510.14830": "RL-100",
    "2511.01331": "RobustVLA",
    "2601.07821": "Failure-Aware RL",
    "2602.00743": "SA-VLA",
    "2603.10263": "DICE-RL",
    "2606.08015": "Q-VGM",
    "2606.08602": "Density Transport for Flow Policies",
    "2606.11087": "Test-Time Gradient Guidance of Flow Policies",
    "2606.13675": "Flow Reversal Steering",
    "2606.31846": "Z-1",
    "2607.17651": "HCPG-Flow",
    "2608.05999": "HiRoC",
    "2608.07314": "TEMPO",
    "2608.09762": "Centralized Training and Critic Decomposition",
}
ID_RE = re.compile(r"(\d{4}\.\d{4,5})(?:v\d+)?")
ROBOT_RE = re.compile(r"robot|manipulation|visuomotor|vision[- ]language[- ]action|\bVLA\b|dexterous|grasp|contact[- ]rich", re.I)
RL_RE = re.compile(r"reinforcement learning|RL post[- ]training|offline[- ]to[- ]online|policy optimization|actor[- ]critic|Q[- ]learning|\bPPO\b|\bGRPO\b|value[- ]guided|policy improvement", re.I)
NEG_RE = re.compile(r"locomotion|quadruped|navigation|autonomous driving|drone", re.I)
MANIP_RE = re.compile(r"manipulation|visuomotor|vision[- ]language[- ]action|\bVLA\b|dexterous|grasp|contact[- ]rich", re.I)
TAG_RULES = [
    ("VLA", r"vision[- ]language[- ]action|\bVLA\b"),
    ("Diffusion", r"diffusion polic|denoising"),
    ("Flow", r"flow[- ]matching polic|flow polic|velocity field"),
    ("PPO/GRPO", r"\bPPO\b|\bGRPO\b|proximal policy|group relative"),
    ("Off-policy/Q", r"off[- ]policy|Q[- ]learning|Q[- ]value|actor[- ]critic|\bcritic\b"),
    ("Residual/correction", r"residual|policy correction|edit policy"),
    ("Steering", r"steer|test[- ]time guidance|value[- ]guided|candidate.*select"),
    ("Offline→online", r"offline[- ]to[- ]online|offline.*online"),
    ("Real robot", r"real[- ]world|real robot|physical robot"),
    ("Safety/recovery", r"failure[- ]aware|self[- ]recovery|safety critic|human intervention"),
    ("Hierarchy", r"hierarch|long[- ]horizon|subgoal"),
    ("Distillation", r"distill|one[- ]step|latency|high[- ]frequency"),
    ("Tactile/contact", r"tactile|contact[- ]rich|dexterous|\bforce\b"),
    ("World model/reward", r"world model|reward model|learned reward|VLM reward"),
]


def text(node):
    return " ".join((node.text if node is not None and node.text else "").split())


def dt(raw):
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def tid(title):
    norm = " ".join(re.findall(r"[a-z0-9]+", title.lower()))
    return hashlib.sha1(norm.encode()).hexdigest()


def fetch(query, limit):
    params = urllib.parse.urlencode({"search_query": query, "start": 0, "max_results": limit, "sortBy": "lastUpdatedDate", "sortOrder": "descending"})
    req = urllib.request.Request(f"{API}?{params}", headers={"User-Agent": "robot-rl-watch/1.0", "Accept": "application/atom+xml"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                return ET.fromstring(response.read())
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))


def parse(root, source):
    out = []
    for entry in root.findall("a:entry", NS):
        raw_id = text(entry.find("a:id", NS))
        match = ID_RE.search(raw_id)
        aid = match.group(1) if match else ""
        title = text(entry.find("a:title", NS))
        summary = text(entry.find("a:summary", NS))
        comments = text(entry.find("x:comment", NS))
        authors = [text(author.find("a:name", NS)) for author in entry.findall("a:author", NS)]
        categories = [category.attrib.get("term", "") for category in entry.findall("a:category", NS)]
        out.append({
            "id": aid,
            "title": title,
            "summary": summary,
            "comments": comments,
            "authors": authors,
            "categories": categories,
            "published": text(entry.find("a:published", NS)),
            "updated": text(entry.find("a:updated", NS)),
            "abs": raw_id or f"https://arxiv.org/abs/{aid}",
            "pdf": f"https://arxiv.org/pdf/{aid}" if aid else "",
            "sources": [source],
        })
    return out


def merge(batches):
    merged = {}
    for batch in batches:
        for paper in batch:
            key = paper["id"] or "title:" + tid(paper["title"])
            if key in merged:
                merged[key]["sources"] = sorted(set(merged[key]["sources"] + paper["sources"]))
            else:
                merged[key] = paper
    return list(merged.values())


def rank(paper):
    title = paper["title"]
    body = " ".join([title, paper["summary"], paper["comments"]])
    if not ROBOT_RE.search(body) or not RL_RE.search(body):
        return None
    if NEG_RE.search(body) and not MANIP_RE.search(body):
        return None
    score = 2 if "cs.RO" in paper["categories"] else 0
    weights = [
        (r"RL post[- ]training|reinforcement post[- ]training", 5),
        (r"reinforcement learning", 3),
        (r"vision[- ]language[- ]action|\bVLA\b", 3),
        (r"diffusion polic|flow[- ]matching polic|flow polic", 3),
        (r"manipulation|visuomotor|dexterous|contact[- ]rich", 3),
        (r"offline[- ]to[- ]online|online reinforcement learning", 3),
        (r"residual|steer|value[- ]guided|test[- ]time guidance", 2),
        (r"\bPPO\b|\bGRPO\b|Q[- ]learning|actor[- ]critic", 2),
        (r"real[- ]world|real robot|physical robot", 2),
        (r"failure[- ]aware|self[- ]recovery|safety critic", 2),
    ]
    for pattern, weight in weights:
        if re.search(pattern, title, re.I):
            score += weight
        elif re.search(pattern, body, re.I):
            score += max(1, weight - 1)
    if len(paper["sources"]) > 1:
        score += 1
    tags = [name for name, pattern in TAG_RULES if re.search(pattern, body, re.I)]
    return score, tags


def relation(tags):
    tag_set = set(tags)
    notes = []
    if "Residual/correction" in tag_set:
        notes.append("像 DICE：保留行为先验，只学习局部修正")
    elif "Steering" in tag_set:
        notes.append("固定先验并做价值引导/候选选择，可与 DICE 对照")
    if "PPO/GRPO" in tag_set:
        notes.append("像 RL-100：直接做参数级策略优化")
    elif "Off-policy/Q" in tag_set:
        notes.append("用 critic/Q 提升样本效率，可与 DICE 的 off-policy residual actor 比较")
    if "Offline→online" in tag_set:
        notes.append("覆盖 RL-100 式 offline→online 数据飞轮")
    if "VLA" in tag_set:
        notes.append("把单任务生成策略 RL 扩展到 VLA，并需防语义能力退化")
    if "Safety/recovery" in tag_set:
        notes.append("补足真实机器人探索中的失败检测与恢复")
    if "Distillation" in tag_set:
        notes.append("对应 RL-100 的 one-step 部署效率问题")
    if "Hierarchy" in tag_set:
        notes.append("针对长时程信用分配与子目标结构")
    if "Tactile/contact" in tag_set:
        notes.append("与接触丰富操作和触觉闭环直接相邻")
    return "；".join(notes[:3]) + "。" if notes else "与机器人策略 RL 后训练直接相关。"


def short(value, limit):
    value = " ".join(value.split()).replace("<", "&lt;").replace(">", "&gt;")
    return value if len(value) <= limit else value[: limit - 1].rstrip() + "…"


def load_state(path):
    try:
        state = json.loads(path.read_text())
    except Exception:
        state = {"schema_version": 1, "topic": "robot-manipulation-rl-post-training", "seen": {}}
    state.setdefault("seen", {})
    for aid, title in SEEDS.items():
        state["seen"].setdefault(aid, {"title": title, "source": "initial_survey_seed"})
    return state


def write_outputs(items, output_dir, comment_file, state, local_date, now):
    stamp = now.strftime("%Y-%m-%d_%H%M%SZ")
    report_path = output_dir / f"{stamp}.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report = [f"# Robot Manipulation RL Post-Training Watch — {local_date}", "", f"发现 **{len(items)}** 篇新论文。", ""]
    comment = [f"## {local_date}｜Robot Manipulation RL Post-Training 每日更新", "", f"发现 **{len(items)}** 篇此前从未推送过的论文。", ""]
    for index, item in enumerate(items, 1):
        paper, score, tags = item
        tag_text = " / ".join(tags) or "Robot RL post-training"
        why = relation(tags)
        authors = ", ".join(paper["authors"][:6]) + (f" 等（共 {len(paper['authors'])} 位）" if len(paper["authors"]) > 6 else "")
        report.extend([
            f"## {index}. [{paper['title']}]({paper['abs']})", "",
            f"- arXiv: {paper['id']}",
            f"- 日期: {paper['published'][:10]}（更新 {paper['updated'][:10]}）",
            f"- 作者: {authors}",
            f"- 标签: {tag_text}",
            f"- 相关性分数: {score}",
            f"- 与 DICE / RL-100 的关系: {why}",
            f"- [PDF]({paper['pdf']})", "",
            f"> {short(paper['summary'], 900)}", "",
        ])
        comment.extend([
            f"### {index}. [{paper['title']}]({paper['abs']})",
            f"- **日期**：{paper['published'][:10]}（更新 {paper['updated'][:10]}）",
            f"- **标签**：{tag_text}",
            f"- **为什么值得看**：{why}",
            f"- **摘要**：{short(paper['summary'], 420)}",
            f"- [PDF]({paper['pdf']})", "",
        ])
        state["seen"][paper["id"] or "title:" + tid(paper["title"])] = {
            "title": paper["title"],
            "first_seen": now.isoformat(),
            "score": score,
            "tags": tags,
            "report": report_path.as_posix(),
        }
    comment.extend([
        f"完整记录：`{report_path.as_posix()}`。", "",
        "<sub>仅在发现新论文时评论；canonical arXiv ID + 标题哈希永久去重。</sub>",
    ])
    report_path.write_text("\n".join(report).rstrip() + "\n", encoding="utf-8")
    comment_file.parent.mkdir(parents=True, exist_ok=True)
    comment_file.write_text("\n".join(comment).rstrip() + "\n", encoding="utf-8")
    return report_path


def gh_output(name, value):
    if os.getenv("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write(f"{name}={value}\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", type=Path, default=Path("data/robot_rl_watch_seen.json"))
    parser.add_argument("--output-dir", type=Path, default=Path("outputs/robot_rl_watch"))
    parser.add_argument("--comment-file", type=Path, default=Path("/tmp/robot_rl_watch_comment.md"))
    parser.add_argument("--lookback-days", type=int, default=21)
    parser.add_argument("--query-limit", type=int, default=100)
    parser.add_argument("--max-new", type=int, default=12)
    parser.add_argument("--min-score", type=int, default=8)
    parser.add_argument("--timezone", default="America/Los_Angeles")
    parser.add_argument("--github-repo", default="")
    parser.add_argument("--github-issue", default="19")
    args = parser.parse_args()
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=args.lookback_days)
    state = load_state(args.state)
    seen_titles = {tid(item.get("title", "")) for item in state["seen"].values() if item.get("title")}
    batches = []
    for index, (name, query) in enumerate(QUERIES.items()):
        try:
            batches.append(parse(fetch(query, args.query_limit), name))
        except Exception as error:
            print(f"warning: query {name} failed: {error}")
        if index + 1 < len(QUERIES):
            time.sleep(3.1)
    if not batches:
        raise SystemExit("all arXiv queries failed")
    ranked = []
    for paper in merge(batches):
        fresh = max([value for value in [dt(paper["published"]), dt(paper["updated"])] if value], default=None)
        if fresh and fresh < cutoff:
            continue
        key = paper["id"] or "title:" + tid(paper["title"])
        if key in state["seen"] or tid(paper["title"]) in seen_titles:
            continue
        result = rank(paper)
        if result and result[0] >= args.min_score:
            ranked.append((paper, result[0], result[1]))
    ranked.sort(key=lambda item: (dt(item[0]["updated"]) or dt(item[0]["published"]) or datetime.min.replace(tzinfo=timezone.utc), item[1]), reverse=True)
    items = ranked[: args.max_new]
    if not items:
        args.comment_file.parent.mkdir(parents=True, exist_ok=True)
        args.comment_file.write_text("", encoding="utf-8")
        gh_output("new_count", "0")
        gh_output("report_path", "")
        return 0
    local_date = now.astimezone(ZoneInfo(args.timezone)).date().isoformat()
    report_path = write_outputs(items, args.output_dir, args.comment_file, state, local_date, now)
    state["updated_at"] = now.isoformat()
    state["last_report"] = report_path.as_posix()
    args.state.parent.mkdir(parents=True, exist_ok=True)
    args.state.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    gh_output("new_count", str(len(items)))
    gh_output("report_path", report_path.as_posix())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
