import { describe, expect, it } from "vitest";
import { AVATAR_VARIANTS } from "./avatar-catalog";
import { SHOP_CATALOG, STARTER_ITEM_KEYS, variantItemKey } from "./shop-catalog";

describe("shop catalog", () => {
  it("contains every ready-made avatar once", () => {
    const avatars = SHOP_CATALOG.filter((item) => item.category === "avatars");
    expect(avatars).toHaveLength(AVATAR_VARIANTS.length);
    expect(new Set(avatars.map((item) => item.key)).size).toBe(AVATAR_VARIANTS.length);
  });

  it("keeps the default avatar in the starter collection", () => {
    expect(STARTER_ITEM_KEYS.has(variantItemKey("cow_v1_base"))).toBe(true);
  });

  it("uses only the four USDT-backed item categories", () => {
    const categories = new Set(SHOP_CATALOG.map((item) => item.category));
    expect(categories).toEqual(new Set(["avatars", "backgrounds", "frames", "skills"]));
  });
});
