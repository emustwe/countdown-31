import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const VIEWPORTS = [
  { name: "Mobile iPhone SE", width: 375, height: 667, isMobileShell: true },
  { name: "Mobile iPhone 14 Pro", width: 393, height: 852, isMobileShell: true },
  { name: "Mobile Large", width: 430, height: 932, isMobileShell: true },
  { name: "Tablet iPad Mini", width: 768, height: 1024, isMobileShell: true },
  { name: "Tablet iPad Air", width: 820, height: 1180, isMobileShell: true },
  { name: "Tablet Landscape", width: 1024, height: 768, isMobileShell: true },
  { name: "Desktop 1440", width: 1440, height: 900, isMobileShell: false },
];

const PAGES_TO_TEST = [
  { path: "/", title: "Landing Page" },
  { path: "/home", title: "Game Arena" },
  { path: "/events", title: "Tournaments" },
  { path: "/shop", title: "Shop" },
  { path: "/avatar", title: "Avatar Studio" },
  { path: "/wallet", title: "Wallet" },
  { path: "/profile", title: "Profile" },
  { path: "/settings", title: "Settings" },
  { path: "/sponsorship", title: "Sponsorship" },
  { path: "/login", title: "Login" },
  { path: "/register", title: "Register" },
  { path: "/admin", title: "Admin Overview" },
  { path: "/admin/tournament", title: "Admin Tournaments" },
  { path: "/admin/sponsor", title: "Admin Sponsors" },
  { path: "/admin/game", title: "Admin Game Studio" },
];

test.describe("Full Mobile Shell & Responsive E2E Suite", () => {
  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      for (const p of PAGES_TO_TEST) {
        test(`Renders ${p.title} (${p.path}) properly`, async ({ page }) => {
          await page.setViewportSize({ width: vp.width, height: vp.height });
          
          if (p.path.startsWith("/admin")) {
            // Auto login for admin pages
            await page.goto("/admin");
            const adminEmailInput = page.locator('input[type="email"]');
            if (await adminEmailInput.isVisible()) {
              await adminEmailInput.fill("admin@auroraways.demo");
              await page.locator('input[type="password"]').fill("Admin123!");
              await page.locator('button:has-text("SIGN IN TO ADMIN CONSOLE")').click();
              await page.waitForTimeout(500);
            }
          }

          await page.goto(p.path, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(300);

          // 1. Verify 0 horizontal scroll overflow (scrollWidth <= clientWidth)
          const overflow = await page.evaluate(() => {
            return {
              scrollWidth: document.documentElement.scrollWidth,
              clientWidth: document.documentElement.clientWidth,
              hasHorizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            };
          });

          expect(overflow.hasHorizontalOverflow, `Horizontal overflow detected on ${p.path} at ${vp.name}: scrollWidth=${overflow.scrollWidth}, clientWidth=${overflow.clientWidth}`).toBeFalsy();

          // 2. On mobile/tablet, verify MobileBottomNav is mounted on consumer pages (not admin/login/register/landing)
          if (vp.isMobileShell && !["/", "/login", "/register", "/admin"].some(route => p.path === route || p.path.startsWith(`${route}/`))) {
            const bottomNav = page.locator(".mobile-bottom-nav");
            await expect(bottomNav).toBeVisible();
          }
        });
      }
    });
  }
});
