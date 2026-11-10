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
  /**
   * `--app-vh` IS NOT WRITTEN HERE ANY MORE. <AppViewportHeight> in the root layout writes it
   * globally from the same `visualViewport.height`, so this copy was a second set of listeners and
   * a second write of an identical value on every resize, scroll and poll. Two writers of one
   * measurement cannot disagree, but they both pay for it — and a custom property on <html> costs
   * a document-wide style invalidation every time.
   */

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
