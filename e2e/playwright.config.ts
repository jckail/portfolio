import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:18080',
    // helpers/e2e-docker.sh: keep the page on `localhost` (the site's CSP has
    // upgrade-insecure-requests, which only exempts localhost) but resolve it to
    // the Docker host. Unset in CI, so CI is unchanged.
    launchOptions: process.env.E2E_HOST_MAP
      ? { args: [`--host-resolver-rules=MAP localhost ${process.env.E2E_HOST_MAP}`] }
      : {},
  },
});
