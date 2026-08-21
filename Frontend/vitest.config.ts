import { defineConfig } from "vitest/config";

// e2e/ holds Playwright specs (a separate test runner, run via `npm run test:e2e`) —
// Vitest's default glob would otherwise try to load them too and fail on the
// @playwright/test import.
export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
  },
});
