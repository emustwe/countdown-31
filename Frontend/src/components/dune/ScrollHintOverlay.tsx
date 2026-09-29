"use client";

import { useEffect, useState } from "react";
import { requestFullscreen } from "../../lib/fullscreen";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      const coarse = window.matchMedia("(pointer: coarse)").matches;
      const landscape = window.matchMedia("(orientation: landscape)").matches;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      // Only where the swipe actually does something. The entry screen has nothing to scroll, so an
      // arrow saying "swipe up" there would simply be a lie.
      const d = document.documentElement;
      const scrollable = d.scrollHeight - d.clientHeight >= 40;
      setShow(coarse && landscape && !standalone && scrollable);
    };
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    // Client-side navigation changes the page — and the scroll room with it — without firing any of
    // the events above, so a cheap poll is what actually keeps this correct across routes.
    const poll = setInterval(sync, 800);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      clearInterval(poll);
    };
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      className="scrollhint"
      aria-label="Hide the browser bars"
      onClick={() => {
        // Two things, because one of them can fail silently. Chrome can refuse a fullscreen
        // re-request shortly after the user exited one, and there is no reliable way to detect that
        // from here — so the tap ALSO performs the scroll the arrow is pointing at, which collapses
        // the URL bar on Android and Safari's bars on iOS. Whatever the browser allows, the tap
        // does something.
        requestFullscreen(document.documentElement);
        window.scrollTo({ top: 140, behavior: "smooth" });
      }}
    >
      <span className="scrollhint-arrows" aria-hidden="true">
        {Array.from({ length: ARROWS }).map((_, i) => (
          <span key={i} className="scrollhint-chevron" style={{ animationDelay: `${(ARROWS - 1 - i) * 0.09}s` }}>
            <svg viewBox="0 0 24 14" width="26" height="15" fill="none">
              <path d="M2 12 L12 3 L22 12" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ))}
      </span>
      <span className="scrollhint-label">Swipe up</span>
    </button>
  );
}
