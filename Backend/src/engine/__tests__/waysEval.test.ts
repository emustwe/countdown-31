import { describe, expect, it } from "vitest";
import { evaluateWays } from "../resolve/waysEval";
import { evaluateScatter } from "../resolve/scatter";
import { evaluateJackpot } from "../resolve/jackpot";
import { getMathModel } from "../models";
import type { SymbolId } from "../model/mathModel";

const model = getMathModel("aurora-ways-96");
const tournamentModel = getMathModel("aurora-ways-tournament");

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
      ["H1", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const wins = evaluateWays(g, model, 1000n);
    const h1 = wins.find((w) => w.symbol === "H1");
    expect(h1?.matchLength).toBe(3);
    expect(h1?.ways).toBe(2); // 2 on reel 1, 1 on reel 2, 1 on reel 3
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
      ["H1", "H2", "H2", "H2", "H2"],
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

describe("evaluateJackpot", () => {
  it("never awards a jackpot on a model with no jackpot configured", () => {
    const allJp: SymbolId[] = ["JP", "JP", "JP", "JP", "JP"];
    const g = grid([allJp, allJp, allJp, allJp, allJp]);
    const result = evaluateJackpot(g, model, 1000n);
    expect(result.tier).toBeNull();
    expect(result.pay).toBe(0n);
  });

  it("does not trigger below 3 jackpot symbols", () => {
    const g = grid([
      ["JP", "L1", "L1", "L1", "L1"],
      ["JP", "L2", "L2", "L2", "L2"],
      ["L3", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const result = evaluateJackpot(g, tournamentModel, 1000n);
    expect(result.count).toBe(2);
    expect(result.tier).toBeNull();
    expect(result.pay).toBe(0n);
  });

  it("awards the Mini tier for exactly 3, anywhere on the grid", () => {
    const g = grid([
      ["JP", "L1", "L1", "L1", "L1"],
      ["L2", "L2", "L2", "L2", "L2"],
      ["JP", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "JP"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const result = evaluateJackpot(g, tournamentModel, 1000n);
    expect(result.count).toBe(3);
    expect(result.tier).toBe(3);
    expect(result.pay).toBe(3000n); // 1000 bet * 1 way * 3x
  });

  it("awards the Mega tier for 5, and the wild does not substitute for the jackpot symbol", () => {
    const g = grid([
      ["JP", "W", "W", "W", "W"],
      ["JP", "W", "W", "W", "W"],
      ["JP", "W", "W", "W", "W"],
      ["JP", "W", "W", "W", "W"],
      ["JP", "W", "W", "W", "W"],
    ]);
    const result = evaluateJackpot(g, tournamentModel, 1000n);
    expect(result.count).toBe(5);
    expect(result.tier).toBe(5);
    expect(result.pay).toBe(200_000n); // 1000 bet * 1 way * 200x
  });
});
