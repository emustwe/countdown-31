"use client";

import { useEffect } from "react";

/**
 * Publish the VISUAL viewport to CSS as `--vv-h` (height) and `--vv-top` (offset from the layout
 * viewport's top).
 *
 * Why this exists: on iOS, `100dvh` accounts for the browser chrome but NOT the on-screen keyboard.
 * When the keyboard opens it covers the bottom of the page while `position: fixed; inset: 0`
 * elements keep their full height, so a centred dialog is pushed behind the keyboard and becomes
 * unreachable — which is exactly what happened to the guest name prompt. `window.visualViewport` is
 * the only API that reports the actually-visible region, so any dialog that hosts a text input must
 * size itself against it rather than against vh/dvh.
 *
 * Falls back to doing nothing where visualViewport is unsupported; the CSS carries dvh defaults.
 */
export function useVisualViewport(): void {
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const root = document.documentElement;
    let frame = 0;
    const apply = () => {
      cancelAnimationFrame(frame);
      // Coalesce the burst of resize/scroll events iOS fires while the keyboard animates.
      frame = requestAnimationFrame(() => {
        root.style.setProperty("--vv-h", `${Math.round(vv.height)}px`);
        root.style.setProperty("--vv-top", `${Math.round(vv.offsetTop)}px`);
      });
    };

    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      cancelAnimationFrame(frame);
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.style.removeProperty("--vv-h");
      root.style.removeProperty("--vv-top");
    };
  }, []);
}
