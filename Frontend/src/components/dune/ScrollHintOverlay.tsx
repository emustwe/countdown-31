"use client";

import { useEffect, useState } from "react";
import { requestFullscreen } from "../../lib/fullscreen";
import { ONE_WAY_COLLAPSE } from "../../lib/mobile-flags";

/** How many chevrons make the trail. Enough to read as a flowing stream, not a single icon. */
const ARROWS = 8;

/**
 * The swipe-up affordance — and, on Android, a button.
 *
 * ALWAYS VISIBLE wherever the gesture exists: a touch device, in landscape, inside a browser tab.
 * Earlier versions tried to be clever about when the browser chrome was up and hid themselves the
 * rest of the time. Two problems: the detection was wrong often enough to be useless, and Android
 * drops fullscreen every time the tab loses focus — so the one moment a player most needs this is
 * exactly when they have come back from another app, which no amount of cleverness predicted. It is
 * cheap, it is small, it sits in a corner; leaving it up is simply better than guessing.
 *
 * TAPPING IT re-enters true fullscreen on Android — the tap is the user gesture Chrome requires, and
 * returning to a tab is not one, so nothing can restore fullscreen automatically. On iOS the call is
 * a no-op (no Fullscreen API for page content) and the swipe remains the mechanism there.
 */
export function ScrollHintOverlay() {
  const [show, setShow] = useState(false);
  const [canFs, setCanFs] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
      const fs =
        typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
      const already = !!(document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement);
      setCanFs(fs);
      // Android: a fullscreen button, hidden once fullscreen is on.
      // iOS: a passive arrow pointing at the swipe, which is the only way to clear Safari's bars.
      // With the flag on, it hides once the bars are actually gone and returns on a reload or a
      // return from another app. With it off, it behaves exactly as it does today: always on screen.
      const collapsed = ONE_WAY_COLLAPSE ? (fs ? already : window.scrollY >= 88) : fs && already;
      setShow(coarse && landscape && !standalone && !collapsed);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("orientationchange", sync);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    // Client-side navigation changes the page — and the scroll room with it — without firing any of
    // the events above, so a cheap poll is what actually keeps this correct across routes.
    const poll = setInterval(sync, 800);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("orientationchange", sync);
      document.removeEventListener("visibilitychange", sync);
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
      clearInterval(poll);
    };
  }, []);

  if (!show) return null;

  return (
    /* On iOS this is a HINT, not a control: it is rendered inert (pointer-events:none via
       .is-hint) so a tap cannot scroll the page. Tapping used to scroll, and that is exactly what
       dragged the scroll gap over the board — the control opened the very strip it existed to
       remove. The swipe still works; the arrow only points at it. */
    <button
      type="button"
      className={`scrollhint${canFs ? "" : " is-hint"}`}
      aria-hidden={!canFs}
      tabIndex={canFs ? 0 : -1}
      aria-label={canFs ? "Enter fullscreen" : undefined}
      onClick={canFs ? () => requestFullscreen(document.documentElement) : undefined}
    >
      {/* Android: a round "Tap here" button with the chevrons BELOW it, pointing up at the thing to
          press. iOS: the same chevrons, pointing at the swipe, with no button and no label. */}
      {canFs && <span className="scrollhint-btn">Tap here</span>}
      <span className="scrollhint-arrows" aria-hidden="true">
        {Array.from({ length: ARROWS }).map((_, i) => (
          <span key={i} className="scrollhint-chevron" style={{ animationDelay: `${(ARROWS - 1 - i) * 0.09}s` }}>
            <svg viewBox="0 0 24 14" width="26" height="15" fill="none">
              <path d="M2 12 L12 3 L22 12" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ))}
      </span>
    </button>
  );
}
