import { Application, Container, FillGradient, Graphics, Text, TextStyle, type Texture } from "pixi.js";

const LABEL_FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

function radialGradient(stops: number[]): FillGradient {
  const [center, mid, edge] = stops;
  return new FillGradient({
    type: "radial",
    center: { x: 0.5, y: 0.4 },
    innerRadius: 0,
    outerCenter: { x: 0.5, y: 0.5 },
    outerRadius: 0.7,
    colorStops: [
      { offset: 0, color: center ?? 0xffffff },
      { offset: 0.55, color: mid ?? center ?? 0xffffff },
      { offset: 1, color: edge ?? mid ?? 0xffffff },
    ],
    textureSpace: "local",
  });
}

/** A simple cartoon face: white sclera + dark pupil (much higher contrast against a
 * colorful gradient body than a single flat-colored oval) plus a bold smile arc. */
function drawFace(g: Graphics, cx: number, cy: number, scale: number, eyeColor: number): void {
  for (const dx of [-10 * scale, 10 * scale]) {
    g.ellipse(cx + dx, cy - 5 * scale, 4.2 * scale, 5 * scale).fill({ color: 0xffffff, alpha: 0.95 });
    g.circle(cx + dx + 0.6 * scale, cy - 4 * scale, 2.4 * scale).fill({ color: eyeColor });
    g.circle(cx + dx - 0.8 * scale, cy - 5.4 * scale, 0.9 * scale).fill({ color: 0xffffff });
  }
  g.arc(cx, cy + 1 * scale, 10 * scale, 0.15, Math.PI - 0.15).stroke({ width: 2.6 * scale, color: eyeColor, alpha: 0.95 });
}

/** A "Comet Spirit" mascot for the Wild: a glowing comet-head bursting from a hexagonal
 * frame with a trailing star-tail, in the theme's violet neon hue. Built from simple flat
 * shapes (circles, ellipses, stars) — a stylized mascot icon, not an attempt at painted
 * illustration, which procedural Graphics can't convincingly produce. */
function buildWild(size: number): Container {
  const root = new Container();
  const cx = size / 2;
  const cy = size * 0.44;

  const outerGlow = new Graphics().circle(cx, cy, size * 0.5).fill({ color: 0xa855f7, alpha: 0.2 });
  root.addChild(outerGlow);

  const frame = new Graphics()
    .poly(hexagonPoints(cx, cy, size * 0.47))
    .stroke({ width: Math.max(2, size * 0.025), color: 0xd6b8ff, alpha: 0.8 });
  root.addChild(frame);

  // Comet tail — three fading ellipses trailing down-left from the head, plus a bright
  // core streak so it reads as a tail rather than blending into the backdrop.
  const tail = new Graphics();
  tail.ellipse(cx - size * 0.09, cy + size * 0.19, size * 0.23, size * 0.15).fill({ color: 0xb388ff, alpha: 0.7 });
  tail.ellipse(cx - size * 0.18, cy + size * 0.31, size * 0.16, size * 0.1).fill({ color: 0x9b5ff0, alpha: 0.55 });
  tail.ellipse(cx - size * 0.25, cy + size * 0.4, size * 0.1, size * 0.06).fill({ color: 0x7a3fd9, alpha: 0.4 });
  tail.ellipse(cx - size * 0.11, cy + size * 0.21, size * 0.058, size * 0.1).fill({ color: 0xffffff, alpha: 0.5 });
  root.addChild(tail);

  const head = new Graphics()
    .circle(cx, cy, size * 0.27)
    .fill(radialGradient([0xffffff, 0xcbb8ff, 0x6a2fc9]))
    .circle(cx, cy, size * 0.27)
    .stroke({ width: Math.max(1.5, size * 0.018), color: 0xffffff, alpha: 0.5 });
  root.addChild(head);

  drawFace(head, cx, cy, (size / 120) * 1.15, 0x2a0a4a);

  const sparkles = new Graphics();
  sparkles.star(cx + size * 0.3, cy - size * 0.23, 4, size * 0.05, size * 0.02).fill({ color: 0xffffff, alpha: 0.85 });
  sparkles.star(cx - size * 0.3, cy + size * 0.33, 4, size * 0.04, size * 0.016).fill({ color: 0xffd23f, alpha: 0.7 });
  sparkles.star(cx + size * 0.21, cy + size * 0.31, 4, size * 0.032, size * 0.013).fill({ color: 0xffffff, alpha: 0.6 });
  root.addChild(sparkles);

  root.addChild(buildLabel("WILD", size, 0xd6b8ff, 0x2a0a4a));
  return root;
}

