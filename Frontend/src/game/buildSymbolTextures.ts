import { Application, Container, Graphics, Text, TextStyle, type Texture } from "pixi.js";
import type { SymbolId } from "../lib/api-types";
import { ALL_SYMBOL_IDS, SYMBOL_VISUALS } from "./symbols";

/** Bakes each symbol's placeholder art (rounded rect + glyph) into a texture once, up
 * front, so spinning just moves cheap sprites around rather than redrawing vector shapes
 * every frame. */
export function buildSymbolTextures(app: Application, cellSize: number): Record<SymbolId, Texture> {
  const textures = {} as Record<SymbolId, Texture>;

  for (const id of ALL_SYMBOL_IDS) {
    const visual = SYMBOL_VISUALS[id];
    const container = new Container();

    const bg = new Graphics()
      .roundRect(1, 1, cellSize - 2, cellSize - 2, cellSize * 0.14)
      .fill(visual.background)
      .stroke({ width: 3, color: visual.border, alignment: 1 });
    container.addChild(bg);

    const text = new Text({
      text: visual.glyph,
      style: new TextStyle({
        fontSize: Math.round(cellSize * 0.5),
        fill: visual.glyphColor,
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        fontWeight: "700",
      }),
    });
    text.anchor.set(0.5);
    text.position.set(cellSize / 2, cellSize / 2);
    container.addChild(text);

    textures[id] = app.renderer.generateTexture(container);
    container.destroy({ children: true });
  }

  return textures;
}
