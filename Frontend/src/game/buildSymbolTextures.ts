import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, type Texture } from "pixi.js";
import type { SymbolId } from "../lib/api-types";
import { ALL_SYMBOL_IDS } from "./symbols";

const LABEL_FONT = "system-ui, -apple-system, Segoe UI, sans-serif";
const MONSTER_FONT = "Impact, 'Arial Black', system-ui, sans-serif";

/** Maps each symbol to the user's own artwork (Frontend/public/game/*.png — processed from
 * their original source images, background removed). Wild and Scatter get a small glowing
 * name label baked in under the character art, matching standard slot-symbol convention. */
const SYMBOL_IMAGE: Record<SymbolId, { src: string; label?: string; glow: number }> = {
  H1: { src: "/game/symbol-10.png", glow: 0x8f6ff0 },
  H2: { src: "/game/symbol-H2-crest.png", glow: 0xd6a83c },
  H3: { src: "/game/symbol-9.png", glow: 0x4fc3ff },
  L1: { src: "/game/symbol-A.png", glow: 0x8a1f2b },
  L2: { src: "/game/symbol-K.png", glow: 0x2ee6c4 },
  L3: { src: "/game/symbol-Q.png", glow: 0x8a1f2b },
  L4: { src: "/game/symbol-J.png", glow: 0x8a1f2b },
  W: { src: "/game/symbol-W-wild.png", label: "WILD", glow: 0x3f7a5c },
  S: { src: "/game/symbol-S-scatter.png", label: "SCATTER", glow: 0x7a3f8a },
  JP: { src: "/game/symbol-JP-crystal.png", glow: 0xff5a3c },
};

/** Loads every symbol's source image once, then bakes each into a uniform CELL_SIZE square
 * texture: a soft drop-shadow behind a large contain-fit sprite of the real artwork (no
 * distracting circle halo — the art fills the cell so it reads big and clear), plus a
 * glowing name label for Wild/Scatter. Baking to one flattened texture per symbol keeps
 * spinning cheap (moving sprites, not re-compositing every frame). */
export async function buildSymbolTextures(
  app: Application,
  size: number,
  themeFamily: "desert" | "monster" = "desert",
): Promise<Record<SymbolId, Texture>> {
  if (themeFamily === "monster") {
    return buildMonsterSymbolTextures(app, size);
  }
  const sources = Object.values(SYMBOL_IMAGE).map((cfg) => cfg.src);
  const loaded = await Assets.load<Texture>(sources);

  const textures = {} as Record<SymbolId, Texture>;

  for (const id of ALL_SYMBOL_IDS) {
    const cfg = SYMBOL_IMAGE[id];
    const artTexture = loaded[cfg.src] as Texture;
    const container = new Container();
    const cx = size / 2;
    const cy = size / 2;

    // Label sits along the bottom for Wild/Scatter; reserve a slim strip for it so the art
    // above doesn't overlap it. Everything else uses the whole cell.
    const labelSpace = cfg.label ? size * 0.14 : 0;
    const availH = size * 0.98 - labelSpace;
    const availW = size * 0.98;
    const artScale = Math.min(availW / artTexture.width, availH / artTexture.height);
    const artW = artTexture.width * artScale;
    const artH = artTexture.height * artScale;

    // A soft dark drop-shadow so the symbol lifts off the dark reel window without a
    // hard-edged halo ring behind it.
    const shadow = new Sprite(artTexture);
    shadow.width = artW;
    shadow.height = artH;
    shadow.anchor.set(0.5);
    shadow.tint = 0x000000;
    shadow.alpha = 0.35;
    shadow.position.set(cx + size * 0.012, cy - labelSpace / 2 + size * 0.02);
    container.addChild(shadow);

    const art = new Sprite(artTexture);
    art.width = artW;
    art.height = artH;
    art.anchor.set(0.5);
    art.position.set(cx, cy - labelSpace / 2);
    container.addChild(art);

    if (cfg.label) {
      const label = new Text({
        text: cfg.label,
        style: new TextStyle({
          fontSize: Math.round(size * (cfg.label.length > 5 ? 0.12 : 0.145)),
          fontFamily: LABEL_FONT,
          fontWeight: "800",
          fill: 0xffe6b8,
          stroke: { width: Math.max(1, size * 0.016), color: 0x2a0d05 },
          dropShadow: { color: 0x000000, alpha: 0.7, blur: size * 0.02, distance: size * 0.015, angle: Math.PI / 2 },
        }),
      });
      label.anchor.set(0.5);
      label.position.set(cx, size * 0.93);
      container.addChild(label);
    }

    textures[id] = app.renderer.generateTexture(container);
    container.destroy({ children: true });
  }

  return textures;
}

