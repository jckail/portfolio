#!/usr/bin/env bash
# Regenerate the hash-locked requirement sets from their hand-edited sources:
#   requirements.txt     -> requirements.lock.txt      (shipped by Dockerfile.prod)
#   requirements-dev.txt -> requirements-dev.lock.txt  (test tools, installed by CI)
# Run this after changing either source or to pick up transitive updates.
# --universal resolves for every platform so the lock installs the same on
# a dev laptop, CI and the python:3.12-slim image.
set -euo pipefail

cd "$(dirname "$0")/.."

uv pip compile requirements.txt \
  --universal --generate-hashes --python-version 3.12 \
  --output-file requirements.lock.txt
# The dev lock is constrained by the production lock so both resolve every
# shared package to the same version: tests run against what ships.
uv pip compile requirements-dev.txt --constraint requirements.lock.txt \
  --universal --generate-hashes --python-version 3.12 \
  --output-file requirements-dev.lock.txt

echo "Lockfiles regenerated. Review the diff before committing."
