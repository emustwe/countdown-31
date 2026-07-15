import type { Rng } from "../rng";
import type { MathModel, SymbolId } from "../model/mathModel";
import { fillGrid } from "./reelFill";
import { evaluateWays, type WinLine } from "./waysEval";
import { evaluateScatter } from "./scatter";
import { evaluateJackpot, type JackpotResult } from "./jackpot";
import { applyMultiplier } from "./money";

export interface FreeSpinStep {
  grid: SymbolId[][];
  lines: WinLine[];
  scatterCount: number;
  win: bigint;
  multiplier: number;
  retriggered: boolean;
  jackpot?: JackpotResult;
}

export interface FeatureResult {
  type: "FREE_SPINS";
  awarded: number;
  spins: FreeSpinStep[];
  featureWin: bigint;
  retriggers: number;
}

// Defensive backstop against a misconfigured model (e.g. guaranteed retrigger) looping
// forever. Far above anything a correct math model would ever reach.
const MAX_FREE_SPINS_SAFETY_CAP = 100_000;

/**
 * Continues drawing from the same rng used for the base spin, so base + feature is one
 * deterministic sequence. Each free spin costs no stake, applies the current progressive
 * multiplier to its win, and can retrigger more spins per the model's rules.
 */
export function resolveFreeSpins(
  model: MathModel,
  totalBet: bigint,
  initialAwarded: number,
  rng: Rng,
): FeatureResult {
  const steps: FreeSpinStep[] = [];
  let remaining = initialAwarded;
  let multiplier = model.freeSpins.startMultiplier;
  let retriggers = 0;
  let featureWin = 0n;
  let played = 0;

  while (remaining > 0) {
    if (played >= MAX_FREE_SPINS_SAFETY_CAP) {
      throw new Error(
        `resolveFreeSpins exceeded safety cap of ${MAX_FREE_SPINS_SAFETY_CAP} spins — check model.freeSpins.retrigger config`,
      );
    }

    const grid = fillGrid(model, rng);
    const lines = evaluateWays(grid, model, totalBet);
    const scatter = evaluateScatter(grid, model, totalBet);
    const jackpot = evaluateJackpot(grid, model, totalBet);
    const rawWin = lines.reduce((sum, line) => sum + line.win, 0n) + scatter.pay + jackpot.pay;
    const win = applyMultiplier(rawWin, 1, multiplier);
    featureWin += win;

    let retriggered = false;
    if (model.freeSpins.retrigger && scatter.freeSpinsAwarded > 0) {
      remaining += scatter.freeSpinsAwarded;
      retriggers++;
      retriggered = true;
    }

    // Report the jackpot's *actual* multiplier-adjusted share of `win`, not its raw
    // pre-multiplier pay — callers (ledger bookkeeping, the frontend banner) need the real
    // credited amount, and `win` was computed by multiplying the combined rawWin as a whole.
    const jackpotReport: JackpotResult | undefined = jackpot.tier
      ? { ...jackpot, pay: applyMultiplier(jackpot.pay, 1, multiplier) }
      : undefined;

    steps.push({
      grid,
      lines,
      scatterCount: scatter.count,
      win,
      multiplier,
      retriggered,
      jackpot: jackpotReport,
    });

    played++;
    remaining--;
    multiplier = Math.min(multiplier + model.freeSpins.multiplierStep, model.freeSpins.maxMultiplier);
  }

  return { type: "FREE_SPINS", awarded: initialAwarded, spins: steps, featureWin, retriggers };
}
