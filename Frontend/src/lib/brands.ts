/**
 * Tournament co-branding ("skin") registry.
 *
 * A tournament's RULES, engine and math never change with its brand — only the LOOK does
 * (background, board symbols, colours, card, rule book & terms styling). WM is the default
 * house style; VA is a sponsor skin. Adding another partner later is a single entry here plus
 * a matching `.brand-<key>` block in dune.css and a `public/brands/<key>/` asset folder — no
 * other code changes needed.
 */
export type BrandKey = "WM" | "VA";

export interface Brand {
  key: BrandKey;
  /** Admin-facing name shown in the create-tournament brand picker. */
  label: string;
  /** One-line description for the picker. */
  blurb: string;
  /** Root CSS class that switches the theme on (game page, cards, gates). */
  className: string;
  /** Placeholder wordmark shown until the real logo image is dropped in. */
  logoText: string;
  /** Accent colour (also used for the picker swatch). */
  accent: string;
  /** Drop-in asset paths under public/. Missing files fall back to CSS gradients/placeholders,
   *  so the theme never looks broken before the real art (from the sponsor) is added. */
  assets: {
    logo?: string;
    background?: string;
    /** 3×2 symbol sprite sheet (same layout as the house sheet) OR left undefined to keep the
     *  house symbols tinted to the brand until real icons are supplied. */
    symbols?: string;
    card?: string;
  };
}

export const BRANDS: Record<BrandKey, Brand> = {
  WM: {
    key: "WM",
    label: "WM Tournaments",
    blurb: "The default WM house style — desert theme, unchanged.",
    className: "brand-wm",
    logoText: "WM",
    accent: "#f4b942",
    assets: {},
  },
  VA: {
    key: "VA",
    label: "Victory Ark",
    blurb: "Victory Ark Gaming co-branded skin — VA scene, colours and card.",
    className: "brand-va",
    logoText: "VA",
    // Matched to the Victory Ark logo: its signature cyan→purple gradient. Accent is the purple.
    accent: "#a833f0",
    assets: {
      logo: "/brands/va/logo.png",
      background: "/brands/va/background.jpg",
      // No clean reel-symbol PNGs were supplied yet (the icon export was a spreadsheet), so the
      // board keeps the house symbols until VA's individual game-icon PNGs are provided.
      card: "/brands/va/card.jpg",
    },
  },
};

/** All brand keys, in the order they appear in the admin picker (extend by adding to BRANDS). */
export const BRAND_KEYS = Object.keys(BRANDS) as BrandKey[];

/** The brand for a tournament-like object; defaults to WM for anything without a brand. */
export function brandFor(t: { brand?: BrandKey | null } | null | undefined): Brand {
  return BRANDS[(t?.brand as BrandKey) ?? "WM"] ?? BRANDS.WM;
}

/** The root CSS class for a brand key (safe default WM). */
export function brandClass(brand: BrandKey | null | undefined): string {
  return (BRANDS[(brand as BrandKey) ?? "WM"] ?? BRANDS.WM).className;
}

// A pool of distinct VA game-cover images (each is a Victory Ark game with its own art + name)
// used to give every VA card / surface its OWN picture instead of one repeated watermark.
export const VA_CARD_COUNT = 14;
const vaHash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};
/** A stable VA card image for a given key (tournament id, popup name, …) — same key ⇒ same
 * image, different keys spread across the pool. `offset` picks a different image for a second
 * surface that shares the same key (e.g. a card vs. its detail header). */
export function vaCardImage(key: string, offset = 0): string {
  const n = ((vaHash(key) + offset) % VA_CARD_COUNT) + 1;
  return `/brands/va/cards/card-${String(n).padStart(2, "0")}.png`;
}
