import { Application, Assets, BlurFilter, Container, Graphics, Sprite, type Texture } from "pixi.js";
import gsap from "gsap";
import type { Grid, SymbolId, WinLineDto } from "../lib/api-types";
import { ALL_SYMBOL_IDS } from "./symbols";
import { buildSymbolTextures } from "./buildSymbolTextures";
import { playReelStop } from "./sound";
import { highlightedCells } from "./highlightedCells";

const FRAME_SRC = "/game/board-frame.png";
// Measured once from the source art (see the board-frame processing notes): the inner
// transparent window as a fraction of the full frame image, so the reel grid can be sized
// and positioned to land exactly inside it regardless of the frame's own on-screen scale.
const FRAME_WINDOW = { left: 0.2217, top: 0.1834, right: 0.7743, bottom: 0.7804 };
/** On-screen width:height of the whole frame image as the renderer draws it (the reel grid
 * is square, so the frame's aspect is the window's height-fraction over its width-fraction).
 * The page sizes the board container to this so HUD controls line up with the frame art. */
export const FRAME_ASPECT =
  (FRAME_WINDOW.bottom - FRAME_WINDOW.top) / (FRAME_WINDOW.right - FRAME_WINDOW.left);

const REELS = 5;
const ROWS = 5;
const BUFFER = 15;
const OVERSHOOT_BUFFER = 2; // extra sprites past the target, so the bounce-back has something to show
const STRIP_LENGTH = ROWS * 2 + BUFFER + OVERSHOOT_BUFFER; // head + filler + tail (target) + overshoot
// Baked at a high resolution so symbols stay crisp even when the board is scaled up large
// (e.g. the full-height tournament view). The layout still scales the board to fit; this only
// controls texture sharpness, not on-screen size.
const CELL_SIZE = 200;
const GAP = 20;
const CELL_STEP = CELL_SIZE + GAP;
const BOARD_WIDTH = REELS * CELL_SIZE + (REELS - 1) * GAP;
const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GAP;
const HIGHLIGHT_TINT = 0xf2c94c;
const NO_TINT = 0xffffff;
const OVERSHOOT_PIXELS = CELL_STEP * 0.18;
const FRAME_GLOW_COLOR = 0xff8a3c;

function randomSymbolId(): SymbolId {
  return ALL_SYMBOL_IDS[Math.floor(Math.random() * ALL_SYMBOL_IDS.length)] as SymbolId;
}

export class SlotRenderer {
  private app: Application | null = null;
  private textures: Record<SymbolId, Texture> | null = null;
  private board: Container | null = null;
  private reelVisualContents: Container[] = [];
  private stripContainers: Container[] = [];
  private strips: Sprite[][] = [];
  private resizeObserver: ResizeObserver | null = null;
  private soundEnabled = true;
  private animationsEnabled = true;
  private destroyed = false;
  private cabinetGlow: Graphics | null = null;
  /** The frame image's own bounding box in board-local units, computed once the frame
   * texture loads — layout() fits this (not just the bare reel area) into the viewport. */
  private frameBounds = { width: BOARD_WIDTH, height: BOARD_HEIGHT, offsetX: 0, offsetY: 0 };

  /** Picks the board frame: the desert cabinet image, or the procedurally-drawn monster
   * frame. Both size their inner window identically so the reels line up either way. */
  constructor(private readonly themeFamily: "desert" | "monster" = "desert") {}

