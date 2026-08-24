import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Mobile Shell & Tablet Interactive Verification Suite", () => {
  test.setTimeout(120_000);

  const screenshotDir = path.join(process.cwd(), "test-results", "mobile-screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  test("1. Mobile Phone (iPhone 14 Pro, 393x852) - Bottom Nav & Game Interactions", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Verify Mobile Bottom Nav is visible and active on Home
    const bottomNav = page.locator(".mobile-bottom-nav");
    await expect(bottomNav).toBeVisible();
    const homeTab = page.locator('.mobile-nav-item:has-text("Home")');
    await expect(homeTab).toHaveClass(/active/);

    await page.screenshot({ path: path.join(screenshotDir, "mobile-01-home.png"), fullPage: true });

    // Join Game as Guest
    const joinBtn = page.locator('button:has-text("JOIN THE GAME")');
    if (await joinBtn.isVisible()) {
      await joinBtn.click();
      const nameInput = page.locator('.cd31-gate input');
      await expect(nameInput).toBeVisible();
      await nameInput.fill("MobileWarrior");
      await page.locator('.cd31-gate button:has-text("Enter Game")').click();
      await page.waitForTimeout(400);

      // Handle Skill loadout modal if present
      const startBtn = page.locator('button:has-text("START GAME")');
      if (await startBtn.isVisible()) {
        await startBtn.click();
        await page.waitForTimeout(400);
      }
    }

    // Toggle Sound Button in Header
    const soundBtn = page.locator('button[aria-label="Sound Toggle"]');
    if (await soundBtn.isVisible()) {
      await soundBtn.click();
    }

    await page.screenshot({ path: path.join(screenshotDir, "mobile-02-in-game.png"), fullPage: true });

    // Bottom Nav: Navigate to Events
    await page.locator('.mobile-nav-item:has-text("Events")').click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toContainText(/ACCOUNT REQUIRED|TOURNAMENTS/i);
    await page.screenshot({ path: path.join(screenshotDir, "mobile-03-events.png"), fullPage: true });

    // Bottom Nav: Navigate to Shop (unauthenticated guest routes to login gate)
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    await page.locator('.mobile-nav-item:has-text("Shop")').click();
    await page.waitForTimeout(500);
    await expect(page.locator("body")).toContainText(/Welcome Back|Join the Pasture|ARCADE BAZAAR/i);
    await page.screenshot({ path: path.join(screenshotDir, "mobile-04-shop.png"), fullPage: true });

    // Bottom Nav: Return to Home
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await expect(page.locator(".arena-viewport")).toBeVisible();
    await page.screenshot({ path: path.join(screenshotDir, "mobile-05-back-home.png"), fullPage: true });
  });

  test("2. Tablet (iPad Air, 820x1180) - Arena Layout & Multi-Column Experience", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Verify Tablet renders Header, Arena, and Bottom Nav
    await expect(page.locator(".mobile-bottom-nav")).toBeVisible();
    await expect(page.locator(".arena-viewport")).toBeVisible();

    await page.screenshot({ path: path.join(screenshotDir, "tablet-01-home.png"), fullPage: true });

    // Test Landing Page
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, "tablet-02-landing.png"), fullPage: true });

    // Test Sponsorship Page
    await page.goto("/sponsorship", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotDir, "tablet-03-sponsorship.png"), fullPage: true });
  });

  test("3. Small Phone (iPhone SE, 375x667) - Extreme Compact Viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);

    // Verify no horizontal overflow on 375px
    const overflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(overflow).toBeFalsy();

    await page.screenshot({ path: path.join(screenshotDir, "small-phone-01-home.png"), fullPage: true });
  });
});
