import type { SymbolId } from "../lib/api-types";

// No real art for this demo — placeholders rendered procedurally (gradients + glow + a
// glyph, baked to a texture) rather than image assets, per the brief. Aurora-ish palette:
// jewel-toned high pays with a glowing halo, royal-card low pays, a radiant violet wild,
// and a cosmic teal/gold scatter.
export interface SymbolVisual {
  glyph: string;
  /** Radial gradient background, center -> edge. */
  gradientFrom: number;
  gradientTo: number;
  border: number;
  glyphColor: number;
  glyphShadow: number;
  /** Premium symbols (high pays, wild, scatter) get an outer glow halo. */
  glow: boolean;
}

export const SYMBOL_VISUALS: Record<SymbolId, SymbolVisual> = {
  H1: {
    glyph: "\u{1F48E}", // 💎
    gradientFrom: 0x2f5fb8,
    gradientTo: 0x152238,
    border: 0x7fb8ff,
    glyphColor: 0xffffff,
    glyphShadow: 0x0a1428,
    glow: true,
  },
  H2: {
    glyph: "\u{1F451}", // 👑
    gradientFrom: 0xd9a53a,
    gradientTo: 0x2e2410,
    border: 0xffe08a,
    glyphColor: 0xfff6df,
    glyphShadow: 0x2a1d00,
    glow: true,
  },
  H3: {
    glyph: "\u{2B50}", // ⭐
    gradientFrom: 0xc23a5e,
    gradientTo: 0x2a1420,
    border: 0xff9db8,
    glyphColor: 0xffffff,
    glyphShadow: 0x2a0a14,
    glow: true,
  },
  L1: {
    glyph: "A",
    gradientFrom: 0x2a3050,
    gradientTo: 0x141829,
    border: 0x5a6494,
    glyphColor: 0xe8eaf5,
    glyphShadow: 0x05070d,
    glow: false,
  },
  L2: {
    glyph: "K",
    gradientFrom: 0x2a3050,
    gradientTo: 0x141829,
    border: 0x5a6494,
    glyphColor: 0xe8eaf5,
    glyphShadow: 0x05070d,
    glow: false,
  },
  L3: {
    glyph: "Q",
    gradientFrom: 0x2a3050,
    gradientTo: 0x141829,
    border: 0x5a6494,
    glyphColor: 0xe8eaf5,
    glyphShadow: 0x05070d,
    glow: false,
  },
  L4: {
    glyph: "J",
    gradientFrom: 0x2a3050,
    gradientTo: 0x141829,
    border: 0x5a6494,
    glyphColor: 0xe8eaf5,
    glyphShadow: 0x05070d,
    glow: false,
  },
  W: {
    glyph: "\u{1F31F}", // 🌟
    gradientFrom: 0xa88bff,
    gradientTo: 0x3a2a7a,
    border: 0xffffff,
    glyphColor: 0xffffff,
    glyphShadow: 0x1c1042,
    glow: true,
  },
  S: {
    glyph: "\u{1F30C}", // 🌌
    gradientFrom: 0x3ad6c4,
    gradientTo: 0x122a38,
    border: 0xf2c94c,
    glyphColor: 0xfff8e1,
    glyphShadow: 0x081820,
    glow: true,
  },
};

export const ALL_SYMBOL_IDS: SymbolId[] = ["H1", "H2", "H3", "L1", "L2", "L3", "L4", "W", "S"];
