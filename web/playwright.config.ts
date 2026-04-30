import { defineConfig, devices } from "@playwright/test";

/** Playwright config for the web frontend.
 *
 *  We assume the dev server is already running on :3000 — locally, that means
 *  `npm run dev` in another terminal; in CI, a job step starts it before
 *  `npx playwright test`. Re-using the running server avoids the cold-start
 *  cost on every run.
 *
 *  The backend at :8001 is *not* started automatically. Tests that hit the
 *  backend (anything past /login) need it running too. Tests in `e2e/public/`
 *  don't need the backend — they only exercise public pages. */
export default defineConfig({
  testDir: "./e2e",

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
