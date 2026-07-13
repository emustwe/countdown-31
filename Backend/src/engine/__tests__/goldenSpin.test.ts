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
      ["S", "H1", "H2", "H3", "L1"],
      ["H2", "H3", "L1", "L2", "L3"],
      ["L2", "L3", "W", "S", "H1"],
      ["W", "S", "H1", "H2", "H3"],
      ["L4", "L1", "L2", "L3", "L4"],
    ]);
    expect(result.scatterCount).toBe(3);
    expect(result.feature).toBeDefined();
    expect(result.totalWin).toBe(1788n);
    expect(result.rngTrace.slice(0, 5)).toEqual([
      1911623544, 2282084821, 470340243, 2333507853, 1624893303,
    ]);

    const bySymbol = Object.fromEntries(result.lines.map((l) => [l.symbol, l]));
    expect(bySymbol["H2"]).toMatchObject({ matchLength: 4, ways: 2, win: 128n });
    expect(bySymbol["H3"]).toMatchObject({ matchLength: 4, ways: 2, win: 82n });
    expect(bySymbol["L1"]).toMatchObject({ matchLength: 5, ways: 1, win: 102n });
  });
});
