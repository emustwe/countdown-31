"use client";

import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";

const DISMISS_KEY = "vera31-rotate-hint-dismissed";

/**
 * "Turn your phone" prompt for the landing page.
 *
 * The landing page is designed for landscape and already renders correctly there; the only thing
 * missing was telling a first-time visitor to rotate. This sits at the foot of the page in portrait
 * and disappears by itself the moment the phone is turned — no layout of the landscape view is
 * touched, which is the point.
 *
 * Deliberately NOT a blocking overlay: portrait is still perfectly usable, and someone with
 * rotation locked must not be walled out of the site. It is dismissible, and staying dismissed is
 * remembered.
 */
export function RotateHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return; // phones/tablets only
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      /* private mode — show it */
    }

    const mq = window.matchMedia("(orientation: portrait)");
    const sync = () => setShow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!show) return null;

  return (
    <div className="rotate-hint" role="status">
      <span className="rotate-hint-icon">
        <RotateCcw size={20} />
      </span>
      <span className="rotate-hint-copy">
        <b>Turn your phone sideways</b>
        <small>The pasture looks its best in landscape</small>
      </span>
      <button
        type="button"
        className="rotate-hint-close"
        aria-label="Dismiss"
        onClick={() => {
          setShow(false);
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            /* ignored */
          }
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
