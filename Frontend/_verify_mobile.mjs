import { chromium } from "playwright";
const SHOT = "/private/tmp/claude-503/-Users-emustwe-Desktop-Projects-SlotMachine-game/7064a21c-f7e5-4a82-9acd-26f7b936806b/scratchpad";
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") errors.push(`[console] ${m.text()}`); });
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${SHOT}/mob2-full.png`, fullPage: true });
// The transition zone (art bottom -> form top)
await page.evaluate(() => window.scrollTo(0, document.querySelector(".auth-form-wrap").offsetTop - 220));
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOT}/mob2-seam.png` });
console.log(errors.length ? "ERRORS:\n" + errors.join("\n") : "NO CONSOLE/PAGE ERRORS");
await browser.close();
