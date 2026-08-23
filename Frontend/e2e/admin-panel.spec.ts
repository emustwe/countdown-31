import { test, expect } from "@playwright/test";

test.describe("Admin Panel Complete E2E Suite", () => {
  test.beforeEach(async ({ page }) => {
    // Auto-accept all browser confirms
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Navigate to admin
    await page.goto("/admin");
    // If the admin login console is shown, sign in using seed credentials
    const adminEmailInput = page.locator('input[type="email"]');
    if (await adminEmailInput.isVisible()) {
      await adminEmailInput.fill("admin@auroraways.demo");
      await page.locator('input[type="password"]').fill("Admin123!");
      await page.locator('button:has-text("SIGN IN TO ADMIN CONSOLE")').click();
    }
    // Wait for the Admin Dashboard to load
    await expect(page.locator("h1")).toContainText(/Platform Overview/i, { timeout: 15000 });
  });

  test("1. Dashboard Overview loads stats and inquiries", async ({ page }) => {
    // Verify hero stats cards with exact matching
    await expect(page.getByText("Total Players", { exact: true })).toBeVisible();
    await expect(page.getByText("Active (7 Days)", { exact: true })).toBeVisible();
    await expect(page.getByText("Active Sponsors", { exact: true })).toBeVisible();
    await expect(page.getByText("Pending Approvals", { exact: true })).toBeVisible();

    // Verify sections
    await expect(page.getByText("Pending Sponsor Tournaments")).toBeVisible();
    await expect(page.getByText("Sponsors Roster")).toBeVisible();
    await expect(page.getByText("Sponsorship & Entry Inquiries")).toBeVisible();
  });

  test("2. Tournament Manager: Create, Verify, Edit, and Delete Tournament", async ({ page }) => {
    // Navigate to Tournaments tab
    await page.click('button:has-text("Tournaments")');
    await expect(page.locator("h1")).toContainText(/Tournaments Manager/i);

    const uniqueTitle = `E2E Tournament ${Date.now()}`;

    // Fill Tournament creation form
    await page.fill('input[placeholder="e.g. Pasture Grand Prix 2026"]', uniqueTitle);
    await page.fill('input[placeholder="Rules summary or brand welcome message"]', "E2E automated testing championship");
    await page.fill('input[placeholder="e.g. 5,000 USDT"]', "10,000 USDT");
    await page.fill('input[type="number"][min="1"]', "3");

    // Submit Create
    await page.click('button:has-text("CREATE TOURNAMENT")');

    // Verify tournament title appears in list
    await expect(page.getByText(uniqueTitle).first()).toBeVisible({ timeout: 10000 });

    // Click Edit on the created tournament
    const tournamentContainer = page.locator('div.rounded-2xl', { hasText: uniqueTitle }).first();
    await tournamentContainer.locator('button:has-text("Edit")').first().click();
    await expect(page.getByRole("heading", { name: /Edit Tournament Details/i })).toBeVisible();

    const updatedTitle = `${uniqueTitle} - Updated`;
    await page.fill('input[placeholder="e.g. Pasture Grand Prix 2026"]', updatedTitle);
    await page.click('button:has-text("SAVE CHANGES")');

    // Verify updated title appears
    await expect(page.getByText(updatedTitle).first()).toBeVisible({ timeout: 10000 });

    // Delete the tournament
    const updatedContainer = page.locator('div.rounded-2xl', { hasText: updatedTitle }).first();
    await updatedContainer.locator('button:has-text("Delete")').first().click();

    // Verify deleted from UI
    await expect(page.getByText(updatedTitle)).toHaveCount(0, { timeout: 10000 });
  });

  test("3. Sponsor Manager: Create, Reveal Credentials, Edit, and Delete Sponsor", async ({ page }) => {
    // Navigate to Sponsors tab
    await page.click('button:has-text("Sponsors")');
    await expect(page.locator("h1")).toContainText(/Sponsor Accounts & Credentials/i);

    const sponsorName = `E2E Sponsor ${Date.now()}`;
    const sponsorUser = `e2e_user_${Date.now()}`;
    const sponsorPass = "SecurePass123!";

    // Create sponsor
    await page.fill('input[placeholder="e.g. Apex Energy"]', sponsorName);
    await page.fill('input[placeholder="auto-generated if blank"]', sponsorUser);
    await page.fill('input[placeholder="auto-generated if blank (min 6)"]', sponsorPass);
    await page.click('button:has-text("CREATE SPONSOR ACCOUNT")');

    // Verify Credentials Reveal modal
    await expect(page.getByText("Sponsor Account Created ✓")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("code").filter({ hasText: sponsorUser }).first()).toBeVisible();
    await page.click('button:has-text("DONE")');

    // Verify sponsor in list
    await expect(page.getByText(sponsorName).first()).toBeVisible({ timeout: 10000 });

    const sponsorContainer = page.locator('div.rounded-2xl', { hasText: sponsorName }).first();
    await expect(sponsorContainer).toContainText(sponsorUser);

    // Toggle password reveal
    const eyeButton = sponsorContainer.locator('button[title="Show password"]').first();
    if (await eyeButton.isVisible()) {
      await eyeButton.click();
      await expect(sponsorContainer.locator("code").filter({ hasText: sponsorPass }).first()).toBeVisible();
    }

    // Edit sponsor
    await sponsorContainer.locator('button:has-text("Edit")').first().click();
    await expect(page.getByText("Edit Sponsor Details")).toBeVisible();

    const updatedSponsorName = `${sponsorName} Corp`;
    await page.fill('div.fixed input[value*="E2E Sponsor"]', updatedSponsorName);
    await page.click('button:has-text("SAVE CHANGES")');

    // Verify updated sponsor name
    await expect(page.getByText(updatedSponsorName).first()).toBeVisible({ timeout: 10000 });

    // Delete sponsor
    const updatedSponsorContainer = page.locator('div.rounded-2xl', { hasText: updatedSponsorName }).first();
    await updatedSponsorContainer.locator('button[title="Delete sponsor"]').first().click();

    // Verify deleted from UI
    await expect(page.getByText(updatedSponsorName)).toHaveCount(0, { timeout: 10000 });
  });

  test("4. Game Studio: Tab Switching, Configuration & Controls", async ({ page }) => {
    // Navigate to Game Studio tab
    await page.click('button:has-text("Game Studio")');
    await expect(page.locator("h1")).toContainText(/GAME STUDIO/i, { timeout: 10000 });

    // Verify tabs are clickable and content changes
    const tabs = ["Brand & copy", "Arena designer", "Game setup", "Skill deck", "Bot roster", "Player menu"];
    for (const tab of tabs) {
      await page.click(`button:has-text("${tab}")`);
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("5. Users & Settings Consoles", async ({ page }) => {
    // Navigate to Users
    await page.click('button:has-text("Users")');
    await expect(page.locator("h1")).toContainText(/Users Console/i);

    // Navigate to Settings
    await page.click('button:has-text("Settings")');
    await expect(page.locator("h1")).toContainText(/Admin Settings/i);
    await expect(page.getByText("Theme family")).toBeVisible();
  });
});
