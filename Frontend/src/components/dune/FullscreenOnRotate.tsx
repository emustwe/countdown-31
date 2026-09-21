"use client";

import { useEffect } from "react";

/**
 * Give the arena the whole screen.
 *
 * Browsers only grant fullscreen from inside a user gesture — an `orientationchange` handler on its
 * own is rejected — so this arms on rotation and then fires on the player's very next tap. Once
 * granted it stays for the session, so in practice it costs one tap after the first rotate.
 *
 * ⚠️ iOS Safari does NOT implement the Fullscreen API for ordinary elements (only <video>), so on an
 * iPhone this is a no-op and the browser chrome stays. The only way to lose it there is to install
 * the app: Share → "Add to Home Screen", which honours the web manifest's `display: fullscreen`.
 * `apple-mobile-web-app-capable` in the layout is what makes that installed window chrome-less.
 */
export function FullscreenOnRotate() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Phones/tablets only — never steal the screen on a desktop where a window is the point.
    if (!window.matchMedia?.("(pointer: coarse)")?.matches) return;

    const el = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };
    const supported =
      typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
    if (!supported) return; // iOS Safari lands here

    let armed = false;

    const isLandscape = () => window.innerWidth >= window.innerHeight;
    const inFullscreen = () =>
      !!document.fullscreenElement ||
      !!(document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;

    const request = () => {
      if (!armed || inFullscreen() || !isLandscape()) return;
      armed = false;
      try {
        const p = el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.();
        // A rejected request must not surface as an unhandled rejection.
        if (p && typeof (p as Promise<void>).catch === "function") (p as Promise<void>).catch(() => {});
      } catch {
        /* refused — the page simply stays windowed */
      }
    };

    const arm = () => {
      if (isLandscape() && !inFullscreen()) armed = true;
    };

    // Arm on rotation, then take the next gesture.
    window.addEventListener("orientationchange", arm);
    window.addEventListener("resize", arm);
    document.addEventListener("pointerdown", request, { passive: true });
    document.addEventListener("keydown", request);
    arm(); // already landscape on load → the first tap goes fullscreen

    return () => {
      window.removeEventListener("orientationchange", arm);
      window.removeEventListener("resize", arm);
      document.removeEventListener("pointerdown", request);
      document.removeEventListener("keydown", request);
    };
  }, []);

  return null;
}
