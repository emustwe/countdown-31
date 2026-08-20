import { defineConfig, devices } from "@playwright/test";

// The Backend (+ its Postgres/Redis via the root docker-compose) must already be running
// — see the README's "Run the e2e test" section. This config only manages the Frontend
// dev server, since the backend needs a database migrated/seeded first.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
