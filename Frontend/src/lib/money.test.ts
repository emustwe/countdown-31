import { describe, expect, it } from "vitest";
import { parseUsdt, formatUsdt } from "./money";

describe("formatUsdt", () => {
  it("formats whole USDT (1 USDT = 1_000_000 base units)", () => {
    expect(formatUsdt("1000000")).toBe("1.00 USDT");
    expect(formatUsdt("25000000")).toBe("25.00 USDT");
  });

  it("shows two decimals and thousands separators", () => {
    expect(formatUsdt("1234560000")).toBe("1,234.56 USDT");
    expect(formatUsdt("500000")).toBe("0.50 USDT");
  });

  it("handles negative amounts", () => {
    expect(formatUsdt("-25000000")).toBe("-25.00 USDT");
  });
});

describe("parseUsdt", () => {
  it("parses whole amounts to base units", () => {
    expect(parseUsdt("25")).toBe("25000000");
    expect(parseUsdt("1000")).toBe("1000000000");
  });

  it("parses fractional amounts up to 6 decimals", () => {
    expect(parseUsdt("10.5")).toBe("10500000");
    expect(parseUsdt("0.000001")).toBe("1");
    expect(parseUsdt("1.234567")).toBe("1234567");
  });

  it("round-trips through formatUsdt", () => {
    expect(formatUsdt(parseUsdt("250.75"))).toBe("250.75 USDT");
  });

  it("rejects invalid input", () => {
    expect(() => parseUsdt("abc")).toThrow();
    expect(() => parseUsdt("-5")).toThrow();
    expect(() => parseUsdt("1.9999999")).toThrow(); // > 6 decimals
  });
});
