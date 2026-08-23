import { test, expect } from "@playwright/test";

const viewports = [
  { name: "Mobile iPhone SE", width: 375, height: 667 },
  { name: "Mobile iPhone 14 Pro", width: 393, height: 852 },
  { name: "Tablet iPad", width: 768, height: 1024 },
  { name: "Desktop Large", width: 1440, height: 900 },
];

const routes = [
  { path: "/", title: "Landing Page" },
  { path: "/home", title: "Practice Arena" },
  { path: "/shop", title: "Shop" },
  { path: "/avatar", title: "Avatar Studio" },
  { path: "/events", title: "Tournaments" },
  { path: "/wallet", title: "Wallet" },
  { path: "/settings", title: "Settings" },
  { path: "/sponsorship", title: "Sponsorship" },
  { path: "/admin", title: "Admin Overview" },
  { path: "/admin/tournament", title: "Admin Tournaments" },
  { path: "/admin/sponsor", title: "Admin Sponsors" },
  { path: "/admin/game", title: "Admin Game Studio" },
];

test.describe("Full Platform Viewport Responsiveness Suite", () => {
  for (const vp of viewports) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      for (const route of routes) {
        test(`Renders ${route.title} (${route.path}) without horizontal scroll overflow`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(route.path);
          await page.waitForLoadState("domcontentloaded");

          // Check if admin login is presented on admin routes and sign in
          if (route.path.startsWith("/admin")) {
            const adminEmailInput = page.locator('input[type="email"]');
            if (await adminEmailInput.isVisible()) {
              await adminEmailInput.fill("admin@auroraways.demo");
              await page.locator('input[type="password"]').fill("Admin123!");
              await page.locator('button:has-text("SIGN IN TO ADMIN CONSOLE")').click();
              await page.waitForLoadState("networkidle");
            }
          }

          // Evaluate that the document does not have unintended horizontal scroll overflow
          const overflow = await page.evaluate(() => {
            const docWidth = document.documentElement.clientWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const bodyScrollWidth = document.body.scrollWidth;
            return {
              docWidth,
              scrollWidth,
              bodyScrollWidth,
              hasOverflow: scrollWidth > docWidth + 2 || bodyScrollWidth > docWidth + 2,
            };
          });

          expect(overflow.hasOverflow).toBeFalsy();
        });
      }
    });
  }
});
