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
      const h = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${Math.round(h)}px`);
    };
    setVH();
    const vv = window.visualViewport;
    vv?.addEventListener("resize", setVH);
    vv?.addEventListener("scroll", setVH);
    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);
    // The bars can settle a frame or two after the events above fire, and on a route change there
    // may be no event at all — the same reason the swipe arrow keeps a cheap poll of its own.
    const poll = setInterval(setVH, 800);
    return () => {
      vv?.removeEventListener("resize", setVH);
      vv?.removeEventListener("scroll", setVH);
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
      clearInterval(poll);
    };
  }, []);

  return null;
}
