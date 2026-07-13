import { describe, expect, it } from "vitest";
import { createSecureRng, createSeededRng } from "../rng";

describe("createSeededRng", () => {
  it("is deterministic for a given seed", () => {
    const a = createSeededRng("seed-123");
    const b = createSeededRng("seed-123");
    const drawsA = Array.from({ length: 20 }, () => a.nextUint32());
    const drawsB = Array.from({ length: 20 }, () => b.nextUint32());
    expect(drawsA).toEqual(drawsB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createSeededRng("seed-a");
    const b = createSeededRng("seed-b");
    const drawsA = Array.from({ length: 20 }, () => a.nextUint32());
    const drawsB = Array.from({ length: 20 }, () => b.nextUint32());
    expect(drawsA).not.toEqual(drawsB);
  });
});

describe("randomInt unbiased sampling", () => {
  it("never returns a value outside [0, maxExclusive)", () => {
    const rng = createSeededRng("bounds-check");
    for (let i = 0; i < 10_000; i++) {
      const value = rng.randomInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });

  it("throws on invalid maxExclusive", () => {
    const rng = createSeededRng("invalid-check");
    expect(() => rng.randomInt(0)).toThrow();
    expect(() => rng.randomInt(-1)).toThrow();
    expect(() => rng.randomInt(1.5)).toThrow();
  });

  it("distributes uniformly across buckets (chi-square goodness of fit)", () => {
    const rng = createSeededRng("chi-square-seed");
    const buckets = 6;
    const samples = 120_000;
    const counts = new Array(buckets).fill(0);
    for (let i = 0; i < samples; i++) {
      counts[rng.randomInt(buckets)]++;
    }
    const expected = samples / buckets;
    const chiSquare = counts.reduce((sum, observed) => {
      const diff = observed - expected;
      return sum + (diff * diff) / expected;
    }, 0);
    // Critical value for chi-square with 5 degrees of freedom at p=0.001 is ~20.5.
    // A true uniform generator will fail this extremely rarely; a biased one fails reliably.
    expect(chiSquare).toBeLessThan(20.5);
  });

  it("distributes uniformly for a non-power-of-two range (modulo-bias check)", () => {
    const rng = createSeededRng("modulo-bias-seed");
    const buckets = 37; // deliberately does not divide 2^32
    const samples = 370_000;
    const counts = new Array(buckets).fill(0);
    for (let i = 0; i < samples; i++) {
      counts[rng.randomInt(buckets)]++;
    }
    const expected = samples / buckets;
    const chiSquare = counts.reduce((sum, observed) => {
      const diff = observed - expected;
      return sum + (diff * diff) / expected;
    }, 0);
    // 36 degrees of freedom, p=0.001 critical value is ~67.99.
    expect(chiSquare).toBeLessThan(68);
  });
});

describe("createSecureRng", () => {
  it("produces values within bounds and is not trivially constant", () => {
    const rng = createSecureRng();
    const values = new Set<number>();
    for (let i = 0; i < 500; i++) {
      const value = rng.randomInt(1000);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1000);
      values.add(value);
    }
    expect(values.size).toBeGreaterThan(100);
  });
});
