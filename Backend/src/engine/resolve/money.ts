// Paytable multipliers are decimals (e.g. 0.2). Money is integer minor units (bigint), so
// multipliers are scaled to an integer fixed-point representation before multiplying, and
// the result is floored back down to whole minor units — never floats touch the money.
const MULTIPLIER_PRECISION = 1_000_000n;

export function applyMultiplier(totalBet: bigint, ways: number, multiplier: number): bigint {
  const scaledMultiplier = BigInt(Math.round(multiplier * Number(MULTIPLIER_PRECISION)));
  return (totalBet * BigInt(ways) * scaledMultiplier) / MULTIPLIER_PRECISION;
}
