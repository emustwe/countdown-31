import { Application, BlurFilter, Container, FillGradient, Graphics, Sprite, type Texture } from "pixi.js";
import gsap from "gsap";
import type { Grid, SymbolId, WinLineDto } from "../lib/api-types";
import { ALL_SYMBOL_IDS } from "./symbols";
import { buildSymbolTextures } from "./buildSymbolTextures";
import { playReelStop } from "./sound";
import { highlightedCells } from "./highlightedCells";

const REELS = 5;
const ROWS = 5;
const BUFFER = 15;
const OVERSHOOT_BUFFER = 2; // extra sprites past the target, so the bounce-back has something to show
const STRIP_LENGTH = ROWS * 2 + BUFFER + OVERSHOOT_BUFFER; // head + filler + tail (target) + overshoot
const CELL_SIZE = 120;
const GAP = 12;
const CELL_STEP = CELL_SIZE + GAP;
const BOARD_WIDTH = REELS * CELL_SIZE + (REELS - 1) * GAP;
const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GAP;
const CABINET_PAD = 28;
const HIGHLIGHT_TINT = 0xf2c94c;
const NO_TINT = 0xffffff;
const OVERSHOOT_PIXELS = CELL_STEP * 0.4;

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

    this.textures = buildSymbolTextures(app, CELL_SIZE);

    const board = new Container();
    app.stage.addChild(board);
    this.board = board;

    board.addChild(this.buildCabinetFrame());

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

    board.addChild(this.buildReelDividers());

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

      const spinDuration = 0.55 + r * 0.14;
      const targetY = -(ROWS + BUFFER) * CELL_STEP;
      const overshootY = targetY - OVERSHOOT_PIXELS;
      const blur = new BlurFilter({ strengthX: 0, strengthY: 26, quality: 3 });

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

          // Bounce back to the exact resting position.
          tl.to(stripContainer, {
            y: targetY,
            duration: 0.32,
            ease: "back.out(2.2)",
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
                { x: 1.08, y: 0.92 },
                { x: 1, y: 1, duration: 0.28, ease: "elastic.out(1, 0.5)" },
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
          gsap.to(sprite.scale, { x: 1.12, y: 1.12, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: -1 });
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

  /** A dark, gold-trimmed "cabinet" backing behind the reels — drawn once as a child of
   * `board` so it scales and repositions together with everything else in layout(). */
  private buildCabinetFrame(): Container {
    const frame = new Container();
    const x0 = -CABINET_PAD;
    const y0 = -CABINET_PAD;
    const w = BOARD_WIDTH + CABINET_PAD * 2;
    const h = BOARD_HEIGHT + CABINET_PAD * 2;
    const radius = CABINET_PAD * 1.1;

    const glow = new Graphics()
      .roundRect(x0 - 10, y0 - 10, w + 20, h + 20, radius + 8)
      .fill({ color: 0xf2c94c, alpha: 0.16 });
    frame.addChild(glow);

    const panelGradient = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 0x1c2138 },
        { offset: 1, color: 0x0b0e1a },
      ],
      textureSpace: "local",
    });

    const panel = new Graphics()
      .roundRect(x0, y0, w, h, radius)
      .fill(panelGradient)
      .stroke({ width: 4, color: 0xf2c94c, alpha: 0.85, alignment: 1 })
      .roundRect(x0 + 6, y0 + 6, w - 12, h - 12, radius * 0.85)
      .stroke({ width: 1.5, color: 0xffe08a, alpha: 0.35, alignment: 1 });
    frame.addChild(panel);

    // Small corner accents — a common cabinet/marquee detail, kept cheap (four circles).
    const corners: Array<[number, number]> = [
      [x0 + 14, y0 + 14],
      [x0 + w - 14, y0 + 14],
      [x0 + 14, y0 + h - 14],
      [x0 + w - 14, y0 + h - 14],
    ];
    const gems = new Graphics();
    for (const [cx, cy] of corners) {
      gems.circle(cx, cy, 5).fill({ color: 0xf2c94c, alpha: 0.9 });
    }
    frame.addChild(gems);

    return frame;
  }

  /** Thin gold dividers between reels, purely cosmetic. */
  private buildReelDividers(): Container {
    const dividers = new Container();
    const g = new Graphics();
    for (let r = 1; r < REELS; r++) {
      const x = r * CELL_STEP - GAP / 2;
      g.moveTo(x, 0).lineTo(x, BOARD_HEIGHT).stroke({ width: 1, color: 0xf2c94c, alpha: 0.18 });
    }
    dividers.addChild(g);
    return dividers;
  }

  private layout(): void {
    if (!this.app || !this.board) return;
    const { width, height } = this.app.screen;
    // Fit the whole cabinet frame (reels + padding + glow bleed), not just the reels,
    // so the decorative border never clips against the container edges.
    const frameMargin = CABINET_PAD + 20;
    const frameWidth = BOARD_WIDTH + frameMargin * 2;
    const frameHeight = BOARD_HEIGHT + frameMargin * 2;
    const scale = Math.min(width / frameWidth, height / frameHeight) * 0.96;
    this.board.scale.set(scale);
    this.board.x = (width - BOARD_WIDTH * scale) / 2;
    this.board.y = (height - BOARD_HEIGHT * scale) / 2;
  }

  destroy(): void {
    this.destroyed = true;
    this.resizeObserver?.disconnect();
    for (const strip of this.strips) {
      for (const sprite of strip) gsap.killTweensOf(sprite.scale);
    }
    for (const container of this.stripContainers) gsap.killTweensOf(container);
    for (const container of this.reelVisualContents) gsap.killTweensOf(container.scale);
    this.app?.destroy({ removeView: true }, { children: true, texture: true });
    this.app = null;
  }
}
