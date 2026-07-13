import { test, expect } from "@playwright/test";

// The one required e2e happy-path: register -> login -> spin -> see balance change ->
// open history. Everything below it (auth, wallet, spin math, admin) already has
// integration-test coverage on the Backend and unit coverage on the Frontend; this test's
// job is just to prove the whole stack wires together in a real browser.
test("register, log in, spin, see the balance change, and see it in history", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  const password = "password123";

  await test.step("register", async () => {
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL("**/lobby");
    await expect(page.getByText(`Welcome back, ${email}`)).toBeVisible();
  });

  await test.step("log out, then log back in", async () => {
    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL("**/login");

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("**/lobby");
  });

  const balanceBefore = await page.locator("header").getByText("credits").textContent();
  expect(balanceBefore).toBe("1,000.00 credits");

  await test.step("spin and see the balance change", async () => {
    await page.locator('a[href="/game/aurora-ways"]').click();
    await page.waitForURL("**/game/aurora-ways");

    await page.getByRole("button", { name: "Spin" }).click();
    // The spin call + reel animation both need to settle before the balance moves.
    await expect(page.locator("header").getByText("credits")).not.toHaveText(balanceBefore!, {
      timeout: 10_000,
    });

    const balanceAfter = await page.locator("header").getByText("credits").textContent();
    expect(balanceAfter).not.toBe(balanceBefore);
  });

  await test.step("open history and see the round just played", async () => {
    await page.getByRole("link", { name: "History" }).click();
    await page.waitForURL("**/history");

    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toBeVisible();
    await expect(firstRow.getByText("10.00 credits")).toBeVisible();
  });
});
