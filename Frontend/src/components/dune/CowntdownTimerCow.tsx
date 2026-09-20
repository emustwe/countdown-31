"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TransparentVideo } from "./TransparentVideo";
import { soundManager } from "../../lib/soundManager";

// The clip counts 7 → 1 across its full 8.011s, i.e. ~1.14s per number. Speeding it up by that same
// ratio makes each number hold for EXACTLY one second, so the cow's count tracks the turn clock:
// one pass = 7 seconds. Practice runs two passes (7→1, then 7→2) for a 13-second turn.
const COW_CLIP_SECONDS = 8.011;
const COW_CLIP_NUMBERS = 7;
const COW_CLIP_RATE = COW_CLIP_SECONDS / COW_CLIP_NUMBERS;

interface CowntdownTimerCowProps {
  active: boolean;
  isMyTurn?: boolean;
  turnKey?: string | number | null;
  /** Seconds remaining on the current turn (used only for the per-second beat, not the size). */
  secondsLeft?: number;
  turnSeconds?: number;
  /** Which pass of the cow's 7-count this is. A turn longer than the clip (practice runs 13s) bumps
   * this at the boundary, replaying the count in place — see TransparentVideo's `restartKey`. */
  countLap?: number;
  onTimeout?: () => void;
  /** ANCHORED mode: render as an absolute element that fills its POSITIONED parent (instead of the
   *  default viewport-fixed placement). The arc board uses this to pin the cow to the number board's
   *  corner, so it lands in the SAME spot on desktop and mobile (it scales with the board stage). */
  anchored?: boolean;
}

/**
 * The turn countdown cow — ONLY on the LOCAL player's turn. It plays the counting clip (cowntdown.mov,
 * which shows the number on the cow's own hand, WITH sound). It stays the SAME SIZE and FULLY VISIBLE
 * for the whole countdown — it never glides across the screen and never fades out early; it simply
 * counts every number down to the last and clears when the turn ends. In `anchored` mode its parent
 * positions it (classic arc board → number-board corner); otherwise it sits upper-centre of the view.
 */
export function CowntdownTimerCow({
  active,
  isMyTurn,
  turnKey,
  secondsLeft,
  countLap = 0,
  anchored = false,
}: CowntdownTimerCowProps) {
  const lastTickRef = useRef<number | null>(null);
  const secs = typeof secondsLeft === "number" ? secondsLeft : 0;
  // Shown on EVERY turn (not just the local player's) so everyone sees how long the CURRENT player has
  // to pick. Audio + the urgency beat stay on the local player's own turn to avoid constant beeping.
  const show = active && secs > 0;
  const secWhole = Math.max(0, Math.ceil(secs));

  // A subtle urgency beat in the final seconds — only on the LOCAL player's own turn.
  React.useEffect(() => {
    if (!show || !isMyTurn) {
      lastTickRef.current = null;
      return;
    }
    if (lastTickRef.current !== secWhole && secWhole >= 1 && secWhole <= 3) {
      lastTickRef.current = secWhole;
      soundManager.playDanger();
    }
  }, [show, isMyTurn, secWhole]);

  const video = (
    <TransparentVideo
      src="/assets/cowntdown.mov"
      audioEnabled
      playbackRate={COW_CLIP_RATE}
      restartKey={`${turnKey ?? "t"}-${countLap}`}
      loop={false}
      width={340}
      height={340}
      className="w-full h-full object-contain"
    />
  );

  return (
    <AnimatePresence>
      {show &&
        (anchored ? (
          <motion.div
            key={`turncow-${turnKey ?? "t"}`}
            // Fill the positioned parent (the arc board pins that parent to the board corner).
            className="absolute inset-0 pointer-events-none select-none flex items-center justify-center drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            aria-hidden="true"
          >
            {video}
          </motion.div>
        ) : (
          <motion.div
            key={`turncow-${turnKey ?? "t"}`}
            // Fixed upper-centre, ABOVE the centred elimination cow (z-90) — stays put, full opacity.
            className="fixed z-[100] pointer-events-none select-none flex items-center justify-center drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
            style={{ top: "clamp(48px, 9vh, 116px)", left: "50%", width: "clamp(150px, 22vw, 226px)", height: "clamp(150px, 24vh, 226px)", transform: "translateX(-50%)" }}
            initial={{ opacity: 0, scale: 0.8, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.85, x: "-50%" }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            aria-hidden="true"
          >
            {video}
          </motion.div>
        ))}
    </AnimatePresence>
  );
}
