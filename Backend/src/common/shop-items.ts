// Shop item model. Every avatar feature value, card attribute value, and board skin is an "item"
// identified by a stable key. Basic/default items are FREE for everyone (owned implicitly);
// everything else must be purchased (see ShopService). Kept in one place so the purchase flow and
// the equip validation agree on prices, keys, and what's free.

export const SHOP_ITEM_PRICE = 500_000n; // Backward-compatible fallback: 0.5 USDT (6 decimals).
export const SHOP_CURRENCY = "USDT" as const;

const AVATAR_VARIANT_IDS = [
  "cow_v1_base",
  "cow_v1_glasses",
  "cow_v1_cowboy",
  "cow_v1_cowboy_glasses",
  "daisy_v1_base",
  "daisy_v1_glasses",
  "daisy_v1_cowboy",
  "daisy_v1_cowboy_glasses",
  "rusty_v1_base",
  "rusty_v1_glasses",
  "rusty_v1_cowboy",
  "rusty_v1_cowboy_glasses",
  "nova_v1_base",
  "nova_v1_glasses",
  "nova_v1_cowboy",
  "nova_v1_cowboy_glasses",
  "luna_v1_base",
  "luna_v1_glasses",
  "luna_v1_cowboy",
  "luna_v1_cowboy_glasses",
  "moss_v1_base",
  "moss_v1_glasses",
  "moss_v1_cowboy",
  "moss_v1_cowboy_glasses",
] as const;
const AVATAR_BACKGROUND_IDS = [
  "emerald",
  "golden",
  "cyber",
  "inferno",
  "obsidian",
  "aurora",
  "sunset",
  "ocean",
  "candy",
  "royal",
  "starlight",
  "meadow",
  "frost",
  "lava",
  "rainbow",
  "none",
] as const;
const AVATAR_FRAME_IDS = [
  "mythic_gold",
  "neon_glacier",
  "inferno",
  "emerald",
  "sunset_gold",
  "ocean_pearl",
  "candy_pop",
  "royal_amethyst",
  "star_chrome",
  "forest_vine",
  "frost_crystal",
  "lava_core",
  "rainbow_arcade",
  "shadow_onyx",
  "none",
] as const;
const SKILL_IDS = ["rewind", "turbo", "shield", "snooze"] as const;

export const SHOP_CATALOG_KEYS = [
  ...AVATAR_VARIANT_IDS.map((id) => `avatar:variant:${id}`),
  ...AVATAR_BACKGROUND_IDS.map((id) => `avatar:background:${id}`),
  ...AVATAR_FRAME_IDS.map((id) => `avatar:frame:${id}`),
  ...SKILL_IDS.map((id) => `skill:${id}`),
] as const;

// Stable tier selection gives the catalog varied prices without changing a player's price between
// sessions. Prices range from 0.35 to 2.50 USDT and are always charged in six-decimal base units.
const PRICE_TIERS = [
  350_000n,
  500_000n,
  650_000n,
  750_000n,
  900_000n,
  1_100_000n,
  1_350_000n,
  1_750_000n,
  2_100_000n,
  2_500_000n,
] as const;

function stablePriceIndex(key: string): number {
  let hash = 17;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % PRICE_TIERS.length;
}

// The avatar fields that are individually purchasable. Values are opaque strings (Avataaars ids /
// hex colours without '#').
const AVATAR_FIELDS = [
  "top",
  "hairColor",
  "skin",
  "eyes",
  "eyebrows",
  "mouth",
  "clothing",
  "clothesColor",
  "facialHair",
  "facialHairColor",
  "glasses",
  "pants",
  "shoeStyle",
  "shoeColor",
] as const;
const CARD_FIELDS = ["color", "pattern", "shape", "border"] as const;

// The free "basic" look every player starts with (change: everything is paid now, so these are the
// only free items). Mirrors DEFAULT_AVATAR / DEFAULT_CARD on the frontend.
const BASIC_AVATAR: Record<string, string> = {
  top: "shortFlat",
  hairColor: "2c1b18",
  skin: "f2d3b1",
  eyes: "default",
  eyebrows: "default",
  mouth: "smile",
  clothing: "hoodie",
  clothesColor: "5199e4",
  facialHair: "none",
  facialHairColor: "2c1b18",
  glasses: "none",
  pants: "2f3a4a",
  shoeStyle: "sneakers",
  shoeColor: "ffffff",
};
const BASIC_CARD: Record<string, string> = {
  color: "#5aa8ff",
  pattern: "stars",
  shape: "rounded",
  border: "gold",
};
const BASIC_BOARD = "classic";

export const BASIC_ITEMS: Set<string> = new Set([
  ...Object.entries(BASIC_AVATAR).map(([f, v]) => `avatar:${f}:${v}`),
  ...Object.entries(BASIC_CARD).map(([f, v]) => `card:${f}:${v}`),
  `board:${BASIC_BOARD}`,
  "avatar:variant:cow_v1_base",
  "avatar:background:emerald",
  "avatar:background:none",
  "avatar:frame:mythic_gold",
  "avatar:frame:none",
]);

// Accept only well-formed keys (bounded length) so arbitrary strings can't be "purchased".
const KEY_RE =
  /^(avatar:[a-zA-Z]+:[#0-9a-zA-Z._-]{1,40}|card:(color|pattern|shape|border):[#0-9a-zA-Z._-]{1,40}|board:[0-9a-zA-Z._-]{1,40}|skill:[0-9a-zA-Z._-]{1,40})$/;
export function isValidItemKey(key: unknown): key is string {
  return typeof key === "string" && KEY_RE.test(key);
}

export function isBasicItem(key: string): boolean {
  return BASIC_ITEMS.has(key);
}

export function priceForItem(key: string): bigint | null {
  if (!isValidItemKey(key)) return null;
  if (isBasicItem(key)) return 0n;
  return PRICE_TIERS[stablePriceIndex(key)] ?? SHOP_ITEM_PRICE;
}

export function catalogPrices(): Record<string, string> {
  return Object.fromEntries(
    SHOP_CATALOG_KEYS.map((key) => [key, (priceForItem(key) ?? SHOP_ITEM_PRICE).toString()]),
  );
}

// Every item key implied by an equipped look — used to validate that a saved look only uses items
// the player owns (or that are basic/free).
export function itemKeysForLook(look: {
  card?: Record<string, unknown>;
  avatar?: Record<string, unknown>;
  board?: { skin?: unknown };
}): string[] {
  const keys: string[] = [];
  const card = look?.card ?? {};
  for (const f of CARD_FIELDS) {
    const v = card[f];
    if (typeof v === "string" && v.length) keys.push(`card:${f}:${v}`);
  }
  const avatar = look?.avatar ?? {};
  for (const f of AVATAR_FIELDS) {
    const v = (avatar as Record<string, unknown>)[f];
    if (typeof v === "string" && v.length) keys.push(`avatar:${f}:${v}`);
  }
  const boardSkin = look?.board?.skin;
  if (typeof boardSkin === "string" && boardSkin.length) keys.push(`board:${boardSkin}`);
  return keys;
}
