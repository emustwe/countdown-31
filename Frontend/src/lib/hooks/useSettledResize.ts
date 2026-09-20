import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/**
 * Runs `onSettled` once the viewport has STOPPED changing after a resize / orientation burst.
 *
 * Why this exists: mobile AUTO-ROTATION (portrait→landscape without a rotation lock) does not resize
 * the viewport in one clean step — the browser fires a rapid burst of `resize` + `orientationchange`
 * events, and during that burst `innerWidth`/`innerHeight` report transient, often-wrong values while
 * the rotation animates and the address bar shows/hides. Any layout that MEASURES the DOM on each of
 * those events (to place overlays, scale a fixed-design stage, etc.) ends up chasing a moving target
 * and visibly blinks / collides / jumps. Manual rotate (unlock → rotate) avoids it only because the
 * size happens to settle in a single jump.
 *
 * This waits for `innerWidth`/`innerHeight` to hold steady across a few animation frames before
 * invoking the measurement, so it runs exactly once against the FINAL, stable size. It also fires
 * once on mount (plus a couple of early settling passes) so first paint is correct, and keeps a
 * time-based safety net in case the rAF settle never quite quiesces (e.g. a slowly-collapsing
 * address bar).
 *
 * @param onSettled  the measurement/alignment routine to run once things are stable
 * @param observe    optional element to also watch with a ResizeObserver (routed through the same
 *                   settle gate) — for size changes that aren't window resizes (content reflow).
 */
export function useSettledResize(onSettled: () => void, observe?: RefObject<HTMLElement | null>) {
  const cb = useRef(onSettled);
  cb.current = onSettled;

  useEffect(() => {
    let raf = 0;
    let safety: ReturnType<typeof setTimeout> | null = null;
    let lastW = -1;
    let lastH = -1;
    let stableFrames = 0;

    const tick = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (w !== lastW || h !== lastH) {
        // Still changing — keep waiting for the size to hold.
        lastW = w;
        lastH = h;
        stableFrames = 0;
        raf = requestAnimationFrame(tick);
        return;
      }
      // Size held for this frame; require a few steady frames before trusting it.
      if (++stableFrames < 3) {
        raf = requestAnimationFrame(tick);
        return;
      }
      cb.current();
    };

    const schedule = () => {
      if (raf) cancelAnimationFrame(raf);
      if (safety) clearTimeout(safety);
      lastW = -1;
      lastH = -1;
      stableFrames = 0;
      raf = requestAnimationFrame(tick);
      // Belt-and-suspenders: always run once after the burst, even if the frame loop is starved.
      safety = setTimeout(() => cb.current(), 450);
    };

    // Correct first paint immediately, then a few early passes as fonts/images settle.
    cb.current();
    const boot = [120, 420, 820].map((ms) => setTimeout(() => cb.current(), ms));

    let ro: ResizeObserver | null = null;
    const el = observe?.current;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(schedule);
      ro.observe(el);
    }

    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    window.visualViewport?.addEventListener("resize", schedule);
    window.visualViewport?.addEventListener("scroll", schedule);

    return () => {
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
      window.visualViewport?.removeEventListener("resize", schedule);
      window.visualViewport?.removeEventListener("scroll", schedule);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      if (safety) clearTimeout(safety);
      boot.forEach(clearTimeout);
    };
    // observe ref is captured once on mount (stable element); onSettled is read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
