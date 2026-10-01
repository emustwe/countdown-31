"use client";

import { useEffect } from "react";
import { ONE_WAY_COLLAPSE } from "../../lib/mobile-flags";
import { barsAreUp } from "../../lib/fullscreen";

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

    /**
     * ONE-WAY COLLAPSE (gated by ONE_WAY_COLLAPSE — see lib/mobile-flags.ts).
     *
     * Once the bars are gone, lock the page so they cannot be scrolled back. The gap is deliberately
     * LEFT in place and the scroll position untouched: removing the gap would force scrollY to 0, and
     * landing on 0 is one of the things that makes Safari restore the bars — the fix would trigger
     * exactly what it prevents. Blocking the gesture instead leaves the page sitting at the bottom of
     * the gap with nothing able to move it.
     *
     * Unlocked on a reload (fresh page) or on return from another app, which is when the bars come
     * back anyway and the swipe is needed a second time.
     *
     * NOT complete, and cannot be: tapping the top of the screen is an OS gesture no page can block.
     */
    /** The element the finger actually lands on — html/body are never touched directly. */
    const surface = () =>
      document.querySelector<HTMLElement>(".arena-viewport, .landing-playground");

    const lock = () => {
      if (!ONE_WAY_COLLAPSE) return;
      el.style.setProperty("touch-action", "none");
      body.style.setProperty("touch-action", "none");
      // THE ONE THAT MATTERS. The page is a fixed layer covering the viewport, so every touch lands
      // on IT, and its own touch-action governs the gesture — setting html/body alone did nothing,
      // which is why the bars could still be scrolled back.
      surface()?.style.setProperty("touch-action", "none");
    };
    const unlock = () => {
      el.style.removeProperty("touch-action");
      body.style.removeProperty("touch-action");
      surface()?.style.removeProperty("touch-action");
    };
    // Lock when the bars are actually GONE, measured from the viewport. Keying this off scrollY did
    // not work on a real device: the collapse happens mid-swipe and Safari settles the scroll back,
    // so the threshold never fired even though it passed in an emulator.
    const onScroll = () => {
      if (!barsAreUp()) lock();
    };
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      unlock();
      // Safari brings its bars back when you return to the tab, but the page is still sitting at the
      // bottom of the gap — so there is nothing left to scroll and the swipe is unavailable exactly
      // when it is needed again. Returning to 0 restores the gap, and the arrow with it.
      window.scrollTo(0, 0);
    };
    const onRotate = () => {
      unlock();
      sync();
    };

    sync();
    // If the bars are ALREADY down when this page mounts — i.e. the player collapsed them on the
    // previous page and navigated here — lock straight away so they stay down.
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.visualViewport?.addEventListener("resize", onScroll);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", onRotate);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", onScroll);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", onRotate);
      document.removeEventListener("visibilitychange", onReturn);
      // Deliberately NOT clearing the gap or the lock here. Both full-bleed pages want them, and
      // removing the gap on unmount shrank the document mid-navigation — which clamped scrollY to 0
      // and handed Safari its bars back the instant you tapped Play. The next page re-applies what
      // it needs on mount; a page that does not want them never mounts this at all.
    };
  }, []);

  return null;
}
