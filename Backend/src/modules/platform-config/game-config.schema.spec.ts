import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_CONFIG, GameConfigSchema } from "./game-config.schema";

describe("GameConfigSchema", () => {
  it("accepts the shipped game configuration", () => {
    expect(GameConfigSchema.parse(DEFAULT_GAME_CONFIG)).toEqual(DEFAULT_GAME_CONFIG);
  });

  it("keeps at least one bot available", () => {
    const config = structuredClone(DEFAULT_GAME_CONFIG);
    config.bots.forEach((bot) => {
      bot.enabled = false;
    });

    expect(GameConfigSchema.safeParse(config).success).toBe(false);
  });

  it("rejects an impossible bot timing range", () => {
    const config = structuredClone(DEFAULT_GAME_CONFIG);
    config.gameplay.botThinkMinMs = 4_000;
    config.gameplay.botThinkMaxMs = 1_000;

    expect(GameConfigSchema.safeParse(config).success).toBe(false);
  });

  it("requires the selected default mode to remain enabled", () => {
    const config = structuredClone(DEFAULT_GAME_CONFIG);
    config.gameplay.allowSkills = false;
    config.gameplay.defaultMode = "skills";

    expect(GameConfigSchema.safeParse(config).success).toBe(false);
  });
});
