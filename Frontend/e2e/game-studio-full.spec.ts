import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

test.describe("Game Studio Deep End-to-End & Tournament Isolation Test", () => {
  test.beforeEach(async ({ page }) => {
    // Auto-accept confirmation dialogs (e.g. Reset confirmation)
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Sign in as Admin
    await page.goto("/admin");
    const adminEmailInput = page.locator('input[type="email"]');
    if (await adminEmailInput.isVisible()) {
      await adminEmailInput.fill("admin@auroraways.demo");
      await page.locator('input[type="password"]').fill("Admin123!");
      await page.locator('button:has-text("SIGN IN TO ADMIN CONSOLE")').click();
    }
    await expect(page.locator("h1")).toContainText(/Platform Overview/i, { timeout: 15000 });
  });

  test("Comprehensive Game Studio full feature test with screenshots", async ({ page }) => {
    test.setTimeout(120_000);
    const screenshotDir = path.join(process.cwd(), "test-results", "screenshots");
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    // 1. Navigate to Game Studio
    await page.click('button:has-text("Game Studio")');
    await expect(page.locator("h1")).toContainText(/GAME STUDIO/i, { timeout: 10000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotDir, "01-control-room.png"), fullPage: true });

    // 2. Test Tab: Brand & Copy
    await page.click('button:has-text("Brand & copy")');
    await expect(page.getByRole("heading", { name: "Brand & copy" })).toBeVisible();

    const uniqueTitle = `TOURNAMENT 31 #${Date.now().toString().slice(-4)}`;
    const titleInput = page.locator('input.studio-input').first();
    await titleInput.fill(uniqueTitle);

    const emojiInput = page.locator('input.studio-input[maxlength="8"]');
    if (await emojiInput.isVisible()) {
      await emojiInput.fill("🏆");
    }

    const announceTextarea = page.locator('textarea.studio-input');
    await announceTextarea.fill("Special Tournament Edition: 10,000 USDT Prize Battle!");

    await page.screenshot({ path: path.join(screenshotDir, "02-branding-tab.png"), fullPage: true });

    // 3. Test Tab: Arena Designer
    await page.click('button:has-text("Arena designer")');
    await expect(page.getByRole("heading", { name: "Arena designer" })).toBeVisible();

    // Select Champion Arena preset background
    const champArenaBtn = page.locator('button:has-text("Champion Arena")');
    if (await champArenaBtn.isVisible()) {
      await champArenaBtn.click();
    }
    await page.screenshot({ path: path.join(screenshotDir, "03-arena-designer.png"), fullPage: true });

    // 4. Test Tab: Game Setup
    await page.click('button:has-text("Game setup")');
    await expect(page.getByRole("heading", { name: "Game setup" })).toBeVisible();

    // Change turn timer to 10s
    const timerInput = page.locator('input[type="number"][min="3"]');
    if (await timerInput.isVisible()) {
      await timerInput.fill("10");
    }
    await page.screenshot({ path: path.join(screenshotDir, "04-gameplay-tab.png"), fullPage: true });

    // 5. Test Tab: Skill Deck
    await page.click('button:has-text("Skill deck")');
    await expect(page.getByRole("heading", { name: "Skill deck" })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "05-skill-deck.png"), fullPage: true });

    // 6. Test Tab: Bot Roster
    await page.click('button:has-text("Bot roster")');
    await expect(page.getByRole("heading", { name: "Bot roster" })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "06-bot-roster.png"), fullPage: true });

    // 7. Test Tab: Player Menu
    await page.click('button:has-text("Player menu")');
    await expect(page.getByRole("heading", { name: "Player menu" })).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "07-player-menu.png"), fullPage: true });

    // 8. Publish the changes
    const publishBtn = page.locator('button:has-text("Publish game")');
    await expect(publishBtn).toBeEnabled({ timeout: 5000 });
    await publishBtn.click();

    // Verify Published status
    await expect(page.getByText(/Published successfully ✓/i)).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotDir, "08-published-state.png"), fullPage: true });

    // 9. Verify Base Game (/home) stays on default look
    await page.goto("/home");
    await page.waitForTimeout(800);
    // Base game title must remain the default COUNT DOWN
    await expect(page.locator("body")).toContainText("COUNT DOWN");
    await page.screenshot({ path: path.join(screenshotDir, "09-base-game-default.png"), fullPage: true });

    // 10. Verify Tournaments page (/events)
    await page.goto("/events");
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(screenshotDir, "10-tournaments-list.png"), fullPage: true });

    // 11. Navigate back to Game Studio and Reset to Safe Defaults
    await page.goto("/admin/game");
    await expect(page.locator("h1")).toContainText(/GAME STUDIO/i);

    const resetBtn = page.locator('button:has-text("Reset")');
    await resetBtn.click();

    // If reset creates a publishable difference, publish it
    const publishAfterReset = page.locator('button:has-text("Publish game")');
    if (await publishAfterReset.isEnabled()) {
      await publishAfterReset.click();
      await expect(page.getByText(/Published successfully ✓/i)).toBeVisible({ timeout: 10000 });
    }
    await page.screenshot({ path: path.join(screenshotDir, "11-reset-defaults.png"), fullPage: true });
  });
});
