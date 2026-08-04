import { test, expect } from "@playwright/test";

// The one required e2e happy-path for the USDT wallet: register -> deposit USDT ->
// see the balance change -> withdraw to a Solana address -> see the balance change ->
// see both movements in the transaction history. Auth, wallet math, and the treasury
// double-entry all have integration coverage on the Backend; this proves the wallet
// on/off-ramp wires together end-to-end in a real browser.
test("register, deposit USDT, withdraw to a Solana address, and see it in history", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "password123";
  const solanaAddress = "So11111111111111111111111111111111111111112";

  await test.step("register", async () => {
    await page.goto("/register");
    await page.locator('input[autocomplete="name"]').fill("E2E Player");
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator("form.auth-form button.primary").click();
    await page.waitForURL("**/home", { timeout: 15000 });
  });

  await page.goto("/wallet");
  const balance = page.locator(".wallet-hero h1");
  await expect(balance).toContainText("USDT");

  await test.step("deposit 50 USDT", async () => {
    // Deposit mode is the default; the amount input defaults to 50.
    await page.locator(".deposit-card .money-input input").first().fill("50");
    await page.locator(".deposit-card button.primary.full").click();
    await expect(balance).toContainText("50.00 USDT", { timeout: 10000 });
  });

  await test.step("withdraw 20 USDT to a Solana address", async () => {
    // Second hero action switches the card to withdraw mode.
    await page.locator(".wallet-hero button").nth(1).click();
    await page.locator(".deposit-card .money-input input").first().fill("20");
    await page.locator('.deposit-card input[placeholder*="7xKq"]').fill(solanaAddress);
    await page.locator(".deposit-card button.primary.full").click();
    await expect(balance).toContainText("30.00 USDT", { timeout: 10000 });
  });

  await test.step("history shows the deposit and the withdrawal", async () => {
    const txCard = page.locator(".transaction-card");
    await expect(txCard.locator(".transaction")).toHaveCount(2, { timeout: 10000 });
  });
});
