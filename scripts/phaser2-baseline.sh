#!/usr/bin/env bash
# Regenerates the test baselines (reference screenshots and replay traces) from the
# last version of the game that ran on Phaser 2, so that the Phaser 4 port is checked
# against the original behavior. Arguments are passed to Playwright.
set -euo pipefail

PHASER2_COMMIT=2190995

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
cleanup() {
  git -C "$ROOT" worktree remove --force "$WORK/phaser2" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

git -C "$ROOT" worktree add --detach "$WORK/phaser2" "$PHASER2_COMMIT"
ln -s "$ROOT/node_modules" "$WORK/phaser2/node_modules"
(cd "$WORK/phaser2" && npx vite build)

# By default every spec that compares against Phaser 2; arguments select specs or tests
if [ $# -eq 0 ]; then
  set -- reference replay screens
fi

cd "$ROOT"
PHASER=2 PHASER2_DIST="$WORK/phaser2/dist" UPDATE_TRACES=1 \
  npx playwright test "$@" --update-snapshots
