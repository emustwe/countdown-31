import { describe, expect, it } from "vitest";
import {
  SHOP_CATALOG_KEYS,
  SHOP_CURRENCY,
  catalogPrices,
  isValidItemKey,
  priceForItem,
} from "./shop-items";

describe("shop item catalog", () => {
  it("keeps starter cosmetics free", () => {
    expect(priceForItem("avatar:variant:cow_v1_base")).toBe(0n);
    expect(priceForItem("avatar:background:emerald")).toBe(0n);
    expect(priceForItem("avatar:frame:mythic_gold")).toBe(0n);
  });

  it("publishes stable and varied USDT prices for every catalog item", () => {
    const first = catalogPrices();
    const second = catalogPrices();
    expect(SHOP_CURRENCY).toBe("USDT");
    expect(first).toEqual(second);
    expect(Object.keys(first)).toHaveLength(SHOP_CATALOG_KEYS.length);
    expect(new Set(Object.values(first).filter((price) => price !== "0")).size).toBeGreaterThan(1);
  });

  it("uses valid, purchasable keys throughout the catalog", () => {
    for (const key of SHOP_CATALOG_KEYS) {
      expect(isValidItemKey(key)).toBe(true);
      expect(priceForItem(key)).not.toBeNull();
    }
  });
});
