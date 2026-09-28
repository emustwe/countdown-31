"use client";

import { useCallback, useEffect, useState } from "react";

const SEEN_KEY = "vera31-scroll-hint-seen";
/** How many chevrons make the trail. Enough to read as a flowing stream, not a single icon. */
const ARROWS = 12;
/** Past this much scroll the bars have collapsed, so the hint has done its job. */
const COLLAPSED_AT = 40;
/** Below this there is nowhere to scroll and the hint would be a lie. */
const MIN_RANGE = 40;

/**
 * Coach mark for the soft-fullscreen swipe.
 *
 * Safari only collapses its bars while the page is scrolling, so the scroll gap is useless unless the
 * player discovers the gesture. This points it out: a stream of chevrons running upward at the
 * top-right, the way the finger should go.
 *
 * It is STATE-DRIVEN, not once-ever. It shows whenever the bars are actually up (there is scroll room
 * and the page is at the top) and hides the moment they collapse — so it comes back by itself if the
 * player scrolls down again, reloads, or lands on a new page. A once-ever hint was invisible in
 * practice: it burned itself on the first visit and was never seen again.
 *
 * The FIRST showing dims the screen so it cannot be missed. Every showing after that is a compact
 * arrow with no dimming and no blocking — the same information, without nagging someone who already
 * knows the gesture.
 *
 * Only where the gesture exists: a touch device, in landscape, inside a browser tab. An installed PWA
 * has no bars to hide, portrait has no gap, and desktop has neither.
 */
export function ScrollHintOverlay() {
  const [show, setShow] = useState(false);
  const [compact, setCompact] = useState(true);

  const eligible = useCallback(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const landscape = window.matchMedia("(orientation: landscape)").matches;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!coarse || !landscape || standalone) return false;
    const d = document.documentElement;
    return d.scrollHeight - d.clientHeight >= MIN_RANGE;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      setCompact(!!localStorage.getItem(SEEN_KEY));
    } catch {
      /* private mode — treat as first time */
    }

    const sync = () => {
      // Bars are up when we are parked at the top with room below. Once the player has scrolled past
      // the gap the bars are gone and there is nothing left to say.
      setShow(eligible() && window.scrollY <= COLLAPSED_AT);
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    // The arena mounts after a beat and changes the scroll range; re-check once it settles.
    const t = setTimeout(sync, 1200);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      clearTimeout(t);
    };
  }, [eligible]);

  // The dimmed version is a one-time introduction. Mark it seen as soon as it has been on screen long
  // enough to read, so the next appearance is the quiet one.
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

  if (!show) return null;

  return (
    <div className={`scrollhint${compact ? " is-compact" : ""}`} aria-hidden="true">
      <div className="scrollhint-arrows">
        {Array.from({ length: compact ? 6 : ARROWS }).map((_, i, a) => (
          <span
            key={i}
            className="scrollhint-chevron"
            /* Staggered from the BOTTOM of the stack upward, so the stream reads as travelling the
               way the finger should move. */
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
  );
}
