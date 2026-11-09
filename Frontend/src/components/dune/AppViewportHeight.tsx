"use client";

import { useEffect } from "react";

/**
 * Keeps `--app-vh` — the TRUE visible height — correct on every page, all the time.
 *
 * `--app-vh` is what the arena and the lobby are sized from, because `100dvh` does not reliably
 * subtract iOS's landscape chrome and `visualViewport.height` does. Until now it was written only
 * by `MobileLandscape`, which mounts WITH THE ARENA — so on every other screen the variable held
 * whatever the last game left in it, and a stale value is a sized-wrong page:
 *
 *   play → swipe the bars away (--app-vh = 371) → leave the game → the bars come back
 *   → the lobby is still sized 371 into a 323px window, i.e. 48px of it below the fold.
 *
 * The same gap covers the entry takeover, which mounts no arena and so had nobody writing this
 * while the player waited.
 *
 * Deliberately ADDITIVE: `MobileLandscape` still writes the same value from the same source on the
 * pages that have it. Two writers of one measurement cannot disagree, and leaving its copy in place
 * means nothing about the arena's behaviour changes.
 */
export function AppViewportHeight() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const setVH = () => {
      const el = document.documentElement;
      const h = window.visualViewport?.height ?? window.innerHeight;
      el.style.setProperty("--app-vh", `${Math.round(h)}px`);

      /**
       * `--app-slide` — HOW FAR THE PAGE HAS BEEN PUSHED OFF THE TOP, and the general answer to the
       * board's bottom row being cut off.
       *
       * The full-bleed pages are a `position: fixed` layer over a document that is deliberately a
       * little taller than the viewport, because a scrollable document is the only way iOS can be
       * persuaded to retract its browser bars. Scroll into that extra space and the fixed layer goes
       * up with it, and whatever falls off the bottom of the screen is gone — the last number sliced
       * in half, a strip of bare background where the board should be.
       *
       * Every previous attempt at this tried to size the gap so precisely that no scroll could ever
       * be left over. That is a losing game: it needs the retractable chrome of every browser on
       * every handset, which is 101px on one phone, 19px on another, and unknown on the next one
       * released. One device measured right is one device, and the bug simply moves.
       *
       * `visualViewport.offsetTop` IS the displacement, by definition: the offset of what the user
       * can actually see from the layout box that `position: fixed` is placed against. No constant,
       * no per-handset figure — the browser is asked how far it has pushed the page, and told to put
       * it back.
       *
       * Deliberately NOT `scrollTop`, which was tried first and is wrong. A conforming engine does
       * not move a fixed layer when the document scrolls, so cancelling `scrollTop` INTRODUCES the
       * very displacement it was meant to remove — measured in an emulator at exactly the scroll
       * distance, 0px of cut becoming 34px. `offsetTop` is 0 on those engines, so this costs nothing
       * where there is nothing to fix, and corrects it exactly where there is.
       */
      const vv = window.visualViewport;
      const slide = Math.max(0, Math.round(vv?.offsetTop ?? 0));
      el.style.setProperty("--app-slide", `${slide}px`);
    };
    setVH();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", setVH);
    vv?.addEventListener("scroll", setVH);
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
    // iOS does not fire scroll events reliably DURING a swipe, only as it settles — which is the
    // moment that matters, because a settled displacement is the one the player is left looking at.
    window.addEventListener("scroll", setVH, { passive: true });
    // The bars can settle a frame or two after the events above fire, and on a route change there
    // may be no event at all — the same reason the swipe arrow keeps a cheap poll of its own.
    const poll = setInterval(setVH, 800);
    return () => {
      vv?.removeEventListener("resize", setVH);
      vv?.removeEventListener("scroll", setVH);
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
      window.removeEventListener("scroll", setVH);
      clearInterval(poll);
    };
  }, []);

  return null;
}
