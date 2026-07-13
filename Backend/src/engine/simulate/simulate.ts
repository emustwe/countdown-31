import type { MathModel } from "../model/mathModel";
import type { Rng } from "../rng";
import { resolveSpin } from "../index";

export interface SimulationResult {
  spins: number;
  totalStaked: bigint;
  totalReturnedBase: bigint;
  totalReturnedFeature: bigint;
  totalReturned: bigint;
  empiricalRtpTotal: number;
  empiricalRtpBase: number;
  empiricalRtpFeature: number;
  hitCount: number;
  hitFrequency: number;
  featureHitCount: number;
  featureHitFrequency: number;
  maxWin: bigint;
  /** Standard deviation of (win / bet) per spin — a simple, comparable volatility figure. */
  volatilityIndex: number;
}

/**
 * Runs `spins` independent spins against `model`, drawing continuously from `rng`, and
 * accumulates the statistics needed to judge whether the model's actual behavior matches
 * its documented targetRtp. This is the source of truth for RTP — never trust a model's
 * targetRtp field without running this.
 *
 * Win/bet ratios are converted to plain numbers only for the volatility statistic, which is
 * diagnostic output, not money — all money accumulation above stays in bigint.
 */
export function runSimulation(model: MathModel, spins: number, bet: bigint, rng: Rng): SimulationResult {
  let totalReturnedBase = 0n;
  let totalReturnedFeature = 0n;
  let hitCount = 0;
  let featureHitCount = 0;
  let maxWin = 0n;
  let sumRatio = 0;
  let sumRatioSq = 0;

  const betAsNumber = Number(bet);

  for (let i = 0; i < spins; i++) {
    const result = resolveSpin({ model, totalBet: bet }, rng);
    const featureWin = result.feature?.featureWin ?? 0n;
    const baseWin = result.totalWin - featureWin;

    totalReturnedBase += baseWin;
    totalReturnedFeature += featureWin;

    if (result.totalWin > 0n) hitCount++;
    if (result.feature) featureHitCount++;
    if (result.totalWin > maxWin) maxWin = result.totalWin;

    const ratio = Number(result.totalWin) / betAsNumber;
    sumRatio += ratio;
    sumRatioSq += ratio * ratio;
  }

  const totalStaked = BigInt(spins) * bet;
  const totalReturned = totalReturnedBase + totalReturnedFeature;
  const mean = sumRatio / spins;
  const variance = Math.max(0, sumRatioSq / spins - mean * mean);

  return {
    spins,
    totalStaked,
    totalReturnedBase,
    totalReturnedFeature,
    totalReturned,
    empiricalRtpTotal: Number(totalReturned) / Number(totalStaked),
    empiricalRtpBase: Number(totalReturnedBase) / Number(totalStaked),
    empiricalRtpFeature: Number(totalReturnedFeature) / Number(totalStaked),
    hitCount,
    hitFrequency: hitCount / spins,
    featureHitCount,
    featureHitFrequency: featureHitCount / spins,
    maxWin,
    volatilityIndex: Math.sqrt(variance),
  };
}
