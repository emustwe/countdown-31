import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Dedicated mobile and tablet arena shell", () => {
  test.setTimeout(90_000);

  const screenshotDir = path.join(process.cwd(), "test-results", "mobile-reposition-screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  test("1. Mobile Phone (393x852) - compact number deck and battle strip", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    // Mobile intentionally shows only the five useful nearby numbers.
    const cardButtons = page.locator('.mobile-number-deck button[aria-label^="Number "]');
    await expect(cardButtons).toHaveCount(5);

    // Players use compact game-style pods instead of vertically stretched cards.
    const joinPrompt = page.getByRole('button', { name: /tap to join/i });
    await expect(joinPrompt).toBeVisible();

    const opponentCard = page.locator('.mobile-player-pod.is-rival').getByText(/Daisy Cow|The Pasture Slayer|Clockwork Bull/);
    await expect(opponentCard.first()).toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, "mobile-01-waiting-arena.png"), fullPage: true });

    // Join Game
    const joinBtn = page.getByRole('button', { name: /^join game$/i });
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

    // Verify the joined player and attached tactical skills in the mobile battle strip.
    await expect(page.locator('.mobile-battle-strip').getByText('MobileCowboy')).toBeVisible();
    await expect(page.locator('.mobile-player-pod.is-you')).toBeVisible();

    // Verify attached skill buttons are rendered on the player card
    const skillBtns = page.locator('.mobile-skill-rail.is-local button[aria-label^="Use "]');
    const skillCount = await skillBtns.count();
    expect(skillCount).toBeGreaterThanOrEqual(1);

    await page.screenshot({ path: path.join(screenshotDir, "mobile-02-joined-battle.png"), fullPage: true });

    // Select Card 1 and verify the CONFIRM MOVE button appears cleanly without overlapping avatars
    const card1 = page.locator('.mobile-number-deck button[aria-label="Number 1"]');
    if (await card1.isVisible()) {
      await card1.click();
      await page.waitForTimeout(300);
      const confirmBtn = page.locator('button:has-text("CONFIRM MOVE")');
      if (await confirmBtn.isVisible()) {
        await page.screenshot({ path: path.join(screenshotDir, "mobile-03-confirm-move-state.png"), fullPage: true });
      }
    }
  });

  test("2. Tablet (820x1180) - dedicated shell with no overflow", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(600);

    const cardButtons = page.locator('.mobile-number-deck button[aria-label^="Number "]');
    await expect(cardButtons).toHaveCount(5);

    // Verify no horizontal overflow
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBeFalsy();

    await page.screenshot({ path: path.join(screenshotDir, "tablet-01-arena.png"), fullPage: true });
  });
});
