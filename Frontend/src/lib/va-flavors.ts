// VA game "flavors" — each is a real Victory Ark game whose reel characters (high symbols,
// wild/scatter/jackpot, and the per-game styled A/K/Q/J low cards) come straight from that
// game's PSD art. The tournament RULES/engine are identical across flavors — only the symbol
// art changes. A tournament is assigned a flavor deterministically; the practice game lets you
// switch flavors live. Add a flavor by dropping its 10 symbol PNGs in
// public/brands/va/flavors/<key>/ and adding an entry here (+ a `.va-<key>` block in dune.css).

export type VaFlavorKey = "festive" | "wildwest" | "olympus";

export interface VaFlavor {
  key: VaFlavorKey;
  label: string; // the VA game this flavor is themed on
}

export const VA_FLAVORS: VaFlavor[] = [
  { key: "festive", label: "Fortune Festival" },
  { key: "wildwest", label: "Wild Legends" },
  { key: "olympus", label: "Zeus' Wrath" },
];

export const VA_FLAVOR_KEYS = VA_FLAVORS.map((f) => f.key);

/** Deterministic flavor for a key (tournament id) — same tournament always gets the same
 * flavor, different tournaments spread across the set. */
export function vaFlavorFor(key: string): VaFlavorKey {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return VA_FLAVOR_KEYS[h % VA_FLAVOR_KEYS.length] ?? "festive";
}

/** The CSS class that activates a flavor's symbol set. */
export function vaFlavorClass(flavor: VaFlavorKey): string {
  return `va-${flavor}`;
}
