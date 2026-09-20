"use client";

import { useEffect } from "react";

/**
 * Auto-landscape for phones. On devices that support it (Android Chrome) it locks the screen
 * orientation to landscape so the OS rotates the game and the player is dropped straight in. Where the
 * browser can't lock (iOS Safari has no orientation-lock API), we do NOT fake it with a CSS rotation —
 * the arena's measured arc-board layout is only valid in a real, un-rotated landscape viewport, and
 * rotating the container 90° breaks that math. Instead, in portrait a full-screen "rotate your phone"
 * prompt (`.rotate-to-play` in CountDown31 / dune.css) covers the arena until the device is turned to
 * true landscape, where it renders exactly as on desktop / manual landscape. Renders nothing.
 */
export function MobileLandscape() {
  // TRUE visible height. iOS Safari in landscape overlays a top tab bar / bottom toolbar that
  // `100dvh` doesn't reliably subtract, so the bottom of the arena gets clipped (~5%). visualViewport
  // reports the actually-visible area (chrome excluded), so we mirror it into `--app-vh` and size the
  // arena from that instead of dvh. Falls back to innerHeight where visualViewport is unavailable.
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
    return () => {
      vv?.removeEventListener("resize", setVH);
      vv?.removeEventListener("scroll", setVH);
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Best-effort native lock (Android). Harmless where unsupported — the CSS rotation covers those.
    const tryLockOrientation = () => {
      try {
        const isTouch = window.matchMedia("(pointer: coarse)").matches;
        const screenOrientation = (
          window.screen as Screen & {
            orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void };
          }
        )?.orientation;
        if (isTouch && typeof screenOrientation?.lock === "function") {
          screenOrientation.lock("landscape").catch(() => {
            // Unsupported / needs a user gesture — the CSS forced-landscape handles it.
          });
        }
      } catch {
        // Graceful fallback → CSS rotation.
      }
    };

    tryLockOrientation();
    window.addEventListener("orientationchange", tryLockOrientation, { passive: true });

    return () => {
      window.removeEventListener("orientationchange", tryLockOrientation);
      try {
        const screenOrientation = (
          window.screen as Screen & { orientation?: { unlock?: () => void } }
        )?.orientation;
        if (typeof screenOrientation?.unlock === "function") screenOrientation.unlock();
      } catch {
        // ignore
      }
    };
  }, []);

  return null;
}
