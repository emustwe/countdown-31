import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Mobile & Tablet Arena UI & 7-Card Proportional Fit Suite", () => {
  test.setTimeout(90_000);

  const screenshotDir = path.join(process.cwd(), "test-results", "mobile-reposition-screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  test("1. Mobile Phone (393x852) - 7 Cards in Game Box & Avatars with Attached Skills Below", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    // Verify all 7 card slots exist in the cylinder drum
    const cardButtons = page.locator('div[role="button"][aria-label^="Number "]');
    await expect(cardButtons).toHaveCount(7);

    // Verify Player Avatar & Opponent Avatar cards are present below the cylinder
    const joinPrompt = page.locator('text=TAP TO JOIN');
    await expect(joinPrompt).toBeVisible();

    const opponentCard = page.locator('text=Daisy Cow').or(page.locator('text=The Pasture Slayer')).or(page.locator('text=Clockwork Bull'));
    await expect(opponentCard.first()).toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, "mobile-01-waiting-arena.png"), fullPage: true });

    // Join Game
    const joinBtn = page.locator('button:has-text("JOIN THE GAME")');
    if (await joinBtn.isVisible()) {
      await joinBtn.click();
      const nameInput = page.locator('.cd31-gate input');
      await expect(nameInput).toBeVisible();
      await nameInput.fill("MobileCowboy");
      await page.locator('.cd31-gate button:has-text("Enter Game")').click();
      await page.waitForTimeout(400);

      const startBtn = page.locator('button:has-text("START GAME")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Verify Player's Avatar is visible with player name and attached tactical skills below game box
    await expect(page.locator('.arena-center').getByText('MobileCowboy')).toBeVisible();
    await expect(page.locator('.arena-center').getByText(/YOU ·|YOU$/).first()).toBeVisible();

    // Verify attached skill buttons are rendered on the player card
    const skillBtns = page.locator('.arena-center button[aria-label^="Use "]');
    const skillCount = await skillBtns.count();
    expect(skillCount).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: path.join(screenshotDir, "mobile-02-joined-battle.png"), fullPage: true });
  });

  test("2. Tablet (820x1180) - 7 Cards & Full Multi-Device Responsiveness", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    // Verify 7 cards are rendered
    const cardButtons = page.locator('div[role="button"][aria-label^="Number "]');
    await expect(cardButtons).toHaveCount(7);

    // Verify no horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBeFalsy();

    await page.screenshot({ path: path.join(screenshotDir, "tablet-01-arena.png"), fullPage: true });
  });
});
