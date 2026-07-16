import type { SymbolId } from "../lib/api-types";

// No real art for this demo — placeholders rendered procedurally (gradient-filled glyphs +
// glow + bevel stroke, baked to a texture) rather than image assets. "Cosmic space-disco"
// palette: one distinct neon hue per rank, gold reserved for the jackpot, no per-symbol
// background box — each glyph floats directly on the cabinet's shared dark panel.
export interface SymbolVisual {
  glyph: string;
  /** Large, low-opacity watermark glyph behind the main one (card suit for low pays). */
  watermark?: string;
  /** Gradient fill for the glyph itself, top -> bottom (3 stops for extra depth). */
  gradientStops: number[];
  border: number;
  glyphShadow: number;
  /** Premium symbols (high pays, wild, scatter, jackpot) get an outer glow halo. */
  glow: boolean;
}

export const SYMBOL_VISUALS: Record<SymbolId, SymbolVisual> = {
  H1: {
    glyph: "\u{1F48E}", // 💎
    gradientStops: [0xaee4ff, 0x4fc3ff, 0x0e5fb8],
    border: 0x7fe8ff,
    glyphShadow: 0x0a1830,
    glow: true,
  },
  H2: {
    glyph: "\u{1F451}", // 👑
    gradientStops: [0xfff2b8, 0xffd23f, 0xc98a10],
    border: 0xffe27a,
    glyphShadow: 0x2a1a06,
    glow: true,
  },
  H3: {
    glyph: "\u{2B50}", // ⭐
    gradientStops: [0xffc2ef, 0xff6fd8, 0xc22a94],
    border: 0xff9de8,
    glyphShadow: 0x2a0a20,
    glow: true,
  },
  L1: {
    glyph: "A",
    watermark: "\u{2660}", // ♠
    gradientStops: [0xcbb8ff, 0x8f6ff0, 0x4a2fa0],
    border: 0xb69bff,
    glyphShadow: 0x140c33,
    glow: false,
  },
  L2: {
    glyph: "K",
    watermark: "\u{2665}", // ♥
    gradientStops: [0xffc2de, 0xe066a3, 0x8f2f66],
    border: 0xff8fc0,
    glyphShadow: 0x2a0c1a,
    glow: false,
  },
  L3: {
    glyph: "Q",
    watermark: "\u{2666}", // ♦
    gradientStops: [0xe2b8ff, 0xa855f7, 0x6a2f9c],
    border: 0xc48fff,
    glyphShadow: 0x1d0c33,
    glow: false,
  },
  L4: {
    glyph: "J",
    watermark: "\u{2663}", // ♣
    gradientStops: [0xb8fff0, 0x2ee6c4, 0x1a9c80],
    border: 0x7fffdb,
    glyphShadow: 0x0a2a22,
    glow: false,
  },
  // W and S are rendered by buildMascotTexture() instead of the generic glyph builder — the
  // entries below only supply a representative swatch color for the Rules modal.
  W: {
    glyph: "\u{1F31F}", // 🌟 (unused as reel art — mascot texture takes over)
    gradientStops: [0xe2d4ff, 0xa855f7, 0x5b2fa0],
    border: 0xd6b8ff,
    glyphShadow: 0x1c1042,
    glow: true,
  },
  S: {
    glyph: "\u{1F30C}", // 🌌 (unused as reel art — mascot texture takes over)
    gradientStops: [0xfff2c2, 0xffd23f, 0xa855f7],
    border: 0xffe27a,
    glyphShadow: 0x081820,
    glow: true,
  },
  JP: {
    glyph: "7\u{FE0F}\u{20E3}", // 7️⃣ — classic "lucky sevens" jackpot symbol
    gradientStops: [0xffb8a8, 0xff3b3b, 0x8a0f18],
    border: 0xffd24c,
    glyphShadow: 0x24040a,
    glow: true,
  },
};

export const ALL_SYMBOL_IDS: SymbolId[] = ["H1", "H2", "H3", "L1", "L2", "L3", "L4", "W", "S", "JP"];
