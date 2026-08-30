#!/usr/bin/env python3
"""High-precision entry point for the robot RL post-training watcher.

This module reuses the main watcher's retrieval, reporting, and permanent
arXiv-ID/title-hash deduplication, while tightening relevance matching.  In
particular, short acronyms such as PPO, RL, and VLA are matched as tokens rather
than arbitrary substrings (for example, ``ppo`` must not match ``support``).
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
    "latent rl",
    "grpo",
    "ppo",
)

POSTTRAIN_CONTEXT_TERMS = (
    "vision-language-action",
    "vla",
    "diffusion policy",
    "flow policy",
    "flow-matching",
    "flow matching",
    "post-training",
    "post training",
    "fine-tuning",
    "finetuning",
    "behavior cloning",
    "behaviour cloning",
    "imitation learning",
    "pre-trained policy",
    "pretrained policy",
    "policy prior",
    "large policy model",
    "foundation model",
    "offline rl",
    "offline reinforcement learning",
    "world model",
    "residual policy",
    "latent rl",
    "action chunk",
    "dexterity",
    "grpo",
)

TITLE_EXCLUSIONS = (
    "backdoor attack",
    "adversarial attack",
    "configured failure trapping",
    "jailbreak",
    "poisoning attack",
)


def contains_term(text: str, term: str) -> bool:
    """Match phrases normally and short acronyms at token boundaries."""

    text = text.casefold()
    term = term.casefold().strip()
    if not term:
        return False
    if " " not in term and len(term) <= 5:
        return re.search(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text) is not None
    return term in text


def strict_contains_any(text: str, terms) -> bool:
    return any(contains_term(text, term) for term in terms)


def evidence_count(text: str, terms) -> int:
    """Count explicit RL evidence, including repeated full phrases."""

    text = text.casefold()
    total = 0
    for term in terms:
        term = term.casefold().strip()
        if " " not in term and len(term) <= 5:
            total += len(
                re.findall(rf"(?<![a-z0-9]){re.escape(term)}(?![a-z0-9])", text)
            )
        else:
            total += text.count(term)
    return total


# The base implementation calls this global helper at run time, so replacing it
# fixes short-token false positives throughout its semantic gate.
watcher.contains_any = strict_contains_any
_base_relevance_score = watcher.relevance_score


def strict_relevance_score(paper):
    score, tags = _base_relevance_score(paper)
    if score <= 0:
        return 0, ()

    title = paper.title.casefold()
    summary = paper.summary.casefold()
    combined = f"{title} {summary}"

    # The work must make RL central: either the title says so, or the abstract
    # supplies at least two explicit RL signals.  A single related-work mention
    # is not enough.
    title_has_rl = strict_contains_any(title, STRONG_RL_TERMS)
    if not title_has_rl and evidence_count(summary, STRONG_RL_TERMS) < 2:
        return 0, ()

    # Keep the watch focused on post-training a prior/generative/VLA robot policy,
    # rather than generic robot RL, control, perception, or learning from demo.
    if not strict_contains_any(combined, POSTTRAIN_CONTEXT_TERMS):
        return 0, ()

    if strict_contains_any(title, TITLE_EXCLUSIONS):
        return 0, ()

    return score, tags


watcher.relevance_score = strict_relevance_score


if __name__ == "__main__":
    raise SystemExit(watcher.main())
