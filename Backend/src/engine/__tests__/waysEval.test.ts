import { describe, expect, it } from "vitest";
import { evaluateWays } from "../resolve/waysEval";
import { evaluateScatter } from "../resolve/scatter";
import { getMathModel } from "../models";
import type { SymbolId } from "../model/mathModel";

const model = getMathModel("aurora-ways-96");

function grid(columns: SymbolId[][]): SymbolId[][] {
  return columns;
}

describe("evaluateWays", () => {
  it("pays a simple 3-of-a-kind straight match with ways = 1x1x1", () => {
    const g = grid([
      ["H1", "L1", "L1", "L1", "L1"],
      ["H1", "L2", "L2", "L2", "L2"],
      ["H1", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const wins = evaluateWays(g, model, 1000n);
    const h1 = wins.find((w) => w.symbol === "H1");
    expect(h1).toBeDefined();
    expect(h1?.matchLength).toBe(3);
    expect(h1?.ways).toBe(1);
  });

  it("multiplies ways when a symbol appears more than once on a reel", () => {
    const g = grid([
      ["H1", "H1", "L1", "L1", "L1"],
      ["H1", "L2", "L2", "L2", "L2"],
      ["L3", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const wins = evaluateWays(g, model, 1000n);
    const h1 = wins.find((w) => w.symbol === "H1");
    expect(h1?.matchLength).toBe(2);
    expect(h1?.ways).toBe(2); // 2 on reel 1, 1 on reel 2
  });

  it("lets wilds extend a chain and substitute for the paying symbol", () => {
    const g = grid([
      ["H1", "L1", "L1", "L1", "L1"],
      ["W", "L2", "L2", "L2", "L2"],
      ["H1", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const wins = evaluateWays(g, model, 1000n);
    const h1 = wins.find((w) => w.symbol === "H1");
    expect(h1?.matchLength).toBe(3);
  });

  it("does not pay a chain made up entirely of wilds", () => {
    const allWilds: SymbolId[] = ["W", "W", "W", "W", "W"];
    const g = grid([allWilds, allWilds, allWilds, allWilds, allWilds]);
    const wins = evaluateWays(g, model, 1000n);
    expect(wins).toHaveLength(0);
  });

  it("breaks the chain at the first reel with no match", () => {
    const g = grid([
      ["H1", "L1", "L1", "L1", "L1"],
      ["L2", "L2", "L2", "L2", "L2"],
      ["H1", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const wins = evaluateWays(g, model, 1000n);
    const h1 = wins.find((w) => w.symbol === "H1");
    expect(h1).toBeUndefined(); // reel 2 has no H1/W, so the chain breaks at length 1
  });

  it("sums wins across multiple independently-paying symbols", () => {
    const g = grid([
      ["H1", "H2", "H2", "H2", "H2"],
      ["H1", "H2", "H2", "H2", "H2"],
      ["L3", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const wins = evaluateWays(g, model, 1000n);
    expect(wins.find((w) => w.symbol === "H1")).toBeDefined();
    expect(wins.find((w) => w.symbol === "H2")).toBeDefined();
  });
});

describe("evaluateScatter", () => {
  it("does not trigger below 3 scatters", () => {
    const g = grid([
      ["S", "L1", "L1", "L1", "L1"],
      ["S", "L2", "L2", "L2", "L2"],
      ["L3", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const result = evaluateScatter(g, model, 1000n);
    expect(result.count).toBe(2);
    expect(result.freeSpinsAwarded).toBe(0);
  });

  it("awards free spins for 3+ scatters anywhere on the grid, regardless of adjacency", () => {
    const g = grid([
      ["S", "L1", "L1", "L1", "L1"],
      ["L2", "L2", "L2", "L2", "L2"],
      ["S", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "S"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const result = evaluateScatter(g, model, 1000n);
    expect(result.count).toBe(3);
    expect(result.freeSpinsAwarded).toBe(model.freeSpins.award[3]);
  });
});