  async mount(container: HTMLDivElement): Promise<void> {
    const app = new Application();
    await app.init({ backgroundAlpha: 0, resizeTo: container, antialias: true });

    // React's StrictMode double-invokes effects, so destroy() can race ahead of this
    // async init — if that happened, don't attach a zombie canvas nobody will clean up.
    if (this.destroyed) {
      app.destroy({ removeView: true }, { children: true, texture: true });
      return;
    }

    // The canvas is a "replaced element" with its own intrinsic size — left in normal
    // flow, it can feed back into the container's own aspect-ratio-driven height (the
    // container grows to fit the canvas, resizeTo grows the canvas to fit the container,
    // and on some layouts that loop settles on the wrong size). Taking it out of flow
    // entirely removes the feedback: only the container's CSS decides its size.
    app.canvas.style.position = "absolute";
    app.canvas.style.inset = "0";
    app.canvas.style.width = "100%";
    app.canvas.style.height = "100%";
    container.style.position = "relative";
    container.appendChild(app.canvas);
    this.app = app;

    const monster = this.themeFamily === "monster";
    const [textures, frameTexture] = await Promise.all([
      buildSymbolTextures(app, CELL_SIZE, this.themeFamily),
      monster ? Promise.resolve(null) : Assets.load<Texture>(FRAME_SRC),
    ]);
    if (this.destroyed) {
      app.destroy({ removeView: true }, { children: true, texture: true });
      return;
    }
    this.textures = textures;

    const board = new Container();
    app.stage.addChild(board);
    this.board = board;

    board.addChild(monster ? this.buildMonsterFrame() : this.buildCabinetFrame(frameTexture!));

    for (let r = 0; r < REELS; r++) {
      // reelContainer: fixed position + the clip mask — never scaled/moved directly.
      const reelContainer = new Container();
      reelContainer.x = r * CELL_STEP;
      board.addChild(reelContainer);

      const mask = new Graphics().rect(0, 0, CELL_SIZE, BOARD_HEIGHT).fill(0xffffff);
      reelContainer.addChild(mask);
      reelContainer.mask = mask;

      // visualContent: everything that actually gets scaled for the landing "pop", pivoted
      // on its own center so scaling doesn't shift the reel sideways.
      const visualContent = new Container();
      visualContent.pivot.set(CELL_SIZE / 2, BOARD_HEIGHT / 2);
      visualContent.position.set(CELL_SIZE / 2, BOARD_HEIGHT / 2);
      reelContainer.addChild(visualContent);
      this.reelVisualContents.push(visualContent);

      const stripContainer = new Container();
      visualContent.addChild(stripContainer);
      this.stripContainers.push(stripContainer);

      const sprites: Sprite[] = [];
      for (let i = 0; i < STRIP_LENGTH; i++) {
        const sprite = new Sprite(this.textures[randomSymbolId()]);
        sprite.width = CELL_SIZE;
        sprite.height = CELL_SIZE;
        sprite.y = i * CELL_STEP;
        stripContainer.addChild(sprite);
        sprites.push(sprite);
      }
      this.strips.push(sprites);
    }

    this.layout();
    this.resizeObserver = new ResizeObserver(() => this.layout());
    this.resizeObserver.observe(container);
  }

  setSettings(settings: { soundEnabled: boolean; animationsEnabled: boolean }): void {
    this.soundEnabled = settings.soundEnabled;
    this.animationsEnabled = settings.animationsEnabled;
  }

  /** Sets the resting grid without any spin animation — used on first mount / resume. */
  showGrid(grid: Grid): void {
    for (let r = 0; r < REELS; r++) {
      const strip = this.strips[r];
      const column = grid[r];
      if (!strip || !column) continue;
      for (let row = 0; row < ROWS; row++) {
        const sprite = strip[row];
        const symbol = column[row];
        if (sprite && symbol && this.textures) sprite.texture = this.textures[symbol];
      }
    }
  }

  /** Animates every reel from its current resting grid to `grid`: a quick coiled-spring
   * anticipation dip, a blurred fast scroll, then an overshoot past the stop point that
   * bounces back into place — staggered per reel for the classic cascading-stop look.
   * Resolves once all reels have landed. Falls back to an instant swap when animations
   * are disabled in Settings. */
  async spinTo(grid: Grid): Promise<void> {
    if (!this.animationsEnabled) {
      this.showGrid(grid);
      return;
    }

    const tweenPromises: Promise<void>[] = [];

    for (let r = 0; r < REELS; r++) {
      const strip = this.strips[r];
      const stripContainer = this.stripContainers[r];
      const visualContent = this.reelVisualContents[r];
      const column = grid[r];
      if (!strip || !stripContainer || !visualContent || !column || !this.textures) continue;

      for (let i = ROWS; i < ROWS + BUFFER + OVERSHOOT_BUFFER; i++) {
        const sprite = strip[i];
        if (sprite) sprite.texture = this.textures[randomSymbolId()];
      }
      for (let row = 0; row < ROWS; row++) {
        const sprite = strip[ROWS + BUFFER + row];
        const symbol = column[row];
        if (sprite && symbol) sprite.texture = this.textures[symbol];
      }

      const spinDuration = 0.7 + r * 0.16;
      const targetY = -(ROWS + BUFFER) * CELL_STEP;
      const overshootY = targetY - OVERSHOOT_PIXELS;
      const blur = new BlurFilter({ strengthX: 0, strengthY: 16, quality: 3 });

      tweenPromises.push(
        new Promise<void>((resolve) => {
          const tl = gsap.timeline();

          // Coiled-spring anticipation: a small dip before the reel launches upward-scrolling.
          tl.to(stripContainer, { y: CELL_STEP * 0.18, duration: 0.09, ease: "power1.out", delay: r * 0.03 });

          // Fast, blurred scroll toward (just past) the stop point.
          tl.to(stripContainer, {
            y: overshootY,
            duration: spinDuration,
            ease: "power1.in",
            onStart: () => {
              stripContainer.filters = [blur];
            },
          });

          // Bounce back to the exact resting position — a gentle settle, not a hard snap.
          tl.to(stripContainer, {
            y: targetY,
            duration: 0.4,
            ease: "back.out(1.4)",
            onStart: () => {
              stripContainer.filters = [];
            },
            onComplete: () => {
              stripContainer.y = 0;
              for (let row = 0; row < ROWS; row++) {
                const headSprite = strip[row];
                const symbol = column[row];
                if (headSprite && symbol) headSprite.texture = this.textures![symbol];
              }
              if (this.soundEnabled) playReelStop();
              gsap.killTweensOf(visualContent.scale);
              gsap.fromTo(
                visualContent.scale,
                { x: 1.025, y: 0.985 },
                { x: 1, y: 1, duration: 0.32, ease: "elastic.out(1, 0.65)" },
              );
              resolve();
            },
          });
        }),
      );
    }

    await Promise.all(tweenPromises);
  }

