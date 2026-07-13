import type { Rng } from "../rng";
import type { MathModel, SymbolId } from "../model/mathModel";

/** grid[reelIndex][rowIndex] — 5 columns (reels) of 5 symbols each. */
export function fillGrid(model: MathModel, rng: Rng): SymbolId[][] {
  const { reels, rows } = model.grid;
  const grid: SymbolId[][] = [];
  for (let reelIndex = 0; reelIndex < reels; reelIndex++) {
    const strip = model.reelStrips[reelIndex];
    if (!strip || strip.length === 0) {
      throw new Error(`Missing or empty reel strip for reel ${reelIndex}`);
    }
    const stop = rng.randomInt(strip.length);
    const column: SymbolId[] = [];
    for (let row = 0; row < rows; row++) {
      const symbol = strip[(stop + row) % strip.length];
      if (!symbol) throw new Error(`Reel strip ${reelIndex} produced an undefined symbol`);
      column.push(symbol);
    }
    grid.push(column);
  }
  return grid;
}
