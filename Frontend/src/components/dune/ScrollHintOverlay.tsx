"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "vera31-scroll-hint-seen";
/** How many chevrons make the trail. Enough to read as a flowing stream, not a single icon. */
const ARROWS = 12;

/**
 * First-visit coach mark for the soft-fullscreen swipe.
 *
 * Safari only collapses its bars while the page is scrolling, so the 112px gap we added is useless
 * unless the player discovers the gesture. This shows it once: the screen dims and a stream of
 * chevrons runs upward at the top-right, pointing the way the finger should go.
 *
 * Shown ONCE ever (localStorage), and only where the gesture exists: a touch device, in landscape,
 * inside a browser tab. An installed PWA has no bars to hide, portrait has no scroll gap, and a
 * desktop window has neither — in all of those it renders nothing.
 *
 * Dismisses on the first scroll (they did it), on any tap, or after 9s so it can never trap anyone.
 */
export function ScrollHintOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Only where the swipe actually does something.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const landscape = window.matchMedia("(orientation: landscape)").matches;
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!coarse || !landscape || standalone) return;

    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      /* private mode — just show it this once */
    }

    // Only if there is genuinely somewhere to scroll; otherwise the hint would be a lie.
    const d = document.documentElement;
    if (d.scrollHeight - d.clientHeight < 40) return;

    setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const done = () => {
      setShow(false);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* ignored */
      }
    };
    // Any of these means the player has seen it.
    window.addEventListener("scroll", done, { passive: true, once: true });
    window.addEventListener("pointerdown", done, { passive: true, once: true });
    const t = setTimeout(done, 9000);
    return () => {
      window.removeEventListener("scroll", done);
      window.removeEventListener("pointerdown", done);
      clearTimeout(t);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="scrollhint" aria-hidden="true">
      <div className="scrollhint-arrows">
        {Array.from({ length: ARROWS }).map((_, i) => (
          <span
            key={i}
            className="scrollhint-chevron"
            /* Staggered from the BOTTOM of the stack upward, so the stream reads as travelling the
               way the finger should move. */
            style={{ animationDelay: `${(ARROWS - 1 - i) * 0.09}s` }}
          >
            <svg viewBox="0 0 24 14" width="34" height="20" fill="none">
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
        <small>to hide the browser bars</small>
      </p>
    </div>
  );
}
