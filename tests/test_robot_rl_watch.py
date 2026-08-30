from __future__ import annotations

import sys
import textwrap
import unittest
from dataclasses import replace
from datetime import datetime, timezone
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import robot_rl_posttrain_watch as watch  # noqa: E402


class RobotRLPosttrainWatchTests(unittest.TestCase):
    def make_paper(self, title: str, summary: str) -> watch.Paper:
        return watch.Paper(
            arxiv_id="2608.99999",
            title=title,
            summary=summary,
            authors=("A. Researcher",),
            published=datetime(2026, 8, 29, tzinfo=timezone.utc),
            updated=datetime(2026, 8, 29, tzinfo=timezone.utc),
            categories=("cs.RO",),
            abs_url="https://arxiv.org/abs/2608.99999",
            pdf_url="https://arxiv.org/pdf/2608.99999",
            comment="",
        )

    def test_canonical_arxiv_id_removes_version(self) -> None:
        self.assertEqual(
            watch.canonical_arxiv_id("https://arxiv.org/abs/2603.10263v3"),
            "2603.10263",
        )

    def test_title_hash_is_format_invariant(self) -> None:
        self.assertEqual(
            watch.title_key("Residual RL: Post-Training!"),
            watch.title_key("  residual rl post training  "),
        )

    def test_dice_like_paper_is_relevant(self) -> None:
        paper = self.make_paper(
            "Distribution-Contractive RL Finetuning for Robot Manipulation",
            (
                "We post-train a pretrained diffusion policy with reinforcement "
                "learning, a Q-function, and a residual action policy on real robots."
            ),
        )
        ranked = watch.score_paper(paper)
        self.assertIsNotNone(ranked)
        assert ranked is not None
        self.assertGreaterEqual(ranked.score, 12)
        self.assertIn("Value/Q", ranked.tags)

    def test_non_robot_domain_is_rejected(self) -> None:
        paper = self.make_paper(
            "Diffusion Policy Optimization for Molecular Design",
            "We use reinforcement learning to optimize molecular generation.",
        )
        self.assertIsNone(watch.score_paper(paper))

    def test_parse_feed_and_version_dedup(self) -> None:
        xml = textwrap.dedent(
            """\
            <?xml version="1.0" encoding="utf-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom"
                  xmlns:arxiv="http://arxiv.org/schemas/atom">
              <entry>
                <id>http://arxiv.org/abs/2608.99999v3</id>
                <updated>2026-08-29T01:00:00Z</updated>
                <published>2026-08-28T01:00:00Z</published>
                <title>Robot RL Post-Training</title>
                <summary>Reinforcement learning for a robot manipulation policy.</summary>
                <author><name>Alice</name></author>
                <category term="cs.RO"/>
                <link href="https://arxiv.org/abs/2608.99999v3" rel="alternate"/>
                <link title="pdf" href="https://arxiv.org/pdf/2608.99999v3" type="application/pdf"/>
                <arxiv:comment>Project page available.</arxiv:comment>
              </entry>
            </feed>
            """
        ).encode("utf-8")
        papers = watch.parse_atom_feed(xml)
        self.assertEqual(len(papers), 1)
        self.assertEqual(papers[0].arxiv_id, "2608.99999")
        self.assertEqual(papers[0].authors, ("Alice",))
        self.assertEqual(papers[0].categories, ("cs.RO",))

    def test_seen_state_blocks_new_versions(self) -> None:
        paper = self.make_paper(
            "Residual RL Post-Training for Robot Manipulation",
            "Online reinforcement learning improves a diffusion policy.",
        )
        ranked = watch.score_paper(paper)
        self.assertIsNotNone(ranked)
        assert ranked is not None
        seen: dict = {}
        watch.mark_seen(seen, ranked, "2026-08-29")
        revised = replace(paper, arxiv_id="2608.99999v4")
        self.assertTrue(watch.is_seen(revised, seen))


if __name__ == "__main__":
    unittest.main()
