import { PAYING_SYMBOL_IDS, type MathModel, type PayingSymbolId, type SymbolId } from "../model/mathModel";
import { applyMultiplier } from "./money";

export interface WinLine {
  symbol: PayingSymbolId;
  matchLength: number;
  ways: number;
  win: bigint;
}

/**
 * All-ways evaluation: each paying symbol is evaluated independently across the grid,
 * walking reels left-to-right and counting matches (the symbol itself or a wild) until a
 * reel has none. Ways for that symbol = product of per-reel match counts. Wilds substitute
 * for every paying symbol simultaneously, but a chain made up entirely of wilds (no actual
 * instance of the symbol anywhere in it) does not pay — it isn't "the symbol", it's just wilds.
 */
export function evaluateWays(
  grid: SymbolId[][],
  model: MathModel,
  totalBet: bigint,
): WinLine[] {
  const wins: WinLine[] = [];

  for (const symbol of PAYING_SYMBOL_IDS) {
    let matchLength = 0;
    let ways = 1;
    let sawActualSymbol = false;

    for (const column of grid) {
      let countThisReel = 0;
      let reelHasActualSymbol = false;
      for (const cell of column) {
        if (cell === symbol) {
          countThisReel++;
          reelHasActualSymbol = true;
        } else if (cell === model.wild) {
          countThisReel++;
        }
      }
      if (countThisReel === 0) break;
      matchLength++;
      ways *= countThisReel;
      if (reelHasActualSymbol) sawActualSymbol = true;
    }

    if (matchLength < 2 || !sawActualSymbol) continue;

    const payRow = model.paytable[symbol];
    const multiplier = payRow?.[matchLength - 2] ?? 0;
    if (multiplier <= 0) continue;

    const win = applyMultiplier(totalBet, ways, multiplier);
    if (win > 0n) {
      wins.push({ symbol, matchLength, ways, win });
    }
  }

  return wins;
}
