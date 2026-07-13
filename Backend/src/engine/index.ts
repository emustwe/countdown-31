import { createRecordingRng, type Rng } from "./rng";
import type { MathModel, SymbolId } from "./model/mathModel";
import { fillGrid } from "./resolve/reelFill";
import { evaluateWays, type WinLine } from "./resolve/waysEval";
import { evaluateScatter } from "./resolve/scatter";

export { createSecureRng, createSeededRng, createTraceRng, createRecordingRng } from "./rng";
export type { Rng } from "./rng";
export { MathModelSchema, parseMathModel, SYMBOL_IDS, PAYING_SYMBOL_IDS } from "./model/mathModel";
export type { MathModel, SymbolId, PayingSymbolId } from "./model/mathModel";
export { loadMathModel } from "./model/loadModel";
export { MATH_MODELS, MATH_MODELS_BY_ID, getMathModel } from "./models";
export type { WinLine } from "./resolve/waysEval";

export interface SpinInput {
  model: MathModel;
  totalBet: bigint;
}

export interface SpinResult {
  grid: SymbolId[][];
  lines: WinLine[];
  scatterCount: number;
  totalWin: bigint;
  rngTrace: number[];
}

/**
 * Pure function of (model, bet, rng-sequence): the entire outcome is decided here, by
 * drawing from `rng`. Every raw draw (including draws rejected internally by unbiased
 * sampling) is recorded into rngTrace so the spin can be replayed byte-for-byte later by
 * feeding the trace into createTraceRng() and calling resolveSpin again.
 *
 * M1 scope: base game only (ways + wild + scatter). Free spins are added in M2 by
 * continuing to draw from the same rng inside this function.
 */
export function resolveSpin(input: SpinInput, rng: Rng): SpinResult {
  const { model, totalBet } = input;
  const { rng: recordingRng, trace } = createRecordingRng(rng);

  const grid = fillGrid(model, recordingRng);
  const lines = evaluateWays(grid, model, totalBet);
  const scatter = evaluateScatter(grid, model, totalBet);

  const linesWin = lines.reduce((sum, line) => sum + line.win, 0n);
  const totalWin = linesWin + scatter.pay;

  return {
    grid,
    lines,
    scatterCount: scatter.count,
    totalWin,
    rngTrace: trace,
  };
}
