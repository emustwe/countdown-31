"use client";

import { useEffect } from "react";

/** Extra scroll height that lets Safari collapse its bars. ~101px measured + slack. */
const GAP_PX = 112;

/** True where the browser can actually go fullscreen — Android Chrome yes, iOS Safari never. */
function canFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
  return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
}

/**
 * Gives a full-bleed page the scroll room Safari needs to collapse its bars — on iOS ONLY.
 *
 * The gap is the only way to reclaim the browser chrome on iPhone: Apple exposes no Fullscreen API
 * for page content. It is also what produced the strip that used to cover the game, so it is now
 * confined to the one platform that has no alternative, and nothing scrolls the page on its behalf —
 * the fullscreen control no longer scrolls, which is what used to drag that strip into view.
 *
 * ANDROID GETS NO GAP AT ALL. It has real fullscreen, so there is nothing to scroll and nothing that
 * can slide over the board.
 *
 * Applied as an INLINE STYLE rather than via a selector: `html:has(...)` and `html[data-fullbleed]`
 * were both tried and both silently stopped matching after a client-side route change, leaving the
 * lobby with no gap while a direct load had one. An inline style has no selector to re-evaluate.
 */
export function FullBleedPage() {
  useEffect(() => {
    const el = document.documentElement;
    const body = document.body;

    const applies = () =>
      !canFullscreen() && // Android is excluded here, by design
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
      if (!applies()) return clear();
      el.style.setProperty("min-height", `calc(100% + ${GAP_PX}px)`);
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
