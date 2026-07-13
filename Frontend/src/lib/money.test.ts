import { describe, expect, it } from "vitest";
import { creditsToMinorUnits, formatMinorUnits } from "./money";

describe("formatMinorUnits", () => {
  it("formats whole credits", () => {
    expect(formatMinorUnits("100000")).toBe("1,000.00 credits");
  });

  it("formats fractional credits with correct padding", () => {
    expect(formatMinorUnits("412")).toBe("4.12 credits");
    expect(formatMinorUnits("5")).toBe("0.05 credits");
  });

  it("formats negative amounts", () => {
    expect(formatMinorUnits("-1000")).toBe("-10.00 credits");
  });

  it("adds thousands separators", () => {
    expect(formatMinorUnits("123456789")).toBe("1,234,567.89 credits");
  });
});

describe("creditsToMinorUnits", () => {
  it("converts a whole-credit amount", () => {
    expect(creditsToMinorUnits("100")).toBe("10000");
  });

  it("converts a fractional amount", () => {
    expect(creditsToMinorUnits("4.12")).toBe("412");
  });

  it("pads a single decimal digit", () => {
    expect(creditsToMinorUnits("1.5")).toBe("150");
  });

  it("round-trips through formatMinorUnits", () => {
    const minorUnits = creditsToMinorUnits("250.75");
    expect(formatMinorUnits(minorUnits)).toBe("250.75 credits");
  });

  it("rejects invalid input", () => {
    expect(() => creditsToMinorUnits("abc")).toThrow();
    expect(() => creditsToMinorUnits("-5")).toThrow();
    expect(() => creditsToMinorUnits("1.999")).toThrow();
  });
});
