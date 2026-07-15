import type { MathModel, SymbolId } from "../model/mathModel";
import { applyMultiplier } from "./money";

export interface JackpotResult {
  count: number;
  tier: 3 | 4 | 5 | null;
  pay: bigint;
}

const NO_JACKPOT: JackpotResult = { count: 0, tier: null, pay: 0n };

/**
 * Counts the model's jackpot symbol anywhere on the grid — like the scatter, this ignores
 * reel adjacency entirely, and the wild does not substitute for it. Models without a
 * `jackpot` block (the original realistic-RTP models) simply never award one.
 */
export function evaluateJackpot(
  grid: SymbolId[][],
  model: MathModel,
  totalBet: bigint,
): JackpotResult {
  if (!model.jackpot) return NO_JACKPOT;

  let count = 0;
  for (const column of grid) {
    for (const cell of column) {
      if (cell === model.jackpot.symbol) count++;
    }
  }

  if (count < 3) return { count, tier: null, pay: 0n };

  const tier: 3 | 4 | 5 = count === 3 ? 3 : count === 4 ? 4 : 5;
  const multiplier = model.jackpot.pays[tier];
  const pay = applyMultiplier(totalBet, 1, multiplier);

  return { count, tier, pay };
}
