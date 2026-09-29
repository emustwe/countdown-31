"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SEEN_KEY = "vera31-scroll-hint-seen";
/** How many chevrons make the trail. Enough to read as a flowing stream, not a single icon. */
const ARROWS = 12;
/**
 * How much shorter the visible viewport has to be than the bars-hidden viewport before we call the
 * bars "up". Comfortably above rounding noise, comfortably below Safari's ~101px of chrome.
 */
const BARS_UP_PX = 24;

/**
 * Coach mark for the soft-fullscreen swipe.
 *
 * Safari only collapses its bars while the page is scrolling, so the scroll gap is useless unless the
 * player discovers the gesture. This points it out: a stream of chevrons running upward at the
 * top-right, the way the finger should go.
 *
 * ── HOW IT KNOWS THE BARS ARE UP ────────────────────────────────────────────
 * By MEASURING THE VIEWPORT, not by guessing from scroll position.
 *
 * `scrollY` is a bad proxy and was the bug: iOS routinely keeps the bars collapsed while letting the
 * page settle back to scrollY 0, so a scroll-based test sees "at the top", concludes the bars must be
 * showing, and puts the arrow back on screen when the bars are already gone. The result was an
 * indicator that appeared to be up permanently.
 *
 * Instead: a hidden probe sized to `100lvh` (falling back to `100vh`, which on iOS is already the
 * bars-hidden height and never shrinks) gives the viewport as it would be with no chrome.
 * `visualViewport.height` gives what is genuinely visible right now. The difference between them IS
 * the browser chrome, so the test is direct rather than inferred.
 *
 * Shown only where the gesture exists: a touch device, in landscape, inside a browser tab. An
 * installed PWA has no bars to hide, portrait has no gap, and desktop has neither.
 *
 * The FIRST showing dims the screen so it cannot be missed. Every showing after is a compact arrow —
 * no dimming, no blocking — because something that can reappear this often must never nag.
 */
export function ScrollHintOverlay() {
  const probeRef = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  const [compact, setCompact] = useState(true);

  /** True when browser chrome is currently eating part of the screen. */
  const barsAreUp = useCallback(() => {
    if (typeof window === "undefined") return false;

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const landscape = window.matchMedia("(orientation: landscape)").matches;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!coarse || !landscape || standalone) return false;

    const probe = probeRef.current;
    if (!probe) return false;
    const barsHidden = probe.getBoundingClientRect().height; // 100lvh / 100vh
    const visible = window.visualViewport?.height ?? window.innerHeight;
    if (!barsHidden || !visible) return false;

    // Don't promise a gesture that does nothing: there must genuinely be somewhere to scroll.
    const d = document.documentElement;
    if (d.scrollHeight - d.clientHeight < BARS_UP_PX) return false;

    return barsHidden - visible >= BARS_UP_PX;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      setCompact(!!localStorage.getItem(SEEN_KEY));
    } catch {
      /* private mode — treat as first time */
    }

    const sync = () => setShow(barsAreUp());
    sync();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    // The arena mounts after a beat and changes the scroll range; re-check once it settles.
    const t = setTimeout(sync, 1200);

    return () => {
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      clearTimeout(t);
    };
  }, [barsAreUp]);

  // The dimmed version is a one-time introduction. Mark it seen once it has been on screen long
  // enough to read, so every later appearance is the quiet one.
  useEffect(() => {
    if (!show || compact) return;
    const t = setTimeout(() => {
      setCompact(true);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignored */
      }
    }, 6000);
    return () => clearTimeout(t);
  }, [show, compact]);

  return (
    <>
      {/* Always mounted: it is the measuring stick, not decoration. */}
      <div ref={probeRef} className="scrollhint-probe" aria-hidden="true" />
      {show && (
        <div className={`scrollhint${compact ? " is-compact" : ""}`} aria-hidden="true">
          <div className="scrollhint-arrows">
            {Array.from({ length: compact ? 6 : ARROWS }).map((_, i, a) => (
              <span
                key={i}
                className="scrollhint-chevron"
                /* Staggered from the BOTTOM of the stack upward, so the stream reads as travelling
                   the way the finger should move. */
                style={{ animationDelay: `${(a.length - 1 - i) * 0.09}s` }}
              >
                <svg viewBox="0 0 24 14" width={compact ? 24 : 34} height={compact ? 14 : 20} fill="none">
                  <path
                    d="M2 12 L12 3 L22 12"
                    stroke="currentColor"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ))}
          </div>
          <p className="scrollhint-label">
            Swipe up
            {!compact && <small>to hide the browser bars</small>}
          </p>
        </div>
      )}
    </>
  );
}
