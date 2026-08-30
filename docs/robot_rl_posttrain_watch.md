# Robot Manipulation RL Post-Training Daily Watch

This monitor tracks new work related to DICE-RL, RL-100, robot-policy reinforcement learning, and VLA post-training.

## Schedule and delivery

- Runs every day at **08:30 America/Los_Angeles**. Two UTC cron slots plus a daylight-saving-time gate select exactly one run.
- When unseen high-relevance papers are found, the workflow writes a dated report under `outputs/robot_rl_posttrain/` and comments on canonical tracking issue `#7`.
- When no paper passes the strict relevance and novelty checks, the workflow remains quiet.
- `workflow_dispatch` can also run the watcher manually.

## Search scope

Focused arXiv searches cover:

- DICE / RL-100 style prior-to-expert policy improvement;
- diffusion-policy and flow-policy reinforcement learning;
- VLA online RL, offline RL, and offline-to-online post-training;
- residual/edit policies, value/Q-guided action selection, and failure-driven self-improvement;
- human-in-the-loop learning, digital twins/world models, tactile or dexterous manipulation;
- one-step distillation, action chunking, asynchronous execution, and inference latency.

The strict entrypoint requires all of the following:

1. a robot-policy or manipulation context;
2. explicit RL evidence such as reinforcement learning, PPO/GRPO/SAC, Q-learning, actor-critic, or policy gradients;
3. a concrete post-training, adaptation, rollout, reward, value, critic, or replay mechanism.

Security attacks, networking, recommendation systems, molecular work, and other incidental RL mentions are excluded.

## Permanent deduplication

The persistent state is stored at `data/robot_rl_posttrain_seen.json`.

Each paper is checked against two identities:

1. canonical arXiv ID with the version suffix removed, such as `2603.10263` rather than `2603.10263v2`;
2. SHA1 of the normalized title as a fallback.

Papers covered in the initial survey and validation runs are already seeded. New reports are posted before the state is committed; a report-content hash in the issue comment makes retries idempotent, so a failed run neither loses a notification nor creates a duplicate.

## Files

- Workflow: `.github/workflows/robot-rl-post-training-watch.yml`
- Base monitor: `scripts/robot_rl_posttrain_watch.py`
- Strict relevance entrypoint: `scripts/robot_rl_posttrain_watch_strict.py`
- Seen state: `data/robot_rl_posttrain_seen.json`
- Reports: `outputs/robot_rl_posttrain/YYYY-MM-DD.md`
- Tracking issue: `#7`

The monitor uses only the Python standard library and the public arXiv Atom API; no model API key or extra dependency is required.

## Manual run

```bash
python scripts/robot_rl_posttrain_watch_strict.py --self-test
python scripts/robot_rl_posttrain_watch_strict.py \
  --state data/robot_rl_posttrain_seen.json \
  --output-dir outputs/robot_rl_posttrain \
  --days 45 \
  --per-query 100 \
  --min-score 14 \
  --max-items 12 \
  --timezone America/Los_Angeles
```

Use `--dry-run` to inspect a digest without changing the persistent deduplication state.
