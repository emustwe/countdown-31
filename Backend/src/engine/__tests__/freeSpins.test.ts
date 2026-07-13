import { describe, expect, it } from "vitest";
import { createSeededRng, createTraceRng, resolveSpin } from "../index";
import { getMathModel } from "../models";

const model = getMathModel("aurora-ways-96");

describe("free spins feature", () => {
  it("triggers on 3+ scatters, awards spins per the model, and applies a rising multiplier", () => {
    const result = resolveSpin({ model, totalBet: 1000n }, createSeededRng("fs2-search-7"));

    expect(result.scatterCount).toBe(3);
    expect(result.feature).toBeDefined();
    expect(result.feature?.awarded).toBe(model.freeSpins.award[3]);
    expect(result.feature?.spins).toHaveLength(model.freeSpins.award[3]);

    const multipliers = result.feature?.spins.map((s) => s.multiplier) ?? [];
    expect(multipliers[0]).toBe(model.freeSpins.startMultiplier);
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeGreaterThanOrEqual(multipliers[i - 1] as number);
      expect(multipliers[i]).toBeLessThanOrEqual(model.freeSpins.maxMultiplier);
    }

    const summedStepWins = result.feature?.spins.reduce((sum, s) => sum + s.win, 0n) ?? 0n;
    expect(summedStepWins).toBe(result.feature?.featureWin);
    expect(result.totalWin).toBeGreaterThanOrEqual(result.feature?.featureWin ?? 0n);
  });

  it("retriggers additional free spins on 3+ scatters during the feature", () => {
    const result = resolveSpin({ model, totalBet: 1000n }, createSeededRng("fs2-search-37"));

    expect(result.feature).toBeDefined();
    expect(result.feature?.retriggers).toBeGreaterThan(0);
    expect(result.feature?.spins.length).toBeGreaterThan(result.feature?.awarded ?? 0);

    const retriggeringSteps = result.feature?.spins.filter((s) => s.retriggered) ?? [];
    expect(retriggeringSteps.length).toBe(result.feature?.retriggers);
  });

  it("free spins are included in the recorded rngTrace and replay byte-for-byte", () => {
    const original = resolveSpin({ model, totalBet: 1000n }, createSeededRng("fs2-search-37"));
    const replayed = resolveSpin({ model, totalBet: 1000n }, createTraceRng(original.rngTrace));

    expect(replayed).toEqual(original);
  });

  it("does not trigger a feature on a spin with fewer than 3 scatters", () => {
    const result = resolveSpin({ model, totalBet: 1000n }, createSeededRng("golden-seed-1"));
    expect(result.scatterCount).toBeLessThan(3);
    expect(result.feature).toBeUndefined();
  });
});
