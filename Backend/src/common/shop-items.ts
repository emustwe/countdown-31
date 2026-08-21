// Shop item model. Every avatar feature value, card attribute value, and board skin is an "item"
// identified by a stable key. Basic/default items are FREE for everyone (owned implicitly);
// everything else must be purchased (see ShopService). Kept in one place so the purchase flow and
// the equip validation agree on prices, keys, and what's free.

export const SHOP_ITEM_PRICE = 500_000n; // 0.5 USDT (6 decimals) — flat price for any item, for now.

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
const BASIC_CARD: Record<string, string> = { color: "#5aa8ff", pattern: "stars", shape: "rounded", border: "gold" };
const BASIC_BOARD = "classic";

export const BASIC_ITEMS: Set<string> = new Set([
  ...Object.entries(BASIC_AVATAR).map(([f, v]) => `avatar:${f}:${v}`),
  ...Object.entries(BASIC_CARD).map(([f, v]) => `card:${f}:${v}`),
  `board:${BASIC_BOARD}`,
]);

// Accept only well-formed keys (bounded length) so arbitrary strings can't be "purchased".
const KEY_RE = /^(avatar:[a-zA-Z]+:[#0-9a-zA-Z._-]{1,40}|card:(color|pattern|shape|border):[#0-9a-zA-Z._-]{1,40}|board:[0-9a-zA-Z._-]{1,40})$/;
export function isValidItemKey(key: unknown): key is string {
  return typeof key === "string" && KEY_RE.test(key);
}

export function isBasicItem(key: string): boolean {
  return BASIC_ITEMS.has(key);
}

// Every item key implied by an equipped look — used to validate that a saved look only uses items
// the player owns (or that are basic/free).
export function itemKeysForLook(look: { card?: Record<string, unknown>; avatar?: Record<string, unknown>; board?: { skin?: unknown } }): string[] {
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
