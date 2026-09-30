"use client";

import { useEffect } from "react";
import { inFullscreen, requestFullscreen } from "../../lib/fullscreen";

/**
 * Keeps Android in fullscreen across app switches.
 *
 * Chrome drops fullscreen whenever the tab loses focus, and returning to a tab is NOT a user gesture,
 * so nothing can restore it automatically — the browser will reject the request outright. What CAN be
 * done is to arm it: after the page becomes visible again without fullscreen, the very next touch
 * restores it.
 *
 * It arms ONLY after a return from background, and disarms as soon as it fires. An earlier version
 * was armed permanently and re-entered fullscreen on any tap at any time, which is why tapping the
 * profile icon used to zoom the screen unexpectedly. Here the player has just come back to the tab,
 * so the restore is the obvious thing to happen rather than a surprise.
 *
 * No-op on iOS, which has no Fullscreen API for page content.
 */
export function KeepFullscreen() {
  useEffect(() => {
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
    const supported =
      typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
    if (!supported) return;

    let armed = false;

    const onVisible = () => {
      if (document.visibilityState === "visible" && !inFullscreen()) armed = true;
    };
    const restore = () => {
      if (!armed || inFullscreen()) return;
      armed = false;
      requestFullscreen(document.documentElement);
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    document.addEventListener("pointerdown", restore, { passive: true });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("pointerdown", restore);
    };
  }, []);

  return null;
}