  highlightWins(lines: WinLineDto[], grid: Grid): void {
    const cells = highlightedCells(lines, grid);
    for (let r = 0; r < REELS; r++) {
      const strip = this.strips[r];
      if (!strip) continue;
      for (let row = 0; row < ROWS; row++) {
        if (!cells.has(`${r}-${row}`)) continue;
        const sprite = strip[row];
        if (!sprite) continue;
        sprite.tint = HIGHLIGHT_TINT;
        gsap.killTweensOf(sprite.scale);
        if (this.animationsEnabled) {
          gsap.to(sprite.scale, { x: 1.05, y: 1.05, duration: 0.75, ease: "sine.inOut", yoyo: true, repeat: -1 });
        }
      }
    }
  }

  clearHighlights(): void {
    for (const strip of this.strips) {
      for (let row = 0; row < ROWS; row++) {
        const sprite = strip[row];
        if (!sprite) continue;
        gsap.killTweensOf(sprite.scale);
        sprite.scale.set(1);
        sprite.tint = NO_TINT;
      }
    }
  }

  /** The real board-frame artwork, scaled so its (measured) inner window exactly matches
   * the reel grid's own bounds — the frame sprite sits behind the reels in paint order but
   * its ornate border is wider than the reel area, so it reads as a cabinet the reels are
   * mounted inside rather than a plain rectangle. */
  private buildCabinetFrame(frameTexture: Texture): Container {
    const frame = new Container();
    const windowFracW = FRAME_WINDOW.right - FRAME_WINDOW.left;
    const windowFracH = FRAME_WINDOW.bottom - FRAME_WINDOW.top;
    const frameWidth = BOARD_WIDTH / windowFracW;
    const frameHeight = BOARD_HEIGHT / windowFracH;
    const offsetX = FRAME_WINDOW.left * frameWidth;
    const offsetY = FRAME_WINDOW.top * frameHeight;

    this.frameBounds = { width: frameWidth, height: frameHeight, offsetX, offsetY };

    const glow = new Graphics()
      .roundRect(-offsetX * 0.6, -offsetY * 0.6, frameWidth + offsetX * 0.2, frameHeight + offsetY * 0.2, 60)
      .fill({ color: FRAME_GLOW_COLOR, alpha: 0.16 });
    frame.addChild(glow);
    this.cabinetGlow = glow;
    gsap.to(glow, { alpha: 0.26, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });

    const frameSprite = new Sprite(frameTexture);
    frameSprite.width = frameWidth;
    frameSprite.height = frameHeight;
    frameSprite.position.set(-offsetX, -offsetY);
    frame.addChild(frameSprite);

    return frame;
  }

