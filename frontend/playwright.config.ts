import { defineConfig } from "@playwright/test";

/** Browser tests run against the production build (vite preview) talking to the real API
 *  serving the committed published data. Needs Python deps from backend/requirements.txt. */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:4173", viewport: { width: 1280, height: 800 } },
  webServer: [
    {
      command: "python -m uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: "http://localhost:8000/health",
      reuseExistingServer: !process.env.CI,
      env: { RATE_LIMIT_PER_MINUTE: "0" },
    },
    {
      command: "npm run build && npx vite preview --port 4173 --host 127.0.0.1",
      url: "http://127.0.0.1:4173",
      // Always build and serve fresh. Reusing a leftover server silently tests a stale build.
      reuseExistingServer: false,
      env: { VITE_API_URL: "http://localhost:8000/api" },
      timeout: 120_000,
    },
  ],
});