// ---- Monster theme: original, procedurally-drawn symbols (no image assets) ----

const MONSTER_CHARS: Partial<Record<SymbolId, string>> = {
  H1: "10",
  H3: "9",
  L1: "A",
  L2: "K",
  L3: "Q",
  L4: "J",
};

function monsterLabel(container: Container, text: string, size: number): void {
  const label = new Text({
    text,
    style: new TextStyle({
      fontSize: Math.round(size * (text.length > 5 ? 0.12 : 0.145)),
      fontFamily: MONSTER_FONT,
      fontWeight: "900",
      fill: 0xbdf7c8,
      stroke: { width: Math.max(1, size * 0.018), color: 0x06170e },
      dropShadow: { color: 0x0a1a10, alpha: 0.8, blur: size * 0.02, distance: size * 0.015, angle: Math.PI / 2 },
    }),
  });
  label.anchor.set(0.5);
  label.position.set(size / 2, size * 0.92);
  container.addChild(label);
}

function drawSkull(g: Graphics, cx: number, cy: number, r: number, size: number, gold: boolean): void {
  const bone = gold ? 0xffe08a : 0xe9e5d2;
  const eyeGlow = gold ? 0xff5147 : 0x39d06f;
  g.circle(cx, cy - r * 0.1, r).fill(bone); // cranium
  g.roundRect(cx - r * 0.62, cy + r * 0.4, r * 1.24, r * 0.75, r * 0.25).fill(bone); // jaw
  g.circle(cx - r * 0.44, cy - r * 0.05, r * 0.34).fill(0x0a1a10); // sockets
  g.circle(cx + r * 0.44, cy - r * 0.05, r * 0.34).fill(0x0a1a10);
  g.circle(cx - r * 0.44, cy - r * 0.05, r * 0.15).fill(eyeGlow); // glowing eyes
  g.circle(cx + r * 0.44, cy - r * 0.05, r * 0.15).fill(eyeGlow);
  g.poly([cx, cy + r * 0.22, cx - r * 0.15, cy + r * 0.5, cx + r * 0.15, cy + r * 0.5]).fill(0x0a1a10); // nose
  for (let i = -2; i <= 2; i++) {
    g.rect(cx + i * r * 0.22 - size * 0.006, cy + r * 0.5, size * 0.012, r * 0.5).fill(0x0a1a10); // teeth gaps
  }
}

