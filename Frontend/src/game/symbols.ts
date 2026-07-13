import type { SymbolId } from "../lib/api-types";

// No real art for this demo — placeholders rendered procedurally (Graphics + Text baked
// to a texture) rather than image assets, per the brief. Aurora-ish palette: cool
// low-pay cards, warm high-pay gems, violet wild, teal/gold scatter.
export interface SymbolVisual {
  glyph: string;
  background: number;
  border: number;
  glyphColor: number;
}

export const SYMBOL_VISUALS: Record<SymbolId, SymbolVisual> = {
  H1: { glyph: "\u{1F48E}", background: 0x1c2138, border: 0x60a5fa, glyphColor: 0xe8eaf5 }, // 💎
  H2: { glyph: "\u{1F451}", background: 0x1c2138, border: 0xf2c94c, glyphColor: 0xe8eaf5 }, // 👑
  H3: { glyph: "\u{2B50}", background: 0x1c2138, border: 0xf87171, glyphColor: 0xe8eaf5 }, // ⭐
  L1: { glyph: "A", background: 0x141829, border: 0x2a3050, glyphColor: 0x9aa0c0 },
  L2: { glyph: "K", background: 0x141829, border: 0x2a3050, glyphColor: 0x9aa0c0 },
  L3: { glyph: "Q", background: 0x141829, border: 0x2a3050, glyphColor: 0x9aa0c0 },
  L4: { glyph: "J", background: 0x141829, border: 0x2a3050, glyphColor: 0x9aa0c0 },
  W: { glyph: "\u{1F31F}", background: 0x7c5cff, border: 0xffffff, glyphColor: 0xffffff }, // 🌟
  S: { glyph: "\u{1F30C}", background: 0x2a3050, border: 0xf2c94c, glyphColor: 0xf2c94c }, // 🌌
};

export const ALL_SYMBOL_IDS: SymbolId[] = ["H1", "H2", "H3", "L1", "L2", "L3", "L4", "W", "S"];
