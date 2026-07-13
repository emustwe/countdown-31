import type { MathModel, SymbolId } from "../model/mathModel";
import { applyMultiplier } from "./money";

export interface ScatterResult {
  count: number;
  pay: bigint;
  freeSpinsAwarded: number;
}

export function evaluateScatter(
  grid: SymbolId[][],
  model: MathModel,
  totalBet: bigint,
): ScatterResult {
  let count = 0;
  for (const column of grid) {
    for (const cell of column) {
      if (cell === model.scatter) count++;
    }
  }

  let pay = 0n;
  if (count >= 3) {
    const payIndex = Math.min(count - 3, model.scatterPays.length - 1);
    const multiplier = model.scatterPays[payIndex] ?? 0;
    if (multiplier > 0) {
      pay = applyMultiplier(totalBet, 1, multiplier);
    }
  }

  let freeSpinsAwarded = 0;
  if (count === 3) freeSpinsAwarded = model.freeSpins.award[3];
  else if (count === 4) freeSpinsAwarded = model.freeSpins.award[4];
  else if (count >= 5) freeSpinsAwarded = model.freeSpins.award[5];

  return { count, pay, freeSpinsAwarded };
}
