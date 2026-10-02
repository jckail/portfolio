#!/usr/bin/env bash
# Run the Playwright e2e suite inside the official Playwright container.
#
# Why: the host (WSL) lacks Chromium's system libraries (libnspr4 and friends)
# and installing them needs sudo. The Playwright image ships all of them, so
# anyone with Docker gets a fast, hermetic headless browser, and several agents
# or shells can run suites in parallel against different servers.
#
# Usage:
#   helpers/e2e-docker.sh                       # suite vs http://localhost:8080
#   E2E_BASE_URL=http://localhost:9101 helpers/e2e-docker.sh
#   helpers/e2e-docker.sh tests/smoke.spec.ts   # extra args go to `playwright test`
#
# On Docker Desktop the container cannot reach the shell's localhost (a
# --network host container shares the Docker VM's network, not WSL's). A tiny
# forwarder (helpers/e2e-proxy.cjs) inside the container makes localhost:PORT reach
# the host, so the browser AND Playwright's Node-side API client both see a real
# `localhost`, as in CI. That matters: the site's CSP upgrades non-localhost http
# subresources to https, and the API client ignores Chrome's resolver rules.
# Results are written inside the container (/tmp), never into the checkout.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${E2E_BASE_URL:-http://localhost:8080}"
BASE_URL="${BASE_URL//127.0.0.1/localhost}"

# Pin the image to the Playwright version the lockfile resolves, so the browser
# build matches the library.
VERSION="$(node -p "require('${ROOT}/e2e/package-lock.json').packages['node_modules/@playwright/test'].version")"
IMAGE="mcr.microsoft.com/playwright:v${VERSION}-noble"

if [ ! -d "${ROOT}/e2e/node_modules/@playwright/test" ]; then
  echo "e2e/node_modules is missing; run: (cd e2e && npm ci)" >&2
  exit 1
fi

PORT="$(node -p "new URL(process.argv[1]).port || (process.argv[1].startsWith('https') ? 443 : 80)" "${BASE_URL}")"

exec docker run --rm --ipc=host --add-host=host.docker.internal:host-gateway \
  -v "${ROOT}/e2e:/work:ro" -v "${ROOT}/helpers/e2e-proxy.cjs:/proxy.cjs:ro" -w /work \
  -e E2E_BASE_URL="${BASE_URL}" \
  "${IMAGE}" \
  sh -c 'node /proxy.cjs "$0" host.docker.internal & exec npx playwright test --reporter=list --output=/tmp/pw-results "$@"' "${PORT}" "$@"
