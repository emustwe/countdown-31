import type { Grid, WinLineDto } from "../lib/api-types";

/** Reconstructs which grid cells contributed to the given win lines, purely from public
 * data already sent to the client (the grid + each line's symbol/matchLength) — the same
 * wild-substitution rule the server used to compute the win in the first place. */
export function highlightedCells(lines: WinLineDto[], grid: Grid): Set<string> {
  const cells = new Set<string>();
  for (const line of lines) {
    for (let reel = 0; reel < line.matchLength; reel++) {
      const column = grid[reel];
      if (!column) continue;
      for (let row = 0; row < column.length; row++) {
        if (column[row] === line.symbol || column[row] === "W") {
          cells.add(`${reel}-${row}`);
        }
      }
    }
  }
  return cells;
}
