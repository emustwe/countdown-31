import { describe, expect, it } from "vitest";
import { createSeededRng, createTraceRng, resolveSpin } from "../index";
import { getMathModel } from "../models";

describe("replay", () => {
  it("reproduces an identical result from a stored rngTrace", () => {
    const model = getMathModel("aurora-ways-96");
    const original = resolveSpin({ model, totalBet: 1000n }, createSeededRng("replay-seed-1"));

    const replayed = resolveSpin({ model, totalBet: 1000n }, createTraceRng(original.rngTrace));

    expect(replayed.grid).toEqual(original.grid);
    expect(replayed.lines).toEqual(original.lines);
    expect(replayed.scatterCount).toBe(original.scatterCount);
    expect(replayed.totalWin).toBe(original.totalWin);
    expect(replayed.rngTrace).toEqual(original.rngTrace);
  });

  it("is deterministic: same seed + same bet always resolves identically", () => {
    const model = getMathModel("aurora-ways-96");
    const a = resolveSpin({ model, totalBet: 500n }, createSeededRng("determinism-seed"));
    const b = resolveSpin({ model, totalBet: 500n }, createSeededRng("determinism-seed"));
    expect(a).toEqual(b);
  });
});
