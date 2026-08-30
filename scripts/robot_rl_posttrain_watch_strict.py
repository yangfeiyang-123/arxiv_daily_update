#!/usr/bin/env python3
"""High-precision entrypoint for the robot manipulation RL post-training watch.

This wrapper keeps the mature querying, reporting, and permanent deduplication
logic in ``robot_rl_posttrain_watch.py`` while rejecting papers that only
mention RL incidentally or are outside manipulation / robot-policy adaptation.
"""

from __future__ import annotations

import re

import robot_rl_posttrain_watch as base


EXPLICIT_RL_PATTERNS = (
    r"\breinforcement learning\b",
    r"\breinforcement (?:fine[- ]?tuning|finetuning|adaptation|post[- ]?training)\b",
    r"\b(?:offline|online|residual|model[- ]based) rl\b",
    r"\brl (?:fine[- ]?tuning|finetuning|post[- ]?training|adaptation|optimization)\b",
    r"\b(?:ppo|grpo|sac|td3|q[- ]learning|actor[- ]critic)\b",
    r"\bpolicy gradient(?:s)?\b",
    r"\bpolicy optimization\b",
)

MANIPULATION_PATTERNS = (
    r"\bmanipulat(?:e|ion|or|ors|ing)\b",
    r"\bvision[- ]language[- ]action\b",
    r"\bvla(?:s)?\b",
    r"\bvisuomotor\b",
    r"\brobot policy\b",
    r"\baction chunk(?:ing|s)?\b",
    r"\b(?:grasp|bimanual|dexter(?:ity|ous)|assembly|insertion|folding|pouring|unscrewing)\b",
    r"\b(?:tactile|visuotactile|contact[- ]rich)\b",
    r"\bwhole[- ]body loco[- ]manipulation\b",
)

MECHANISM_PATTERNS = (
    r"\bpost[- ]train(?:ing)?\b",
    r"\bfine[- ]tun(?:e|ing)\b",
    r"\bfinetun(?:e|ing)\b",
    r"\badapt(?:ation|ing|s)?\b",
    r"\b(?:actor|critic|q[- ]function|q[- ]value|value function|reward model)\b",
    r"\b(?:advantage|rollout|replay buffer|policy update|policy improvement)\b",
    r"\b(?:offline[- ]to[- ]online|human[- ]in[- ]the[- ]loop|world model|digital twin)\b",
)

EXCLUDED_TOPICS = (
    r"\b(?:backdoor|jailbreak|prompt injection|data poisoning|model poisoning)\b",
    r"\b(?:malware|intrusion detection|wireless network|recommendation system)\b",
    r"\b(?:protein|molecule|financial trading)\b",
)

_ORIGINAL_SCORE = base.score_paper
_ORIGINAL_SELF_TEST = base.run_self_test


def _matches_any(text: str, patterns: tuple[str, ...]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def strict_score_paper(paper: base.Paper) -> base.RankedPaper | None:
    text = base.normalize_space(
        f"{paper.title} {paper.summary} {paper.comment}"
    ).casefold()
    title = base.normalize_space(paper.title).casefold()

    if _matches_any(text, EXCLUDED_TOPICS):
        return None
    if not _matches_any(text, EXPLICIT_RL_PATTERNS):
        return None
    if not _matches_any(text, MANIPULATION_PATTERNS):
        return None

    # A title-level RL signal is already strong. Otherwise require at least two
    # concrete optimization/adaptation mechanisms in the abstract, preventing a
    # related-work mention of RL from passing the gate.
    title_has_rl = _matches_any(title, EXPLICIT_RL_PATTERNS)
    mechanism_hits = sum(
        bool(re.search(pattern, text, flags=re.IGNORECASE))
        for pattern in MECHANISM_PATTERNS
    )
    if not title_has_rl and mechanism_hits < 2:
        return None

    return _ORIGINAL_SCORE(paper)


def run_strict_self_test() -> int:
    result = _ORIGINAL_SELF_TEST()

    negative = base.Paper(
        arxiv_id="2608.88888",
        title="Backdoor Attacks on Vision-Language-Action Robot Policies",
        summary=(
            "We mention reinforcement learning in related work but study data "
            "poisoning rather than policy post-training."
        ),
        authors=("Test Author",),
        published=base.datetime.now(base.timezone.utc),
        updated=base.datetime.now(base.timezone.utc),
        categories=("cs.RO",),
        abs_url="https://arxiv.org/abs/2608.88888",
        pdf_url="https://arxiv.org/pdf/2608.88888",
        comment="",
    )
    assert strict_score_paper(negative) is None

    adjacent = base.Paper(
        arxiv_id="2608.77777",
        title="Reinforcement Learning for Wireless Robot Networks",
        summary="We optimize packet routing for mobile robots.",
        authors=("Test Author",),
        published=base.datetime.now(base.timezone.utc),
        updated=base.datetime.now(base.timezone.utc),
        categories=("cs.RO",),
        abs_url="https://arxiv.org/abs/2608.77777",
        pdf_url="https://arxiv.org/pdf/2608.77777",
        comment="",
    )
    assert strict_score_paper(adjacent) is None

    print("Strict relevance tests passed.")
    return result


base.score_paper = strict_score_paper
base.run_self_test = run_strict_self_test


if __name__ == "__main__":
    raise SystemExit(base.main())