/** A "Starlight Spirit" mascot for the Scatter: a five-point star head with a flowing
 * cloak, in the theme's gold hue, echoing the Wild's "character bursting from a frame"
 * layout with a distinct silhouette and color so the two are never confused mid-spin. */
function buildScatter(size: number): Container {
  const root = new Container();
  const cx = size / 2;
  const cy = size * 0.44;

  const outerGlow = new Graphics().circle(cx, cy, size * 0.5).fill({ color: 0xffd23f, alpha: 0.2 });
  root.addChild(outerGlow);

  const frame = new Graphics()
    .poly(hexagonPoints(cx, cy, size * 0.47))
    .stroke({ width: Math.max(2, size * 0.025), color: 0xffe27a, alpha: 0.8 });
  root.addChild(frame);

  // Flowing cloak below the star head.
  const cloak = new Graphics();
  cloak.ellipse(cx, cy + size * 0.25, size * 0.25, size * 0.15).fill({ color: 0x6a2f9c, alpha: 0.55 });
  cloak.ellipse(cx, cy + size * 0.34, size * 0.17, size * 0.09).fill({ color: 0x4a1f70, alpha: 0.45 });
  root.addChild(cloak);

  const star = new Graphics()
    .star(cx, cy, 5, size * 0.29, size * 0.12)
    .fill(radialGradient([0xfff2c2, 0xffd23f, 0xb8720f]))
    .star(cx, cy, 5, size * 0.29, size * 0.12)
    .stroke({ width: Math.max(1.5, size * 0.018), color: 0xffffff, alpha: 0.5 });
  root.addChild(star);

  drawFace(star, cx, cy + size * 0.02, (size / 120) * 1.15, 0x3a2400);

  const orbits = new Graphics();
  orbits.circle(cx + size * 0.33, cy - size * 0.09, size * 0.025).fill({ color: 0xffd23f, alpha: 0.85 });
  orbits.circle(cx - size * 0.31, cy + size * 0.02, size * 0.02).fill({ color: 0xffffff, alpha: 0.7 });
  orbits.circle(cx + size * 0.11, cy - size * 0.32, size * 0.018).fill({ color: 0xffffff, alpha: 0.65 });
  root.addChild(orbits);

  root.addChild(buildLabel("SCATTER", size, 0xffe27a, 0x3a2400));
  return root;
}

function buildLabel(text: string, size: number, color: number, shadow: number): Text {
  const label = new Text({
    text,
    style: new TextStyle({
      fontSize: Math.round(size * (text.length > 5 ? 0.115 : 0.135)),
      fontFamily: LABEL_FONT,
      fontWeight: "800",
      fill: color,
      stroke: { width: Math.max(1, size * 0.012), color: shadow },
      dropShadow: { color: shadow, alpha: 0.6, blur: size * 0.015, distance: size * 0.015, angle: Math.PI / 2 },
    }),
  });
  label.anchor.set(0.5);
  label.position.set(size / 2, size * 0.9);
  return label;
}

function hexagonPoints(cx: number, cy: number, radius: number): number[] {
  const points: number[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    points.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  return points;
}

/** Bakes the Wild or Scatter mascot to a texture once, same "bake once, reuse forever"
 * pattern as the generic symbol glyphs in buildSymbolTextures.ts. */
export function buildMascotTexture(app: Application, size: number, id: "W" | "S"): Texture {
  const root = id === "W" ? buildWild(size) : buildScatter(size);
  const texture = app.renderer.generateTexture(root);
  root.destroy({ children: true });
  return texture;
}
