#!/usr/bin/env bash
# Regenerate requirements.lock.txt from requirements.txt (the hand-edited
# source of truth for direct dependencies). Run this after changing
# requirements.txt or to pick up transitive-dependency updates.
set -euo pipefail

cd "$(dirname "$0")/.."

python3 -m venv .lockvenv --clear
.lockvenv/bin/pip install --quiet pip-tools
.lockvenv/bin/pip-compile requirements.txt \
  --output-file=requirements.lock.txt \
  --generate-hashes \
  --allow-unsafe \
  --resolver=backtracking
rm -rf .lockvenv

echo "requirements.lock.txt regenerated. Review the diff before committing."
