import { describe, expect, it } from "vitest";
import { MATH_MODELS } from "../models";

describe("shipped math models", () => {
  it("ships exactly the three documented models", () => {
    const ids = MATH_MODELS.map((m) => m.id).sort();
    expect(ids).toEqual(["aurora-ways-92", "aurora-ways-94", "aurora-ways-96"]);
  });

  it.each(MATH_MODELS)("$id has 5 non-empty reel strips and a full paytable", (model) => {
    expect(model.reelStrips).toHaveLength(5);
    for (const strip of model.reelStrips) {
      expect(strip.length).toBeGreaterThan(0);
    }
    for (const symbol of ["H1", "H2", "H3", "L1", "L2", "L3", "L4"] as const) {
      expect(model.paytable[symbol]).toHaveLength(4);
    }
  });
});
