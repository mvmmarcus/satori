import { defineConfig, devices } from "@playwright/test";

// No webServer on purpose: the dev server is started by the user on :3001.
export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3001", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
