"use client";

import { useEffect, useRef, useState } from "react";

/** Each beat's time on screen, ms. */
const BEAT_MS = 1500;

/**
 * The two beats between an elimination and the next round.
 *
 *   1. "Starting again"   — spirals in and settles
 *   2. "Get ready, <name>" — same motion, naming whoever is up first
 *
 * DELIBERATELY SILENT. The elimination that precedes it already has its own sound, and a second
 * sting a beat later turns a moment of relief into noise.
 *
 * It owns the pause: the arena stays frozen until `onDone` fires, so the board cannot start moving
 * underneath the text.
 */
export function RoundRestartSequence({ nextName, onDone }: { nextName: string; onDone: () => void }) {
  const [beat, setBeat] = useState<0 | 1>(0);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion still gets the information, just briefly and without the spiral.
    const span = reduce ? 700 : BEAT_MS;
    const t1 = setTimeout(() => setBeat(1), span);
    const t2 = setTimeout(() => doneRef.current(), span * 2);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="rrs" aria-live="polite">
      {beat === 0 ? (
        <p className="rrs-line" key="again">
          Starting again
        </p>
      ) : (
        <p className="rrs-line" key="ready">
          Get ready
          <b>{nextName}</b>
        </p>
      )}
    </div>
  );
}
