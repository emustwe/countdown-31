import { describe, expect, it } from "vitest";
import { createSecureRng } from "../rng";
import { runSimulation } from "../simulate/simulate";
import { MATH_MODELS } from "../models";

const SPINS_PER_MODEL = 2_000_000;
const BET = 1000n;
// At ~2M spins the Monte Carlo standard error on RTP is roughly volatility/sqrt(N) ≈ 0.2pp
// for this game's volatility profile. A 2 percentage-point band is ~10 standard errors —
// wide enough to never flake from sampling noise, tight enough to catch a real regression
// in the model data or resolveSpin's math.
const RTP_TOLERANCE = 0.02;

describe("RTP convergence", () => {
  it.each(MATH_MODELS)(
    "$id converges to its target RTP within tolerance",
    (model) => {
      const rng = createSecureRng();
      const result = runSimulation(model, SPINS_PER_MODEL, BET, rng);

      const deviation = Math.abs(result.empiricalRtpTotal - model.targetRtp);
      expect(deviation).toBeLessThan(RTP_TOLERANCE);
    },
    30_000,
  );
});
