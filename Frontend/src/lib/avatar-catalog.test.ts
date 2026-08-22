import { describe, expect, it } from "vitest";
import { AVATAR_VARIANTS, getAvatarVariant, resolveAvatarVariant } from "./avatar-catalog";

describe("avatar catalog", () => {
  it("contains every hat and glasses combination exactly once", () => {
    expect(AVATAR_VARIANTS).toHaveLength(4);
    expect(new Set(AVATAR_VARIANTS.map((item) => `${item.hasHat}:${item.hasGlasses}`)).size).toBe(4);
  });

  it.each([
    [false, false, "cow_v1_base"],
    [false, true, "cow_v1_glasses"],
    [true, false, "cow_v1_cowboy"],
    [true, true, "cow_v1_cowboy_glasses"],
  ])("resolves hat=%s glasses=%s", (hat, glasses, expected) => {
    expect(resolveAvatarVariant(hat, glasses).id).toBe(expected);
  });

  it("falls back safely when an old or unknown ID is loaded", () => {
    expect(getAvatarVariant("retired_avatar").id).toBe("cow_v1_base");
    expect(getAvatarVariant(undefined).id).toBe("cow_v1_base");
  });
});
