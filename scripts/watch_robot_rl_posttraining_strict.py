#!/usr/bin/env python3
"""High-precision entry point for the robot RL post-training watcher.

This module reuses the main watcher's arXiv retrieval, reporting, and permanent
ID/title-hash deduplication, while tightening the semantic gate. Explicit RL
papers are retained, and a small adjacent set is allowed when a robot policy is
clearly being post-trained through preferences, world models, residuals, or
human correction.
"""

from __future__ import annotations

import re

import watch_robot_rl_posttraining as watcher


STRONG_RL_TERMS = (
    "reinforcement learning",
    "rl post-training",
    "rl post training",
    "rl fine-tuning",
    "rl finetuning",
    "offline rl",
    "online rl",
    "offline-to-online",
    "policy gradient",
    "q-learning",
    "actor-critic",
    "proximal policy optimization",
    "group relative policy optimization",
    "reinforced fine-tuning",
    "reinforced finetuning",
    "grpo",
    "ppo",
)

POLICY_PRIOR_TERMS = (
    "vision-language-action",
    "vla",
    "diffusion policy",
    "flow policy",
    "flow-matching",
    "flow matching",
    "behavior cloning",
    "behaviour cloning",
    "imitation learning",
    "pre-trained policy",
    "pretrained policy",
    "policy prior",
    "large policy model",
    "foundation model",
    "action chunk",
    "robot policy",
    "robotic manipulation",
    "robot manipulation",
    "dexterity",
)

POSTTRAIN_SIGNALS = (
    "post-training",
    "post training",
    "fine-tuning",
    "fine tuning",
    "finetuning",
    "policy refinement",
    "policy improvement",
    "policy adaptation",
    "self-improving",
    "self improving",
    "continual learning",
)

ADJACENT_MECHANISMS = (
    "preference optimization",
    "preference learning",
    "world model",
    "digital twin",
    "human-in-the-loop",
    "human in the loop",
    "human intervention",
    "intervention",
    "rollback",
    "corrective supervision",
    "counterfactual supervision",
    "reward model",
    "critic model",
    "residual policy",
    "latent steering",
    "policy distillation",
    "consistency distillation",
)

TITLE_EXCLUSIONS = (
    "backdoor attack",
    "adversarial attack",
    "configured failure trapping",
    "jailbreak",
    "poisoning attack",
)

SHORT_TERMS = {"rl", "ppo", "grpo", "vla", "sac"}


def contains_term(text: str, term: str) -> bool:
    """Match phrases normally and short acronyms at token boundaries."""

    text = text.casefold()
    term = term.casefold().strip()
    if not term:
        return False
    if term in SHORT_TERMS:
        return re.search(
            rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text
        ) is not None
    return term in text


def strict_contains_any(text: str, terms) -> bool:
    return any(contains_term(text, term) for term in terms)


def evidence_count(text: str, terms) -> int:
    """Count explicit evidence while keeping acronym matches token-bounded."""

    text = text.casefold()
    total = 0
    for term in terms:
        term = term.casefold().strip()
        if term in SHORT_TERMS:
            total += len(
                re.findall(
                    rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text
                )
            )
        else:
            total += text.count(term)
    return total


# The base implementation calls this helper at run time. Replacing it prevents
# false positives such as matching "ppo" inside "support".
watcher.contains_any = strict_contains_any
_base_relevance_score = watcher.relevance_score


def adjacent_score(paper, title: str, summary: str) -> tuple[int, tuple[str, ...]]:
    """Score a clearly post-trained policy that does not use the phrase RL."""

    combined = f"{title} {summary}"
    score = 10
    if strict_contains_any(title, POSTTRAIN_SIGNALS):
        score += 4
    if strict_contains_any(combined, ("world model", "digital twin")):
        score += 3
    if strict_contains_any(
        combined,
        (
            "preference optimization",
            "human-in-the-loop",
            "human in the loop",
            "human intervention",
            "corrective supervision",
            "counterfactual supervision",
        ),
    ):
        score += 3
    if strict_contains_any(
        combined,
        (
            "vision-language-action",
            "vla",
            "diffusion policy",
            "flow policy",
            "flow-matching",
            "flow matching",
        ),
    ):
        score += 3
    if strict_contains_any(
        combined, ("real-world", "real world", "real robot", "physical robot")
    ):
        score += 2
    return score, watcher.infer_tags(title, summary)


def strict_relevance_score(paper):
    title = paper.title.casefold()
    summary = paper.summary.casefold()
    combined = f"{title} {summary}"

    if strict_contains_any(title, TITLE_EXCLUSIONS):
        return 0, ()

    # Always require a robot-manipulation policy context.
    if not strict_contains_any(combined, watcher.ROBOT_TERMS):
        return 0, ()
    if not strict_contains_any(combined, watcher.MANIPULATION_TERMS):
        return 0, ()
    if not strict_contains_any(combined, POLICY_PRIOR_TERMS):
        return 0, ()

    title_has_rl = strict_contains_any(title, STRONG_RL_TERMS)
    explicit_rl = title_has_rl or evidence_count(summary, STRONG_RL_TERMS) >= 2
    adjacent_posttraining = (
        strict_contains_any(combined, POSTTRAIN_SIGNALS)
        and strict_contains_any(combined, ADJACENT_MECHANISMS)
    )
    if not explicit_rl and not adjacent_posttraining:
        return 0, ()

    score, tags = _base_relevance_score(paper)
    if score <= 0 and adjacent_posttraining:
        score, tags = adjacent_score(paper, title, summary)
    elif score <= 0:
        return 0, ()

    # A generic LfD/control paper mentioning RL only in passing should not pass.
    if (
        "learning from demonstration" in title
        and not title_has_rl
        and not adjacent_posttraining
    ):
        return 0, ()

    return score, tags


watcher.relevance_score = strict_relevance_score


if __name__ == "__main__":
    raise SystemExit(watcher.main())
