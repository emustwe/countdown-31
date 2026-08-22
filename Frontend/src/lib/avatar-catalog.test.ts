import { describe, expect, it } from "vitest";
import { AVATAR_CHARACTER_IDS, AVATAR_VARIANTS, getAvatarVariant, resolveAvatarVariant } from "./avatar-catalog";

describe("avatar catalog", () => {
  it("contains four complete looks for every cow", () => {
    expect(AVATAR_VARIANTS).toHaveLength(16);
    for (const characterId of AVATAR_CHARACTER_IDS) {
      const looks = AVATAR_VARIANTS.filter((item) => item.characterId === characterId);
      expect(looks).toHaveLength(4);
      expect(new Set(looks.map((item) => `${item.hasHat}:${item.hasGlasses}`)).size).toBe(4);
    }
  });

  it.each([
    ["champion", false, false, "cow_v1_base"],
    ["daisy", false, true, "daisy_v1_glasses"],
    ["rusty", true, false, "rusty_v1_cowboy"],
    ["nova", true, true, "nova_v1_cowboy_glasses"],
  ] as const)("resolves %s hat=%s glasses=%s", (characterId, hat, glasses, expected) => {
    expect(resolveAvatarVariant(characterId, hat, glasses).id).toBe(expected);
  });

  it("falls back safely when an old or unknown ID is loaded", () => {
    expect(getAvatarVariant("retired_avatar").id).toBe("cow_v1_base");
    expect(getAvatarVariant(undefined).id).toBe("cow_v1_base");
  });

  it("uses cache-busted approved static renders for every accessory look", () => {
    const accessoryLooks = AVATAR_VARIANTS.filter((variant) => variant.hasHat || variant.hasGlasses);
    expect(accessoryLooks).toHaveLength(12);
    expect(accessoryLooks.every((variant) => /_static_v[12]\.webp$/.test(variant.image))).toBe(true);
  });
});
