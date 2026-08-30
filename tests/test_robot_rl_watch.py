from __future__ import annotations

import sys
import unittest
from pathlib import Path

SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import robot_rl_post_training_watch as watch  # noqa: E402


class RobotRLWatchTests(unittest.TestCase):
    def test_canonical_arxiv_id_removes_version(self) -> None:
        raw = {
            "id": "https://arxiv.org/abs/2603.10263v4",
            "title": "From Prior to Pro",
        }
        self.assertEqual(watch.canonical_id(raw), "2603.10263")

    def test_title_hash_normalizes_case_spacing_and_punctuation(self) -> None:
        self.assertEqual(
            watch.title_hash("  Residual RL: Post-Training!  "),
            watch.title_hash("residual rl post training"),
        )

    def test_dice_like_paper_is_relevant(self) -> None:
        raw = {
            "title": "Distribution-Contractive RL Fine-Tuning for Robot Manipulation",
            "summary": (
                "We use reinforcement learning to fine-tune a pretrained diffusion "
                "policy for real-world robot manipulation. A residual policy and "
                "critic preserve the behavior-cloning prior while improving success."
            ),
        }
        scored = watch.score_paper(raw, minimum=13.0)
        self.assertIsNotNone(scored)
        assert scored is not None
        score, tags, relation = scored
        self.assertGreaterEqual(score, 13.0)
        self.assertIn("Diffusion", tags)
        self.assertIn("Residual", tags)
        self.assertIn("DICE", relation)

    def test_vla_grpo_paper_is_relevant(self) -> None:
        raw = {
            "title": "Temporal GRPO for Vision-Language-Action Reinforcement Learning",
            "summary": (
                "We optimize a flow-matching VLA with group relative policy "
                "optimization on robotic manipulation tasks and real-robot rollouts."
            ),
        }
        scored = watch.score_paper(raw, minimum=13.0)
        self.assertIsNotNone(scored)
        assert scored is not None
        _, tags, _ = scored
        self.assertIn("VLA", tags)
        self.assertIn("GRPO", tags)
        self.assertIn("Flow", tags)

    def test_related_work_only_rl_mention_is_excluded(self) -> None:
        raw = {
            "title": "Multi-Arm Vision-Language-Action Behavior Cloning",
            "summary": (
                "We train a behavior-cloning policy for robotic manipulation. "
                "Reinforcement learning is discussed only as possible future work."
            ),
        }
        self.assertIsNone(watch.score_paper(raw, minimum=13.0))

    def test_navigation_only_paper_is_excluded(self) -> None:
        raw = {
            "title": "PPO for Autonomous Drone Navigation",
            "summary": (
                "We use reinforcement learning to train a robot navigation policy "
                "for aerial path planning without manipulation."
            ),
        }
        self.assertIsNone(watch.score_paper(raw, minimum=13.0))

    def test_feed_parser_accepts_repository_field_layout(self) -> None:
        payload = {
            "fields": [
                {
                    "category": "cs.RO",
                    "papers": [
                        {"title": "Paper A"},
                        {"title": "Paper B"},
                    ],
                }
            ]
        }
        self.assertEqual(
            [paper["title"] for paper in watch.papers_in(payload)],
            ["Paper A", "Paper B"],
        )

    def test_report_contains_idempotency_marker(self) -> None:
        raw = {
            "id": "https://arxiv.org/abs/2608.99999v2",
            "title": "Robot RL Post-Training",
            "summary": "We use online reinforcement learning for robot manipulation.",
            "authors": ["A. Researcher"],
            "published": "2026-08-29T00:00:00+00:00",
        }
        scored = watch.score_paper(raw, minimum=0.0)
        self.assertIsNotNone(scored)
        assert scored is not None
        score, tags, relation = scored
        paper = watch.Paper(
            raw=raw,
            arxiv_id="2608.99999",
            title_hash=watch.title_hash(raw["title"]),
            score=score,
            tags=tags,
            relation=relation,
            published=watch.parse_time(raw["published"]),
        )
        report = watch.make_report([paper], watch.parse_time("2026-08-30T00:00:00Z"))
        self.assertTrue(report.startswith("<!-- robot-rl-watch:2608.99999 -->"))


if __name__ == "__main__":
    unittest.main()