  /** Original, procedurally-drawn "monster" board frame (no image): a toxic-green stone maw
   * ringed with fangs, warty bumps, horns, and glowing eyes. Sizes its inner window exactly
   * like the desert cabinet so the reel grid still lands in the same place. */
  private buildMonsterFrame(): Container {
    const frame = new Container();
    const windowFracW = FRAME_WINDOW.right - FRAME_WINDOW.left;
    const windowFracH = FRAME_WINDOW.bottom - FRAME_WINDOW.top;
    const frameWidth = BOARD_WIDTH / windowFracW;
    const frameHeight = BOARD_HEIGHT / windowFracH;
    const offsetX = FRAME_WINDOW.left * frameWidth;
    const offsetY = FRAME_WINDOW.top * frameHeight;
    this.frameBounds = { width: frameWidth, height: frameHeight, offsetX, offsetY };

    const fx = -offsetX;
    const fy = -offsetY;
    const R = 72;

    // Pulsing toxic aura behind the frame.
    const glow = new Graphics()
      .roundRect(fx - offsetX * 0.15, fy - offsetY * 0.15, frameWidth + offsetX * 0.3, frameHeight + offsetY * 0.3, R + 24)
      .fill({ color: 0x2fae5a, alpha: 0.16 });
    frame.addChild(glow);
    this.cabinetGlow = glow;
    gsap.to(glow, { alpha: 0.32, duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 });

    // Horns poking out of the top corners.
    const horns = new Graphics();
    horns.poly([fx + 70, fy + 30, fx + 6, fy - 76, fx + 128, fy + 8]).fill({ color: 0x7a1f14 }).stroke({ width: 4, color: 0x4a1109 });
    horns.poly([fx + frameWidth - 70, fy + 30, fx + frameWidth - 6, fy - 76, fx + frameWidth - 128, fy + 8]).fill({ color: 0x7a1f14 }).stroke({ width: 4, color: 0x4a1109 });
    frame.addChild(horns);

    // Stone body + bevel.
    frame.addChild(
      new Graphics()
        .roundRect(fx, fy, frameWidth, frameHeight, R)
        .fill({ color: 0x13291c })
        .stroke({ width: 10, color: 0x2fae5a, alpha: 0.9 }),
    );
    frame.addChild(
      new Graphics()
        .roundRect(fx + 18, fy + 18, frameWidth - 36, frameHeight - 36, R - 14)
        .stroke({ width: 6, color: 0x1c3a29 }),
    );

    // Warty bumps scattered on the border.
    const warts = new Graphics();
    const wartPts: [number, number, number][] = [
      [fx + 80, fy + 120, 16],
      [fx + frameWidth - 90, fy + 100, 13],
      [fx + 60, fy + frameHeight - 150, 15],
      [fx + frameWidth - 70, fy + frameHeight - 120, 18],
      [fx + frameWidth * 0.5, fy + frameHeight - 46, 14],
      [fx + 40, fy + frameHeight * 0.5, 12],
      [fx + frameWidth - 40, fy + frameHeight * 0.5, 12],
    ];
    for (const [wx, wy, wr] of wartPts) {
      warts.circle(wx, wy, wr).fill({ color: 0x255c39 });
      warts.circle(wx - wr * 0.3, wy - wr * 0.3, wr * 0.4).fill({ color: 0x39d06f, alpha: 0.6 });
    }
    frame.addChild(warts);

    // Dark reel-window backdrop with a glowing rim (reels render on top of this).
    frame.addChild(
      new Graphics()
        .roundRect(-8, -8, BOARD_WIDTH + 16, BOARD_HEIGHT + 16, 26)
        .fill({ color: 0x06120c })
        .stroke({ width: 6, color: 0x39d06f, alpha: 0.85 }),
    );

    // Fangs ringing the mouth (top point down, bottom point up). Their inner tips tuck just
    // behind the reels, so they read as teeth around the opening without covering symbols.
    const fangs = new Graphics();
    const n = 9;
    const fw = BOARD_WIDTH / n;
    for (let i = 0; i < n; i++) {
      const x = i * fw;
      const len = i % 2 === 0 ? 92 : 62;
      // top fang: wide base up in the brow, tip pointing down to the window edge
      fangs
        .poly([x + 4, -len - 14, x + fw - 4, -len - 14, x + fw / 2, -6])
        .fill({ color: 0xe9e5d2 })
        .stroke({ width: 2, color: 0x9c9a86, alpha: 0.5 });
      // bottom fang: wide base in the jaw, tip pointing up to the window edge
      fangs
        .poly([x + 4, BOARD_HEIGHT + len + 14, x + fw - 4, BOARD_HEIGHT + len + 14, x + fw / 2, BOARD_HEIGHT + 6])
        .fill({ color: 0xe9e5d2 })
        .stroke({ width: 2, color: 0x9c9a86, alpha: 0.5 });
    }
    // Side fangs down the left/right borders so the whole mouth is ringed with teeth and the
    // side gaps aren't empty.
    const nSide = 5;
    const sh = BOARD_HEIGHT / nSide;
    for (let i = 0; i < nSide; i++) {
      const y = i * sh;
      const sl = i % 2 === 0 ? 82 : 54;
      fangs
        .poly([-sl - 14, y + 4, -sl - 14, y + sh - 4, -6, y + sh / 2])
        .fill({ color: 0xe9e5d2 })
        .stroke({ width: 2, color: 0x9c9a86, alpha: 0.5 });
      fangs
        .poly([BOARD_WIDTH + sl + 14, y + 4, BOARD_WIDTH + sl + 14, y + sh - 4, BOARD_WIDTH + 6, y + sh / 2])
        .fill({ color: 0xe9e5d2 })
        .stroke({ width: 2, color: 0x9c9a86, alpha: 0.5 });
    }
    frame.addChild(fangs);

    // Glowing eyes on the side borders too, so the sides feel alive rather than empty.
    for (const [ex, ey] of [
      [-offsetX * 0.5, BOARD_HEIGHT * 0.5],
      [BOARD_WIDTH + offsetX * 0.5, BOARD_HEIGHT * 0.5],
    ] as [number, number][]) {
      const r = offsetX * 0.24;
      const e = new Graphics();
      e.circle(ex, ey, r * 1.1).fill({ color: 0xff5147, alpha: 0.25 });
      e.circle(ex, ey, r).fill({ color: 0x0a1a10 });
      e.circle(ex, ey, r * 0.7).fill({ color: 0xff7a52 }).stroke({ width: 3, color: 0x7a1f14 });
      e.ellipse(ex, ey, r * 0.24, r * 0.58).fill({ color: 0x160a04 });
      e.circle(ex - r * 0.26, ey - r * 0.28, r * 0.16).fill({ color: 0xffffff, alpha: 0.9 });
      frame.addChild(e);
    }

    // Two glowing eyes high on the brow.
    for (const ex of [BOARD_WIDTH * 0.3, BOARD_WIDTH * 0.7]) {
      const ey = fy + offsetY * 0.42;
      const r = Math.min(offsetY, offsetX) * 0.34;
      const eye = new Graphics();
      eye.circle(ex, ey, r * 1.05).fill({ color: 0x2fae5a, alpha: 0.28 });
      eye.circle(ex, ey, r).fill({ color: 0x0a1a10 });
      eye.circle(ex, ey, r * 0.72).fill({ color: 0xffe27a }).stroke({ width: 3, color: 0xe8891a });
      eye.ellipse(ex, ey, r * 0.24, r * 0.6).fill({ color: 0x160a04 });
      eye.circle(ex - r * 0.28, ey - r * 0.3, r * 0.16).fill({ color: 0xffffff, alpha: 0.9 });
      frame.addChild(eye);
    }

    // Slime drips oozing off the bottom edge.
    const slime = new Graphics();
    for (const [dx, dl] of [
      [fx + frameWidth * 0.22, 46],
      [fx + frameWidth * 0.5, 68],
      [fx + frameWidth * 0.78, 40],
    ] as [number, number][]) {
      const by = fy + frameHeight - 6;
      slime.roundRect(dx - 9, by - 20, 18, 30, 9).fill({ color: 0x3fae52 });
      slime.circle(dx, by + dl - 6, 11).fill({ color: 0x3fae52 });
      slime.circle(dx - 3, by + dl - 10, 4).fill({ color: 0x8ff0a8, alpha: 0.7 });
    }
    frame.addChild(slime);

    return frame;
  }

  private layout(): void {
    if (!this.app || !this.board) return;
    const { width, height } = this.app.screen;
    // Fit the whole frame image's own bounding box (its ornate border extends well beyond
    // the bare reel area), not just the reels, so nothing clips against the container edges.
    const { width: frameWidth, height: frameHeight, offsetX, offsetY } = this.frameBounds;
    const scale = Math.min(width / frameWidth, height / frameHeight) * 0.995;
    this.board.scale.set(scale);
    this.board.x = (width - frameWidth * scale) / 2 + offsetX * scale;
    this.board.y = (height - frameHeight * scale) / 2 + offsetY * scale;
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    for (const strip of this.strips) {
      for (const sprite of strip) gsap.killTweensOf(sprite.scale);
    }
    for (const container of this.stripContainers) gsap.killTweensOf(container);
    for (const container of this.reelVisualContents) gsap.killTweensOf(container.scale);
    if (this.cabinetGlow) gsap.killTweensOf(this.cabinetGlow);
    this.app?.destroy({ removeView: true }, { children: true, texture: true });
    this.app = null;
  }
}
