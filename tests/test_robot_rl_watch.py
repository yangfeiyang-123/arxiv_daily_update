from __future__ import annotations

import sys
import textwrap
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import watch_robot_rl_posttraining as watch  # noqa: E402
import watch_robot_rl_posttraining_strict as strict_watch  # noqa: E402,F401


class RobotRLWatchTests(unittest.TestCase):
    def make_paper(self, title: str, summary: str) -> object:
        return watch.Paper(
            arxiv_id="2608.99999",
            title=title,
            summary=summary,
            authors=("A. Researcher",),
            published="2026-08-29T00:00:00Z",
            updated="2026-08-29T00:00:00Z",
            categories=("cs.RO",),
            abs_url="https://arxiv.org/abs/2608.99999",
            pdf_url="https://arxiv.org/pdf/2608.99999",
        )

    def test_canonical_arxiv_id_removes_version(self) -> None:
        self.assertEqual(
            watch.canonical_arxiv_id("https://arxiv.org/abs/2603.10263v2"),
            "2603.10263",
        )

    def test_acronym_matching_uses_boundaries(self) -> None:
        self.assertTrue(watch.matches_term("PPO fine-tuning", "ppo"))
        self.assertFalse(watch.matches_term("support estimation", "ppo"))
        self.assertTrue(watch.matches_term("VLA-RL", "vla"))
        self.assertFalse(watch.matches_term("evaluation", "vla"))

    def test_relevant_manipulation_paper_scores_high(self) -> None:
        paper = self.make_paper(
            "Structured Exploration for Flow-Based VLA Policies",
            (
                "We use online reinforcement learning to post-train a "
                "vision-language-action robot manipulation policy on real robots."
            ),
        )
        score, tags = watch.relevance_score(paper)
        self.assertGreaterEqual(score, 10)
        self.assertIn("VLA-RL", tags)
        self.assertIn("Real Robot", tags)

    def test_navigation_only_paper_is_excluded(self) -> None:
        paper = self.make_paper(
            "Reinforcement Learning for Vision-Language Navigation",
            (
                "An embodied robot navigation policy uses PPO for aerial "
                "navigation without object manipulation."
            ),
        )
        score, tags = watch.relevance_score(paper)
        self.assertEqual(score, 0)
        self.assertEqual(tags, ())

    def test_security_attack_is_excluded_by_strict_filter(self) -> None:
        paper = self.make_paper(
            "TrapVLA: Trapping Vision-Language-Action Models in Configured Failure Modes",
            (
                "A backdoor attack induces configured failures in a real robot VLA. "
                "Reinforcement learning is discussed only as related work."
            ),
        )
        score, tags = watch.relevance_score(paper)
        self.assertEqual(score, 0)
        self.assertEqual(tags, ())

    def test_single_related_work_rl_mention_is_excluded(self) -> None:
        paper = self.make_paper(
            "Multi-Arm Vision-Language-Action Model for Collaboration",
            (
                "We train a behavior cloning policy for robot manipulation. "
                "Reinforcement learning is a possible future direction."
            ),
        )
        score, tags = watch.relevance_score(paper)
        self.assertEqual(score, 0)
        self.assertEqual(tags, ())

    def test_parse_feed_and_deduplicate_version(self) -> None:
        xml = textwrap.dedent(
            """\
            <?xml version="1.0" encoding="utf-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry>
                <id>http://arxiv.org/abs/2608.99999v3</id>
                <updated>2026-08-29T01:00:00Z</updated>
                <published>2026-08-28T01:00:00Z</published>
                <title>Robot RL Post-Training</title>
                <summary>Reinforcement learning for a robot manipulation policy.</summary>
                <author><name>Alice</name></author>
                <category term="cs.RO"/>
                <link href="https://arxiv.org/abs/2608.99999v3" rel="alternate"/>
                <link title="pdf" href="https://arxiv.org/pdf/2608.99999v3"/>
              </entry>
            </feed>
            """
        ).encode("utf-8")
        papers = watch.parse_feed(xml)
        self.assertEqual(len(papers), 1)
        self.assertEqual(papers[0].arxiv_id, "2608.99999")
        self.assertEqual(papers[0].authors, ("Alice",))
        self.assertEqual(papers[0].categories, ("cs.RO",))


if __name__ == "__main__":
    unittest.main()
