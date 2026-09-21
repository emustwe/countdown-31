"use client";

import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TransparentVideo } from "./TransparentVideo";
import { soundManager } from "../../lib/soundManager";
import { COW_COUNT_SPAN } from "../../lib/hooks/useCountdownLive";
import { useSecondsLeft } from "../../stores/clock-store";

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
  /** When the current turn expires. The seconds remaining and the count lap are derived HERE from
   * the shared clock rather than passed in, so a tick re-renders only this cow — not the arena. */
  turnEndsAt?: number | null;
  /** Total length of a turn, used to work out which pass of the 7-count we are on. REQUIRED: a
   * silently-defaulted 0 would pin `countLap` to 0 and stop the lap replay with no error. */
  turnSeconds: number;
  onTimeout?: () => void;
  /** ANCHORED mode: render as an absolute element that fills its POSITIONED parent (instead of the
   *  default viewport-fixed placement). The arc board uses this to pin the cow to the number board's
   *  corner, so it lands in the SAME spot on desktop and mobile (it scales with the board stage). */
  anchored?: boolean;
}

/**
 * The turn countdown cow — ONLY on the LOCAL player's turn. It plays the counting clip (cowntdown.mp4,
 * which shows the number on the cow's own hand, WITH sound). It stays the SAME SIZE and FULLY VISIBLE
 * for the whole countdown — it never glides across the screen and never fades out early; it simply
 * counts every number down to the last and clears when the turn ends. In `anchored` mode its parent
 * positions it (classic arc board → number-board corner); otherwise it sits upper-centre of the view.
 *
 * MEMOISED (see the export below): all props are primitives, and the per-second countdown is read
 * from the clock store inside the component — so the arena re-rendering cannot force this
 * WebGL-backed cow to re-render.
 */
function CowntdownTimerCowImpl({
  active,
  isMyTurn,
  turnKey,
  turnEndsAt = null,
  turnSeconds,
  anchored = false,
}: CowntdownTimerCowProps) {
  const lastTickRef = useRef<number | null>(null);
  // Subscribe only while this cow is actually counting; the selector already reduces to whole
  // seconds, so a re-render happens on the digit change and nowhere else.
  const secWhole = useSecondsLeft(active ? turnEndsAt : null);
  // Which pass of the cow's 7-count we are on. A turn longer than the clip (practice runs 13s)
  // bumps this at the boundary, replaying the count in place via TransparentVideo's `restartKey`.
  const countLap = Math.max(0, Math.floor((turnSeconds - secWhole) / COW_COUNT_SPAN));
  // Shown on EVERY turn (not just the local player's) so everyone sees how long the CURRENT player has
  // to pick. Audio + the urgency beat stay on the local player's own turn to avoid constant beeping.
  const show = active && secWhole > 0;

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
      // MP4, not the byte-identical .mov twin: QuickTime does not decode on Android Chrome (the cow
      // simply never appeared there), and Cloudflare will not cache video/quicktime, so every page
      // load re-pulled 7.5MB from the origin. The WebGL matte derives alpha from luminance rather
      // than an alpha channel, so the two files render identically.
      src="/assets/cowntdown.mp4"
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

/** Shallow-compare is exact here — every prop is a primitive. */
export const CowntdownTimerCow = React.memo(CowntdownTimerCowImpl);
CowntdownTimerCow.displayName = "CowntdownTimerCow";
