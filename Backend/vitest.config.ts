import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

// NestJS's DI resolves constructor params via emitDecoratorMetadata, which esbuild (Vite's
// default transform) cannot produce accurately since it transpiles per-file without type
// information. SWC's decorator-metadata output is accurate, so we swap the transform for
// this project only where Nest modules are under test.
export default defineConfig({
  plugins: [
    swc.vite({
      jsc: {
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  test: {
    globals: false,
    testTimeout: 30_000,
    // Only run the TypeScript sources — never the compiled dist/ output (vitest 4 would otherwise
    // discover the emitted *.spec.js and fail on the CommonJS require of vitest).
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["dist/**", "node_modules/**"],
    // Run test files serially. The integration suites do many argon2 hashes and share one Postgres
    // database; running files in parallel (vitest 4's default) saturates the CPU and lets suites
    // interfere, which made the rate-limit test time out. Serial matches the old, reliable behavior.
    fileParallelism: false,
    // Integration tests register users and immediately spin/withdraw, so they need a funded
    // starting balance. Real signups start at 0 (deposit-required) via .env; this test-only
    // override wins because process.env takes precedence over the .env file.
    // EMAIL_ENABLED=false is critical: without it, every test registration would make a real SMTP
    // round-trip to the configured provider (Resend), which is slow and would spam/relay.
    env: { STARTING_DEMO_BALANCE: "100000", EMAIL_ENABLED: "false" },
  },
});
