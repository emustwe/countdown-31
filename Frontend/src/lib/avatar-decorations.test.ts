import { describe, expect, it } from "vitest";
import { AVATAR_BACKGROUNDS, AVATAR_FRAMES, getAvatarBackground, getAvatarFrame } from "./avatar-decorations";

describe("avatar decorations", () => {
  it("adds ten new backgrounds", () => {
    expect(AVATAR_BACKGROUNDS.filter((item) => item.isNew)).toHaveLength(10);
    expect(new Set(AVATAR_BACKGROUNDS.map((item) => item.id)).size).toBe(AVATAR_BACKGROUNDS.length);
  });

  it("adds ten new frames", () => {
    expect(AVATAR_FRAMES.filter((item) => item.isNew)).toHaveLength(10);
    expect(new Set(AVATAR_FRAMES.map((item) => item.id)).size).toBe(AVATAR_FRAMES.length);
  });

  it("falls back to safe defaults", () => {
    expect(getAvatarBackground(undefined).id).toBe("emerald");
    expect(getAvatarFrame(undefined).id).toBe("mythic_gold");
  });
});
