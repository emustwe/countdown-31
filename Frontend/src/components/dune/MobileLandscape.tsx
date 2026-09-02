"use client";

import { useEffect } from "react";

/**
 * Auto-landscape for phones. On devices that support it (Android Chrome) it locks the screen
 * orientation to landscape so the OS rotates the game. Where the browser can't rotate on its own
 * (iOS Safari has no orientation-lock API), CSS forces the arena into landscape by rotating the
 * `.mobile-landscape-game` stage 90° (see dune.css `@media (orientation: portrait)`). Either way the
 * player is dropped straight into landscape — there is NO "please rotate your device" prompt.
 * Renders nothing.
 */
export function MobileLandscape() {
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
