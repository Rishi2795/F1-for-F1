import { defineConfig } from "@playwright/test";

/** Port for the test API. Set E2E_API_PORT when something else (an older dev server) already holds 8000. */
const API_PORT = process.env.E2E_API_PORT ?? "8000";

/** Browser tests run against the production build (vite preview) talking to the real API
 *  serving the committed published data. Needs Python deps from backend/requirements.txt. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  workers: 2, // one API process serves every worker: more parallelism makes pages time out, not tests faster
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:4173", viewport: { width: 1280, height: 800 } },
  webServer: [
    {
      command: `python -m uvicorn app.main:app --port ${API_PORT}`,
      cwd: "../backend",
      url: `http://localhost:${API_PORT}/health`,
      reuseExistingServer: !process.env.CI,
      env: { RATE_LIMIT_PER_MINUTE: "0" },
    },
    {
      command: "npm run build && npx vite preview --port 4173 --host 127.0.0.1",
      url: "http://127.0.0.1:4173",
      // Always build and serve fresh. Reusing a leftover server silently tests a stale build.
      reuseExistingServer: false,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api` },
      timeout: 120_000,
    },
  ],
});
