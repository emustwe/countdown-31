import {
  Application,
  Container,
  FillGradient,
  Graphics,
  Text,
  TextStyle,
  type Texture,
} from "pixi.js";
import type { SymbolId } from "../lib/api-types";
import { ALL_SYMBOL_IDS, SYMBOL_VISUALS, type SymbolVisual } from "./symbols";
import { buildMascotTexture } from "./buildMascotTexture";

const GLYPH_FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

function glyphGradient(visual: SymbolVisual): FillGradient {
  const [top, mid, bottom] = visual.gradientStops;
  return new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: top ?? visual.border },
      { offset: 0.55, color: mid ?? visual.border },
      { offset: 1, color: bottom ?? mid ?? visual.border },
    ],
    textureSpace: "local",
  });
}

/** Bakes each symbol's placeholder art once, up front, so spinning just moves cheap sprites
 * around rather than redrawing vector shapes every frame. No background box per symbol —
 * each glyph is a big glow-halo'd, gradient-filled, gem-cut icon floating directly on the
 * cabinet's shared dark panel (see SlotRenderer's buildCabinetFrame). Wild and Scatter are
 * illustrated mascot characters instead of plain glyphs — delegated to buildMascotTexture. */
export function buildSymbolTextures(app: Application, size: number): Record<SymbolId, Texture> {
  const textures = {} as Record<SymbolId, Texture>;

  for (const id of ALL_SYMBOL_IDS) {
    if (id === "W" || id === "S") {
      textures[id] = buildMascotTexture(app, size, id);
      continue;
    }

    const visual = SYMBOL_VISUALS[id];
    const container = new Container();
    const cx = size / 2;
    const cy = size / 2;

    if (visual.glow) {
      const haloOuter = new Graphics().circle(cx, cy, size * 0.52).fill({ color: visual.border, alpha: 0.22 });
      const haloInner = new Graphics().circle(cx, cy, size * 0.4).fill({ color: visual.border, alpha: 0.2 });
      container.addChild(haloOuter, haloInner);
    }

    // A thin bevel ring for a touch of depth behind the glyph — not a background box, just
    // a soft circular edge.
    const bevel = new Graphics()
      .circle(cx, cy, size * 0.42)
      .stroke({ width: Math.max(1, size * 0.01), color: 0xffffff, alpha: 0.14 });
    container.addChild(bevel);

    if (visual.watermark) {
      const watermark = new Text({
        text: visual.watermark,
        style: new TextStyle({ fontSize: Math.round(size * 0.66), fill: visual.border, fontFamily: GLYPH_FONT }),
      });
      watermark.anchor.set(0.5);
      watermark.position.set(cx, cy + size * 0.03);
      watermark.alpha = 0.25;
      container.addChild(watermark);
    }

    const isWideGlyph = visual.glyph.length > 2;
    const fontSize = Math.round(size * (isWideGlyph ? 0.56 : 0.72));

    const glyphText = new Text({
      text: visual.glyph,
      style: new TextStyle({
        fontSize,
        fontFamily: GLYPH_FONT,
        fontWeight: "800",
        fill: glyphGradient(visual),
        stroke: { width: Math.max(2, size * 0.045), color: visual.border },
        dropShadow: {
          color: visual.glyphShadow,
          alpha: 0.65,
          blur: size * 0.02,
          distance: size * 0.035,
          angle: Math.PI / 2.2,
        },
      }),
    });
    glyphText.anchor.set(0.5);
    glyphText.position.set(cx, cy);
    container.addChild(glyphText);

    // A soft glossy highlight across the upper third — a simple sheen, not a real light.
    const shine = new Graphics()
      .ellipse(cx, cy - size * 0.2, size * 0.32, size * 0.14)
      .fill({ color: 0xffffff, alpha: 0.16 });
    container.addChild(shine);

    textures[id] = app.renderer.generateTexture(container);
    container.destroy({ children: true });
  }

  return textures;
}
