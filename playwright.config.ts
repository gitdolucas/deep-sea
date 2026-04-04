import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000/",
    stdout: "pipe",
    stderr: "pipe",
    // Reusing a random local dev server often causes flaky/hung readiness; opt-in only.
    reuseExistingServer: process.env.PW_REUSE_SERVER === "1",
    timeout: 60_000,
  },
});
