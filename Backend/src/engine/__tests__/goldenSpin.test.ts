import { describe, expect, it } from "vitest";
import { createSeededRng, resolveSpin } from "../index";
import { getMathModel } from "../models";

// Pinned reference output for seed "golden-seed-1" on aurora-ways-96 at a 1000 minor-unit
// bet. If this ever changes, either resolveSpin's logic or the model data changed — both
// are meaningful regressions to catch, so this value is intentionally hardcoded rather than
// computed inline.
describe("golden spin", () => {
  it("resolves seed 'golden-seed-1' on aurora-ways-96 to the pinned reference result", () => {
    const model = getMathModel("aurora-ways-96");
    const result = resolveSpin({ model, totalBet: 1000n }, createSeededRng("golden-seed-1"));

    expect(result.grid).toEqual([
      ["H2", "L1", "L2", "L3", "L4"],
      ["L3", "L4", "W", "H2", "L1"],
      ["L1", "L2", "L3", "L4", "W"],
      ["L3", "L4", "W", "S", "H1"],
      ["W", "H2", "L1", "L2", "L3"],
    ]);
    expect(result.scatterCount).toBe(1);
    expect(result.totalWin).toBe(160000n);
    expect(result.rngTrace).toEqual([
      1911623544, 2282084821, 470340243, 2333507853, 1624893303,
    ]);

    const bySymbol = Object.fromEntries(result.lines.map((l) => [l.symbol, l]));
    expect(bySymbol["H2"]).toMatchObject({ matchLength: 5, ways: 4, win: 60000n });
    expect(bySymbol["L1"]).toMatchObject({ matchLength: 5, ways: 8, win: 32000n });
    expect(bySymbol["L2"]).toMatchObject({ matchLength: 5, ways: 4, win: 12000n });
    expect(bySymbol["L3"]).toMatchObject({ matchLength: 5, ways: 16, win: 40000n });
    expect(bySymbol["L4"]).toMatchObject({ matchLength: 5, ways: 8, win: 16000n });
  });
});
