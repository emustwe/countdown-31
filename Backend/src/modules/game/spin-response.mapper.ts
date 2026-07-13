import type { SpinResult, WinLine } from "../../engine";

export function serializeLine(line: WinLine) {
  return { symbol: line.symbol, matchLength: line.matchLength, ways: line.ways, win: line.win.toString() };
}

export interface SpinApiResponse {
  roundId: string;
  newBalance: string;
  totalBet: string;
  totalWin: string;
  base: {
    grid: SpinResult["grid"];
    lines: ReturnType<typeof serializeLine>[];
    scatterCount: number;
    win: string;
  };
  feature?: {
    type: "FREE_SPINS";
    awarded: number;
    retriggers: number;
    featureWin: string;
    spins: Array<{
      grid: SpinResult["grid"];
      lines: ReturnType<typeof serializeLine>[];
      scatterCount: number;
      win: string;
      multiplier: number;
      retriggered: boolean;
    }>;
  };
  freeSpinsRemaining: number;
  state: "FEATURE" | "COMPLETE";
}

/** Builds the client-facing response for a resolved round. Deliberately omits rngTrace —
 * that never leaves the server for a non-admin caller. */
export function toSpinApiResponse(
  roundId: string,
  newBalance: bigint,
  totalBet: bigint,
  result: SpinResult,
): SpinApiResponse {
  const featureWin = result.feature?.featureWin ?? 0n;
  const baseWin = result.totalWin - featureWin;
  const freeSpinsRemaining = result.feature?.spins.length ?? 0;

  return {
    roundId,
    newBalance: newBalance.toString(),
    totalBet: totalBet.toString(),
    totalWin: result.totalWin.toString(),
    base: {
      grid: result.grid,
      lines: result.lines.map(serializeLine),
      scatterCount: result.scatterCount,
      win: baseWin.toString(),
    },
    feature: result.feature
      ? {
          type: result.feature.type,
          awarded: result.feature.awarded,
          retriggers: result.feature.retriggers,
          featureWin: result.feature.featureWin.toString(),
          spins: result.feature.spins.map((step) => ({
            grid: step.grid,
            lines: step.lines.map(serializeLine),
            scatterCount: step.scatterCount,
            win: step.win.toString(),
            multiplier: step.multiplier,
            retriggered: step.retriggered,
          })),
        }
      : undefined,
    freeSpinsRemaining,
    state: freeSpinsRemaining > 0 ? "FEATURE" : "COMPLETE",
  };
}