function buildMonsterSymbolTextures(app: Application, size: number): Record<SymbolId, Texture> {
  const textures = {} as Record<SymbolId, Texture>;
  const cx = size / 2;
  const cy = size / 2;

  for (const id of ALL_SYMBOL_IDS) {
    const c = new Container();
    // toxic-green glow halo behind every symbol
    c.addChild(new Graphics().circle(cx, cy, size * 0.46).fill({ color: 0x2fae5a, alpha: 0.22 }));
    c.addChild(new Graphics().circle(cx, cy, size * 0.34).fill({ color: 0x2fae5a, alpha: 0.18 }));

    const char = MONSTER_CHARS[id];
    if (char) {
      const t = new Text({
        text: char,
        style: new TextStyle({
          fontFamily: MONSTER_FONT,
          fontSize: Math.round(size * (char.length > 1 ? 0.52 : 0.68)),
          fontWeight: "900",
          fill: 0x9bf6b0,
          stroke: { width: size * 0.05, color: 0x06170e },
          dropShadow: { color: 0x39d06f, alpha: 0.85, blur: size * 0.06, distance: 0, angle: 0 },
        }),
      });
      t.anchor.set(0.5);
      t.position.set(cx, cy - size * 0.04);
      c.addChild(t);
      // ooze drip under the character
      const drip = new Graphics();
      drip.roundRect(cx - size * 0.028, cy + size * 0.16, size * 0.056, size * 0.17, size * 0.028).fill(0x39d06f);
      drip.circle(cx, cy + size * 0.35, size * 0.05).fill(0x39d06f);
      drip.circle(cx - size * 0.012, cy + size * 0.33, size * 0.018).fill({ color: 0x8ff0a8, alpha: 0.8 });
      c.addChild(drip);
    } else if (id === "H2") {
      const g = new Graphics();
      drawSkull(g, cx, cy, size * 0.32, size, false);
      c.addChild(g);
    } else if (id === "JP") {
      // golden jackpot skull with a little crown
      const g = new Graphics();
      drawSkull(g, cx, cy + size * 0.02, size * 0.3, size, true);
      g.poly([
        cx - size * 0.22, cy - size * 0.3, cx - size * 0.12, cy - size * 0.18, cx, cy - size * 0.32,
        cx + size * 0.12, cy - size * 0.18, cx + size * 0.22, cy - size * 0.3, cx + size * 0.22, cy - size * 0.14,
        cx - size * 0.22, cy - size * 0.14,
      ]).fill(0xffd23f).stroke({ width: size * 0.01, color: 0x8a6a1a });
      c.addChild(g);
    } else if (id === "W") {
      const g = new Graphics();
      const r = size * 0.3;
      const ey = cy - size * 0.06;
      g.circle(cx, ey, r).fill(0x2f9e4f).stroke({ width: size * 0.02, color: 0x0c3b21 });
      g.circle(cx - r * 0.4, ey - r * 0.12, r * 0.28).fill(0xffe27a);
      g.circle(cx + r * 0.4, ey - r * 0.12, r * 0.28).fill(0xffe27a);
      g.circle(cx - r * 0.4, ey - r * 0.12, r * 0.11).fill(0x160a04);
      g.circle(cx + r * 0.4, ey - r * 0.12, r * 0.11).fill(0x160a04);
      g.poly([cx - r * 0.5, ey + r * 0.34, cx + r * 0.5, ey + r * 0.34, cx, ey + r * 0.78]).fill(0x160a04);
      g.poly([cx - r * 0.3, ey + r * 0.34, cx - r * 0.14, ey + r * 0.34, cx - r * 0.22, ey + r * 0.62]).fill(0xffffff);
      g.poly([cx + r * 0.3, ey + r * 0.34, cx + r * 0.14, ey + r * 0.34, cx + r * 0.22, ey + r * 0.62]).fill(0xffffff);
      c.addChild(g);
      monsterLabel(c, "WILD", size);
    } else if (id === "S") {
      const g = new Graphics();
      const r = size * 0.28;
      const ey = cy - size * 0.06;
      g.circle(cx, ey, r).fill(0xf4f4ec).stroke({ width: size * 0.02, color: 0x0c3b21 });
      g.circle(cx, ey, r * 0.55).fill(0x39d06f); // iris
      g.circle(cx, ey, r * 0.26).fill(0x0a1a10); // pupil
      g.circle(cx - r * 0.2, ey - r * 0.2, r * 0.11).fill({ color: 0xffffff, alpha: 0.9 });
      // bloodshot veins
      g.moveTo(cx - r, ey).lineTo(cx - r * 0.5, ey - r * 0.15).moveTo(cx + r, ey + r * 0.1).lineTo(cx + r * 0.5, ey);
      g.stroke({ width: size * 0.008, color: 0xc0392b, alpha: 0.7 });
      c.addChild(g);
      monsterLabel(c, "SCATTER", size);
    }

    textures[id] = app.renderer.generateTexture(c);
    c.destroy({ children: true });
  }

  return textures;
}
