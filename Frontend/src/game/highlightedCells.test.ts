import { describe, expect, it } from "vitest";
import { highlightedCells } from "./highlightedCells";
import type { Grid, WinLineDto } from "../lib/api-types";

function grid(columns: Grid): Grid {
  return columns;
}

describe("highlightedCells", () => {
  it("highlights the winning symbol across matchLength reels", () => {
    const g = grid([
      ["H1", "L1", "L1", "L1", "L1"],
      ["H1", "L2", "L2", "L2", "L2"],
      ["H1", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const lines: WinLineDto[] = [{ symbol: "H1", matchLength: 3, ways: 1, win: "100" }];

    const cells = highlightedCells(lines, g);

    expect(cells).toEqual(new Set(["0-0", "1-0", "2-0"]));
  });

  it("includes wild cells standing in for the winning symbol", () => {
    const g = grid([
      ["H1", "L1", "L1", "L1", "L1"],
      ["W", "L2", "L2", "L2", "L2"],
      ["H1", "L3", "L3", "L3", "L3"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const lines: WinLineDto[] = [{ symbol: "H1", matchLength: 3, ways: 1, win: "100" }];

    const cells = highlightedCells(lines, g);

    expect(cells.has("1-0")).toBe(true);
  });

  it("does not highlight reels beyond matchLength", () => {
    const g = grid([
      ["H1", "L1", "L1", "L1", "L1"],
      ["H1", "L2", "L2", "L2", "L2"],
      ["H1", "L3", "L3", "L3", "L3"],
      ["H1", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const lines: WinLineDto[] = [{ symbol: "H1", matchLength: 3, ways: 1, win: "100" }];

    const cells = highlightedCells(lines, g);

    expect(cells.has("3-0")).toBe(false);
  });

  it("unions cells across multiple simultaneous winning lines", () => {
    const g = grid([
      ["H1", "H2", "H2", "H2", "H2"],
      ["H1", "H2", "H2", "H2", "H2"],
      ["H1", "H2", "H2", "H2", "H2"],
      ["L4", "L4", "L4", "L4", "L4"],
      ["L4", "L4", "L4", "L4", "L4"],
    ]);
    const lines: WinLineDto[] = [
      { symbol: "H1", matchLength: 3, ways: 1, win: "100" },
      { symbol: "H2", matchLength: 3, ways: 1, win: "50" },
    ];

    const cells = highlightedCells(lines, g);

    expect(cells.has("0-0")).toBe(true);
    expect(cells.has("0-1")).toBe(true);
  });

  it("returns an empty set for no wins", () => {
    expect(highlightedCells([], [["H1"], ["L1"]])).toEqual(new Set());
  });
});
