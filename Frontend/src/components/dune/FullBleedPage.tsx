"use client";

import { useEffect } from "react";

/** Extra scroll height that lets the browser collapse its bars. ~101px measured + slack. */
const GAP_PX = 112;

/**
 * Marks a page as full-bleed: it fills the display and wants the browser bars gone.
 *
 * It applies the scroll gap as an INLINE STYLE rather than via a class or attribute the CSS keys off.
 * Two earlier attempts failed the same way and it is worth recording why:
 *
 *   `html:has(.landing-playground)`  — worked on a direct load, silently stopped matching after a
 *                                      client-side route change.
 *   `html[data-fullbleed]`           — the attribute was demonstrably set (verified in the DOM) and
 *                                      the rule STILL did not apply after a route change, while a
 *                                      reload of the same URL applied it fine.
 *
 * Both are style-invalidation behaviour on the root element that this code cannot control. An inline
 * style has no selector to re-evaluate, so it cannot drift from the component's lifecycle.
 *
 * Only where collapsing is possible: a touch device, in landscape, in a browser tab. An installed
 * PWA has no bars, portrait has nothing to gain, desktop has neither.
 */
export function FullBleedPage() {
  useEffect(() => {
    const el = document.documentElement;
    const body = document.body;

    const applies = () =>
      window.matchMedia("(pointer: coarse)").matches &&
      window.matchMedia("(orientation: landscape)").matches &&
      !window.matchMedia("(display-mode: standalone)").matches &&
      (navigator as Navigator & { standalone?: boolean }).standalone !== true;

    const clear = () => {
      el.style.removeProperty("min-height");
      el.style.removeProperty("overflow-y");
      body.style.removeProperty("overflow-y");
    };

    const sync = () => {
      if (!applies()) {
        clear();
        return;
      }
      el.style.setProperty("min-height", `calc(100% + ${GAP_PX}px)`);
      // The arena sets overflow:hidden on html/body to stop the page moving mid-turn; the gap needs
      // vertical scroll back, and only the gap moves — the page itself is pinned.
      el.style.setProperty("overflow-y", "auto", "important");
      body.style.setProperty("overflow-y", "auto", "important");
    };

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      clear();
    };
  }, []);

  return null;
}
