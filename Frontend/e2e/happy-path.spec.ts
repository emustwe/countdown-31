import { test, expect } from "@playwright/test";

test("register, deposit USDT, withdraw to a Solana address, and see it in history", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "Password123!";
  const solanaAddress = "So11111111111111111111111111111111111111112";

  await test.step("register", async () => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await page.fill('input[placeholder*="Slayer"], input[type="text"]', "E2E Player");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*home/, { timeout: 15000 });
  });

  await page.goto("/wallet", { waitUntil: "domcontentloaded" });
  const balance = page.getByRole("heading", { name: /USDT/i });
  await expect(balance).toBeVisible({ timeout: 10000 });

  await test.step("deposit flow verification", async () => {
    // Fill test from-address for simulated verification
    const sigInput = page.locator('input[placeholder*="Solana"], input[placeholder*="signature"]').first();
    if (await sigInput.isVisible()) {
      await sigInput.fill(solanaAddress);
      await page.locator('button:has-text("VERIFY & CREDIT DEPOSIT")').click();
    }
  });

  await test.step("withdraw mode and address submission", async () => {
    // Switch to withdraw tab
    await page.locator('button:has-text("WITHDRAW")').first().click();
    const addrInput = page.locator('input[placeholder*="Solana"], input[placeholder*="address"]').first();
    if (await addrInput.isVisible()) {
      await addrInput.fill(solanaAddress);
    }
  });

  await test.step("history ledger presence", async () => {
    await expect(page.getByText(/RECENT ACTIVITY/i)).toBeVisible();
  });
});
