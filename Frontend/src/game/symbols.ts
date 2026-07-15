import type { SymbolId } from "../lib/api-types";

// No real art for this demo — placeholders rendered procedurally (gradients + glow + a
// glyph, baked to a texture) rather than image assets, per the brief. Aurora-ish palette:
// jewel-toned high pays with a glowing halo, suited royal-card low pays, a radiant violet
// wild, and a cosmic teal/gold scatter.
export interface SymbolVisual {
  glyph: string;
  /** Large, low-opacity watermark glyph behind the main one (card suit for low pays). */
  watermark?: string;
  /** Gradient background, center -> edge (3 stops for extra depth). */
  gradientStops: number[];
  border: number;
  glyphColor: number;
  glyphShadow: number;
  /** Premium symbols (high pays, wild, scatter) get an outer glow halo. */
  glow: boolean;
}

export const SYMBOL_VISUALS: Record<SymbolId, SymbolVisual> = {
  H1: {
    glyph: "\u{1F48E}", // 💎
    gradientStops: [0x6fa8ff, 0x2f5fb8, 0x0e1a30],
    border: 0x7fb8ff,
    glyphColor: 0xffffff,
    glyphShadow: 0x0a1428,
    glow: true,
  },
  H2: {
    glyph: "\u{1F451}", // 👑
    gradientStops: [0xffd873, 0xd9a53a, 0x241a08],
    border: 0xffe08a,
    glyphColor: 0xfff6df,
    glyphShadow: 0x2a1d00,
    glow: true,
  },
  H3: {
    glyph: "\u{2B50}", // ⭐
    gradientStops: [0xe86a8a, 0xc23a5e, 0x240e16],
    border: 0xff9db8,
    glyphColor: 0xffffff,
    glyphShadow: 0x2a0a14,
    glow: true,
  },
  L1: {
    glyph: "A",
    watermark: "\u{2660}", // ♠
    gradientStops: [0x3d4670, 0x262c4a, 0x11141f],
    border: 0x6b76ac,
    glyphColor: 0xf0f1fa,
    glyphShadow: 0x05070d,
    glow: false,
  },
  L2: {
    glyph: "K",
    watermark: "\u{2665}", // ♥
    gradientStops: [0x5a3040, 0x3a2030, 0x160d13],
    border: 0xb06c85,
    glyphColor: 0xffeef2,
    glyphShadow: 0x0d0609,
    glow: false,
  },
  L3: {
    glyph: "Q",
    watermark: "\u{2666}", // ♦
    gradientStops: [0x4a2a48, 0x33203a, 0x140d17],
    border: 0xa473ad,
    glyphColor: 0xf7ecf9,
    glyphShadow: 0x0c070d,
    glow: false,
  },
  L4: {
    glyph: "J",
    watermark: "\u{2663}", // ♣
    gradientStops: [0x1f4a45, 0x1a3530, 0x0c1815],
    border: 0x5aa89b,
    glyphColor: 0xe9fbf6,
    glyphShadow: 0x040a09,
    glow: false,
  },
  W: {
    glyph: "\u{1F31F}", // 🌟
    gradientStops: [0xcbb8ff, 0xa88bff, 0x2a1d5c],
    border: 0xffffff,
    glyphColor: 0xffffff,
    glyphShadow: 0x1c1042,
    glow: true,
  },
  S: {
    glyph: "\u{1F30C}", // 🌌
    gradientStops: [0x7ff2e2, 0x3ad6c4, 0x0c2028],
    border: 0xf2c94c,
    glyphColor: 0xfff8e1,
    glyphShadow: 0x081820,
    glow: true,
  },
  JP: {
    glyph: "7\u{FE0F}\u{20E3}", // 7️⃣ — classic "lucky sevens" jackpot symbol
    gradientStops: [0xff8a6a, 0xd6273f, 0x2c060a],
    border: 0xffd24c,
    glyphColor: 0xfff4d6,
    glyphShadow: 0x24040a,
    glow: true,
  },
};

export const ALL_SYMBOL_IDS: SymbolId[] = ["H1", "H2", "H3", "L1", "L2", "L3", "L4", "W", "S", "JP"];
