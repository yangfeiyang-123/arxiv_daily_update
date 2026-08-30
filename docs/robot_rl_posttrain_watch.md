# Robot Manipulation RL Post-Training Daily Watch

This monitor tracks new work related to DICE-RL, RL-100, robot-policy reinforcement learning, and VLA post-training.

## Schedule and delivery

- Runs every day at `16:00 UTC`, corresponding to approximately `08:00–09:00` in `America/Los_Angeles` depending on daylight saving time.
- When unseen relevant papers are found, the workflow writes a dated report under `outputs/robot_rl_posttrain/` and comments on tracking issue `#6`.
- When no new paper passes the relevance threshold, the workflow remains quiet.

## Search scope

The focused arXiv searches and deterministic scorer cover:

- DICE / RL-100 style prior-to-expert policy improvement;
- diffusion-policy and flow-policy reinforcement learning;
- VLA online RL, offline RL, and offline-to-online post-training;
- residual or edit policies, value/Q-guided action selection, and failure-driven self-improvement;
- human-in-the-loop learning, digital twins/world models, tactile or dexterous manipulation;
- one-step distillation, action chunking, asynchronous execution, and inference latency.

## Permanent deduplication

The persistent state is stored at `data/robot_rl_posttrain_seen.json`.

Each paper is checked against two identities:

1. canonical arXiv ID with the version suffix removed, such as `2603.10263` rather than `2603.10263v2`;
2. SHA1 of the normalized title as a fallback.

All papers covered in the initial survey are pre-seeded, so the first scheduled run will not resend DICE, RL-100, or the other already-reviewed papers.

## Files

- Workflow: `.github/workflows/robot-rl-posttrain-watch.yml`
- Monitor: `scripts/robot_rl_posttrain_watch.py`
- Seen state: `data/robot_rl_posttrain_seen.json`
- Reports: `outputs/robot_rl_posttrain/YYYY-MM-DD.md`

The monitor uses only the Python standard library and the public arXiv Atom API; no model API key or extra dependency is required.

## Manual run

```bash
python scripts/robot_rl_posttrain_watch.py --self-test
python scripts/robot_rl_posttrain_watch.py \
  --state data/robot_rl_posttrain_seen.json \
  --output-dir outputs/robot_rl_posttrain \
  --days 45 --min-score 12
```

Use `--dry-run` to inspect a digest without changing the persistent deduplication state.
