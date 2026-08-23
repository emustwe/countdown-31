import { afterEach, describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./web-origins";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

describe("isAllowedOrigin", () => {
  it("allows a Tailscale Funnel origin during local development", () => {
    process.env.NODE_ENV = "development";
    expect(isAllowedOrigin("https://invictus.tail81be07.ts.net")).toBe(true);
  });

  it("does not implicitly allow Funnel origins in production", () => {
    process.env.NODE_ENV = "production";
    expect(isAllowedOrigin("https://unknown.example.ts.net")).toBe(false);
  });
});
