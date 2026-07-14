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
import { ALL_SYMBOL_IDS, SYMBOL_VISUALS } from "./symbols";

/** Bakes each symbol's placeholder art (gradient background, optional glow halo, glossy
 * shine, drop-shadowed glyph, and — for low pays — a watermarked card suit) into a texture
 * once, up front, so spinning just moves cheap sprites around rather than redrawing vector
 * shapes every frame. Everything stays within a `size x size` canvas — the glow is an
 * inset ring, not an overflowing bleed — so each texture drops straight into the reel grid
 * at exactly one cell's size. */
export function buildSymbolTextures(app: Application, size: number): Record<SymbolId, Texture> {
  const textures = {} as Record<SymbolId, Texture>;
  const inset = size * 0.06;
  const bodySize = size - inset * 2;
  const radius = size * 0.15;

  for (const id of ALL_SYMBOL_IDS) {
    const visual = SYMBOL_VISUALS[id];
    const container = new Container();

    if (visual.glow) {
      const halo = new Graphics()
        .roundRect(0, 0, size, size, radius * 1.3)
        .fill({ color: visual.border, alpha: 0.32 });
      container.addChild(halo);
      const innerHalo = new Graphics()
        .roundRect(inset * 0.5, inset * 0.5, size - inset, size - inset, radius * 1.15)
        .fill({ color: visual.border, alpha: 0.22 });
      container.addChild(innerHalo);
    }

    const [stopA, stopB, stopC] = visual.gradientStops;
    const bgGradient = new FillGradient({
      type: "radial",
      center: { x: 0.32, y: 0.28 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.78,
      colorStops: [
        { offset: 0, color: stopA ?? visual.border },
        { offset: 0.55, color: stopB ?? visual.border },
        { offset: 1, color: stopC ?? stopB ?? visual.border },
      ],
      textureSpace: "local",
    });

    const bg = new Graphics()
      .roundRect(inset, inset, bodySize, bodySize, radius)
      .fill(bgGradient)
      .stroke({ width: Math.max(2, size * 0.032), color: visual.border, alignment: 1 });
    container.addChild(bg);

    // A thin inset bevel ring for a bit of embossed depth.
    const bevel = new Graphics().roundRect(inset + bodySize * 0.06, inset + bodySize * 0.06, bodySize * 0.88, bodySize * 0.88, radius * 0.8).stroke({
      width: Math.max(1, size * 0.012),
      color: 0xffffff,
      alpha: 0.16,
      alignment: 1,
    });
    container.addChild(bevel);

    // Glossy shine across the top third — a simple highlight, not a real light source.
    const shine = new Graphics()
      .roundRect(inset + bodySize * 0.08, inset + bodySize * 0.06, bodySize * 0.84, bodySize * 0.34, radius * 0.7)
      .fill({ color: 0xffffff, alpha: 0.13 });
    container.addChild(shine);

    if (visual.watermark) {
      const watermark = new Text({
        text: visual.watermark,
        style: new TextStyle({
          fontSize: Math.round(size * 0.62),
          fill: visual.border,
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }),
      });
      watermark.anchor.set(0.5);
      watermark.position.set(size / 2, size / 2 + size * 0.04);
      watermark.alpha = 0.3;
      container.addChild(watermark);
    }

    const fontSize = Math.round(size * (visual.glyph.length > 1 ? 0.46 : 0.44));
    const baseStyle = { fontSize, fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", fontWeight: "800" as const };

    const shadowText = new Text({
      text: visual.glyph,
      style: new TextStyle({ ...baseStyle, fill: visual.glyphShadow }),
    });
    shadowText.anchor.set(0.5);
    shadowText.position.set(size / 2 + size * 0.02, size / 2 + size * 0.03);
    shadowText.alpha = 0.55;
    container.addChild(shadowText);

    const glyphText = new Text({ text: visual.glyph, style: new TextStyle({ ...baseStyle, fill: visual.glyphColor }) });
    glyphText.anchor.set(0.5);
    glyphText.position.set(size / 2, size / 2);
    container.addChild(glyphText);

    textures[id] = app.renderer.generateTexture(container);
    container.destroy({ children: true });
  }

  return textures;
}
