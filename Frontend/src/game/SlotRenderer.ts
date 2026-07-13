import { Application, Container, Graphics, Sprite, type Texture } from "pixi.js";
import gsap from "gsap";
import type { Grid, SymbolId, WinLineDto } from "../lib/api-types";
import { ALL_SYMBOL_IDS } from "./symbols";
import { buildSymbolTextures } from "./buildSymbolTextures";
import { playReelStop } from "./sound";
import { highlightedCells } from "./highlightedCells";

const REELS = 5;
const ROWS = 5;
const BUFFER = 15;
const STRIP_LENGTH = ROWS * 2 + BUFFER; // head (current result) + filler + tail (new result)
const CELL_SIZE = 84;
const GAP = 8;
const CELL_STEP = CELL_SIZE + GAP;
const BOARD_WIDTH = REELS * CELL_SIZE + (REELS - 1) * GAP;
const BOARD_HEIGHT = ROWS * CELL_SIZE + (ROWS - 1) * GAP;
const HIGHLIGHT_TINT = 0xf2c94c;
const NO_TINT = 0xffffff;

function randomSymbolId(): SymbolId {
  return ALL_SYMBOL_IDS[Math.floor(Math.random() * ALL_SYMBOL_IDS.length)] as SymbolId;
}

export class SlotRenderer {
  private app: Application | null = null;
  private textures: Record<SymbolId, Texture> | null = null;
  private board: Container | null = null;
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

    container.appendChild(app.canvas);
    this.app = app;

    this.textures = buildSymbolTextures(app, CELL_SIZE);

    const board = new Container();
    app.stage.addChild(board);
    this.board = board;

    for (let r = 0; r < REELS; r++) {
      const reelContainer = new Container();
      reelContainer.x = r * CELL_STEP;
      board.addChild(reelContainer);

      const mask = new Graphics().rect(0, 0, CELL_SIZE, BOARD_HEIGHT).fill(0xffffff);
      reelContainer.addChild(mask);
      reelContainer.mask = mask;

      const stripContainer = new Container();
      reelContainer.addChild(stripContainer);
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

  /** Animates every reel from its current resting grid to `grid`, staggering each reel's
   * stop time for the classic cascading-stop look, and resolves once all reels have
   * landed. Falls back to an instant swap when animations are disabled in Settings. */
  async spinTo(grid: Grid): Promise<void> {
    if (!this.animationsEnabled) {
      this.showGrid(grid);
      return;
    }

    const tweenPromises: Promise<void>[] = [];

    for (let r = 0; r < REELS; r++) {
      const strip = this.strips[r];
      const container = this.stripContainers[r];
      const column = grid[r];
      if (!strip || !container || !column || !this.textures) continue;

      for (let i = ROWS; i < ROWS + BUFFER; i++) {
        const sprite = strip[i];
        if (sprite) sprite.texture = this.textures[randomSymbolId()];
      }
      for (let row = 0; row < ROWS; row++) {
        const sprite = strip[ROWS + BUFFER + row];
        const symbol = column[row];
        if (sprite && symbol) sprite.texture = this.textures[symbol];
      }

      const duration = 0.7 + r * 0.15;
      const targetY = -(ROWS + BUFFER) * CELL_STEP;

      tweenPromises.push(
        new Promise<void>((resolve) => {
          gsap.to(container, {
            y: targetY,
            duration,
            ease: "power2.out",
            onComplete: () => {
              container.y = 0;
              for (let row = 0; row < ROWS; row++) {
                const headSprite = strip[row];
                const symbol = column[row];
                if (headSprite && symbol) headSprite.texture = this.textures![symbol];
              }
              if (this.soundEnabled) playReelStop();
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

  private layout(): void {
    if (!this.app || !this.board) return;
    const { width, height } = this.app.screen;
    const scale = Math.min(width / BOARD_WIDTH, height / BOARD_HEIGHT) * 0.94;
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
    this.app?.destroy({ removeView: true }, { children: true, texture: true });
    this.app = null;
  }
}
