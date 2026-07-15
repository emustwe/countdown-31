import { createRecordingRng, type Rng } from "./rng";
import type { MathModel, SymbolId } from "./model/mathModel";
import { fillGrid } from "./resolve/reelFill";
import { evaluateWays, type WinLine } from "./resolve/waysEval";
import { evaluateScatter } from "./resolve/scatter";
import { evaluateJackpot, type JackpotResult } from "./resolve/jackpot";
import { resolveFreeSpins, type FeatureResult } from "./resolve/freeSpins";

export { createSecureRng, createSeededRng, createTraceRng, createRecordingRng } from "./rng";
export type { Rng } from "./rng";
export { MathModelSchema, parseMathModel, SYMBOL_IDS, PAYING_SYMBOL_IDS } from "./model/mathModel";
export type { MathModel, SymbolId, PayingSymbolId } from "./model/mathModel";
export { loadMathModel } from "./model/loadModel";
export { MATH_MODELS, MATH_MODELS_BY_ID, getMathModel } from "./models";
export type { WinLine } from "./resolve/waysEval";
export type { JackpotResult } from "./resolve/jackpot";
export type { FeatureResult, FreeSpinStep } from "./resolve/freeSpins";

export interface SpinInput {
  model: MathModel;
  totalBet: bigint;
}

export interface SpinResult {
  grid: SymbolId[][];
  lines: WinLine[];
  scatterCount: number;
  totalWin: bigint;
  feature?: FeatureResult;
  jackpot?: JackpotResult;
  rngTrace: number[];
}

/**
 * Pure function of (model, bet, rng-sequence): the entire outcome — base spin and, if
 * triggered, the whole free-spins feature — is decided here by drawing from `rng`. Every
 * raw draw (including draws rejected internally by unbiased sampling) is recorded into
 * rngTrace so the spin can be replayed byte-for-byte later by feeding the trace into
 * createTraceRng() and calling resolveSpin again.
 */
export function resolveSpin(input: SpinInput, rng: Rng): SpinResult {
  const { model, totalBet } = input;
  const { rng: recordingRng, trace } = createRecordingRng(rng);

  const grid = fillGrid(model, recordingRng);
  const lines = evaluateWays(grid, model, totalBet);
  const scatter = evaluateScatter(grid, model, totalBet);
  const jackpot = evaluateJackpot(grid, model, totalBet);

  const linesWin = lines.reduce((sum, line) => sum + line.win, 0n);
  let totalWin = linesWin + scatter.pay + jackpot.pay;

  let feature: FeatureResult | undefined;
  if (scatter.freeSpinsAwarded > 0) {
    feature = resolveFreeSpins(model, totalBet, scatter.freeSpinsAwarded, recordingRng);
    totalWin += feature.featureWin;
  }

  return {
    grid,
    lines,
    scatterCount: scatter.count,
    totalWin,
    feature,
    jackpot: jackpot.tier ? jackpot : undefined,
    rngTrace: trace,
  };
}
