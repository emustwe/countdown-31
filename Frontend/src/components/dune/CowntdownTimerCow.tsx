"use client";

import React, { memo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { soundManager } from "../../lib/soundManager";
import { useSecondsLeft } from "../../stores/clock-store";

interface CowntdownTimerCowProps {
  active: boolean;
  isMyTurn?: boolean;
  turnKey?: string | number | null;
  /** When the current turn expires. The seconds remaining are derived HERE from the shared clock,
   * so a tick re-renders only this counter — not the arena. */
  turnEndsAt?: number | null;
  /** Total length of a turn (13 in practice, 7 in a tournament). Drives the sweep ring's progress;
   *  it is no longer printed beside the digit. */
  turnSeconds: number;
  /** ANCHORED mode: fill the POSITIONED parent instead of sitting viewport-fixed. The arc board
   *  uses this to pin the counter to the number board's header strip — centred on the board, sitting
   *  just above the number grid — so it lands in the same spot on every screen. */
  anchored?: boolean;
}

/** Below this many seconds the tick sharpens and the digit turns red. */
const URGENT_AT = 3;

/**
 * The turn countdown — a plain NUMBER counting the turn down (13 → 1 in practice, 7 → 1 in a
 * tournament) with a dry tick each second.
 *
 * This replaced a 1080x960 video of a cow holding up numbered cards. That clip was decoded every
 * frame and chroma-keyed through a WebGL fragment shader to fake transparency, all to paint a
 * ~70x125px area — one of the two heaviest things on the page, and the main reason the arena
 * stuttered on a phone. A styled `<span>` costs nothing and reads far more clearly at this size.
 */
function CowntdownTimerCowImpl({
  active,
  isMyTurn,
  turnKey,
  turnEndsAt = null,
  turnSeconds,
  anchored = false,
}: CowntdownTimerCowProps) {
  // Subscribe only while counting; the selector already reduces to whole seconds, so this
  // re-renders on the digit change and nowhere else.
  const secondsLeft = useSecondsLeft(active ? turnEndsAt : null);
  const show = active && secondsLeft > 0;
  const urgent = secondsLeft <= URGENT_AT;
  const lastTickRef = useRef<number | null>(null);

  // One tick per second while the clock is visible. Keyed on the whole second so a re-render for
  // any other reason cannot double-fire it.
  useEffect(() => {
    if (!show) {
      lastTickRef.current = null;
      return;
    }
    if (lastTickRef.current === secondsLeft) return;
    lastTickRef.current = secondsLeft;
    soundManager.playTick(secondsLeft <= URGENT_AT);
  }, [show, secondsLeft]);

  // Fraction of the turn still left, for the sweep ring behind the digit.
  const progress = turnSeconds > 0 ? Math.max(0, Math.min(1, secondsLeft / turnSeconds)) : 0;

  const counter = (
    <div
      className={`cd31-count ${urgent ? "is-urgent" : ""} ${isMyTurn ? "is-mine" : ""}`}
      style={{ "--cd31-progress": progress } as React.CSSProperties}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.b
          key={secondsLeft}
          initial={{ opacity: 0, scale: 0.55, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.5, y: 8 }}
          transition={{ duration: 0.16, ease: "easeOut" }}
        >
          {secondsLeft}
        </motion.b>
      </AnimatePresence>
    </div>
  );

  return (
    <AnimatePresence>
      {show &&
        (anchored ? (
          <motion.div
            key={`turncount-${turnKey ?? "t"}`}
            /* items-END: the box stops just above the number grid, so anchoring to its bottom keeps
               the dial in the board's header strip (overflowing upward into the sky) and never over
               a tile. justify-center keeps it on the board's horizontal centre line. */
            className="absolute inset-0 pointer-events-none select-none flex items-end justify-center"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            aria-hidden="true"
          >
            {counter}
          </motion.div>
        ) : (
          <motion.div
            key={`turncount-${turnKey ?? "t"}`}
            className="fixed z-[100] pointer-events-none select-none flex items-center justify-center"
            style={{ top: "clamp(48px, 9vh, 116px)", left: "50%", transform: "translateX(-50%)" }}
            initial={{ opacity: 0, scale: 0.85, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.9, x: "-50%" }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            aria-hidden="true"
          >
            {counter}
          </motion.div>
        ))}
    </AnimatePresence>
  );
}

/** Shallow-compare is exact here — every prop is a primitive. */
export const CowntdownTimerCow = memo(CowntdownTimerCowImpl);
CowntdownTimerCow.displayName = "CowntdownTimerCow";
