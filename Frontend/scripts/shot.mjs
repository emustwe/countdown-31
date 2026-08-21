/**
 * Reusable screenshot tool. Logs in as a demo player, then screenshots the given paths.
 * Usage:
 *   node scripts/shot.mjs <outDir> <path1> [path2 ...]
 *   node scripts/shot.mjs /tmp/shots "/tournaments" "/game/va-practice"
 * Env: BASE (default http://localhost:3000), EMAIL, PASSWORD, WIDTH, HEIGHT, MOBILE=1, DELAY (ms before shot)
 */
import pkg from "../node_modules/playwright-core/index.js";
const { chromium } = pkg;
const outDir = process.argv[2] || "/tmp/shots";
const paths = process.argv.slice(3);
const BASE = process.env.BASE || "http://localhost:3000";
const EMAIL = process.env.EMAIL || "alice@auroraways.demo";
const PASSWORD = process.env.PASSWORD || "Player123!";
const W = Number(process.env.WIDTH || (process.env.MOBILE ? 430 : 1300));
const H = Number(process.env.HEIGHT || (process.env.MOBILE ? 900 : 950));
import { mkdirSync } from "node:fs";
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, ...(process.env.MOBILE ? { isMobile: true, hasTouch: true } : {}) });
const p = await ctx.newPage();
try {
  await p.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await p.fill("input[type=email]", EMAIL);
  await p.fill("input[type=password]", PASSWORD);
  await p.click("button.primary.full.xl");
  await p.waitForTimeout(3000);
  for (const path of paths) {
    const name = path.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "page";
    await p.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 });
    await p.waitForTimeout(Number(process.env.DELAY || 2500));
    await p.screenshot({ path: `${outDir}/${name}.png`, fullPage: true });
    console.log("shot:", `${outDir}/${name}.png`);
  }
} catch (e) { console.log("ERR", e.message); }
await b.close();
