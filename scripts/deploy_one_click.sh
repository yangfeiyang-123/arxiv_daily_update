#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMMIT_MSG="chore: deploy latest updates"
WITH_WORKER=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --with-worker)
      WITH_WORKER=1
      shift
      ;;
    -m|--message)
      if [[ $# -lt 2 ]]; then
        echo "[deploy] missing value for $1"
        exit 1
      fi
      COMMIT_MSG="$2"
      shift 2
      ;;
    *)
      echo "[deploy] unsupported arg: $1"
      echo "Usage: bash scripts/deploy_one_click.sh [-m \"commit message\"] [--with-worker]"
      exit 1
      ;;
  esac
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[deploy] not a git repository: $ROOT_DIR"
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "[deploy] git remote 'origin' not found."
  echo "Run: git remote add origin https://github.com/<username>/<repo>.git"
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "[deploy] warning: current branch is '$CURRENT_BRANCH' (expected 'main')."
fi

echo "[deploy] step 1/4: stage local changes"
git add .

if git diff --cached --quiet; then
  echo "[deploy] no staged changes to commit."
else
  echo "[deploy] step 2/4: create commit"
  git commit -m "$COMMIT_MSG"
fi

echo "[deploy] step 3/4: rebase onto remote main"
git pull --rebase origin main

echo "[deploy] step 4/4: push to origin main"
git push origin main

if [[ "$WITH_WORKER" -eq 1 ]]; then
  if ! command -v wrangler >/dev/null 2>&1; then
    echo "[deploy] wrangler not found; install first: npm i -g wrangler"
    exit 1
  fi
  echo "[deploy] deploying Cloudflare Worker"
  (
    cd "$ROOT_DIR/worker/trigger-update"
    wrangler deploy
  )
fi

echo "[deploy] done."
echo "[deploy] GitHub Pages will auto-build via Actions."
echo "[deploy] site url: https://yangfeiyang-123.github.io/arxiv_daily_update/"
