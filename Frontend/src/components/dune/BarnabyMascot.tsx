"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { RotateCcw } from "lucide-react";
import { TransparentVideo } from "./TransparentVideo";
import { soundManager } from "../../lib/soundManager";

interface BarnabyMascotProps {
  status: "waiting" | "playing" | "over";
  winner: { name: string; color: string } | null;
  lastEliminated: { name: string; reason: string } | null;
  isMyWin: boolean;
  isLocalDefeat: boolean;
  /** Real tournaments hide the "play again" button — the finale only celebrates the winner. */
  showPlayAgain?: boolean;
  /** CONTROLLED dance (local engine): parent freezes the arena while true and resumes on `onDanceEnd`.
   *  When undefined the mascot falls back to its own UNCONTROLLED trigger (`isLocalDefeat`). */
  forceDancing?: boolean;
  /** SERVER-paced controlled dance (real tournaments): the SERVER owns the dance window, so the cow
   *  LOOPS for the whole time and does NOT self-resume — it stops only when `forceDancing` goes false. */
  serverPaced?: boolean;
  /** Fired when the controlled dance clip finishes (parent then unfreezes + resumes the game). */
  onDanceEnd?: () => void;
  onPlayAgain?: () => void;
}

// The centre one-shot is ended by the video's own `ended` event (so the FULL clip always plays).
// This is only a long safety net in case that event is somehow missed — keep it well ABOVE the
// clip length so it never cuts the animation short.
const DANCE_MAX_MS = 20000;

export function BarnabyMascot({
  status,
  winner,
  lastEliminated,
  isMyWin,
  isLocalDefeat,
  forceDancing,
  serverPaced = false,
  onDanceEnd,
  showPlayAgain = true,
  onPlayAgain,
}: BarnabyMascotProps) {
  // The cow is ALWAYS on stage and ALWAYS animating (looping) on the side. When the LOCAL player is
  // eliminated it slides to centre-stage, plays the FULL clip exactly ONCE, then slides back to the
  // side and resumes its idle loop. `dancing` = the centre one-shot performance.
  const controlled = forceDancing !== undefined;
  const [dancing, setDancing] = useState(false);
  const prevElimKeyRef = useRef<string | null>(null);
  const prevForceRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // CONTROLLED mode. Two flavours:
  //  • LOCAL engine (not serverPaced): mirror `forceDancing` directly; the clip's `ended` fires
  //    onDanceEnd to resume the local game.
  //  • SERVER-paced (real tournaments): start the dance on the RISING edge of `forceDancing` and let
  //    it stop at the clip's own `ended` (see onEnded) — so the cow dances EXACTLY one clip length,
  //    immune to client/server clock skew. The server still owns the game freeze; the cow simply
  //    returns to the side when the clip finishes.
  useEffect(() => {
    if (!controlled) return;
    if (serverPaced) {
      if (forceDancing && !prevForceRef.current) setDancing(true); // rising edge → play once
      if (!forceDancing) setDancing(false);
      prevForceRef.current = !!forceDancing;
    } else {
      setDancing(!!forceDancing);
    }
  }, [controlled, serverPaced, forceDancing]);

  // UNCONTROLLED (server-driven tournaments): trigger the centre one-shot when the LATEST elimination
  // is mine. Keyed on the elimination's CONTENT (name+reason), NOT the object reference — the socket
  // sends a fresh state object on every broadcast, so a reference check would re-fire the dance on
  // each tick. The content key fires it exactly once per distinct elimination.
  const elimKey = lastEliminated ? `${lastEliminated.name}|${lastEliminated.reason}` : null;
  useEffect(() => {
    if (controlled) return;
    if (isLocalDefeat && elimKey && elimKey !== prevElimKeyRef.current) {
      prevElimKeyRef.current = elimKey;
      setDancing(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDancing(false), DANCE_MAX_MS);
    }
    if (!elimKey) prevElimKeyRef.current = null; // reset on a fresh game
  }, [controlled, isLocalDefeat, elimKey]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Map EVERY elimination reason to its own message. (This used to default to "hit 31" for anything
  // that wasn't skip/repeat, so a time-out wrongly read as "hit 31".)
  const REASON_TEXT: Record<string, string> = {
    skip: "skipped a number",
    repeat: "repeated the same count",
    timeout: "ran out of time ⏰",
    over3: "grabbed too many cards",
    left: "left the arena",
    "31": "hit 31 💣",
  };
  const resultText = lastEliminated
    ? `${lastEliminated.name} ${REASON_TEXT[lastEliminated.reason] ?? "is out"}`
    : "Round complete";

  return (
    <div className="defeat-cow-layer" aria-live="polite">
      {/* While the cow performs centre-stage, gently dim + blur the arena behind it so the cow is the
          clear focus (low-opacity scrim — the board stays faintly visible). */}
      {dancing && <div className="defeat-cow-scrim" aria-hidden="true" />}
      <div className={`defeat-cow-stage ${dancing ? "is-local-defeat" : "is-idle"}`}>
        {dancing && (
          <div className="defeat-cow-stars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((star) => (
              <motion.span
                key={star}
                animate={{ rotate: [0, 360], y: [0, -6, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: star * 0.14 }}
              >
                ⭐
              </motion.span>
            ))}
          </div>
        )}

        <TransparentVideo
          src="/assets/lose-animation.mp4"
          audioEnabled={dancing}
          // Side = loop forever. Centre defeat: play the clip through EXACTLY ONCE (no loop) so it
          // never restarts a jarring second pass. For a server-paced dance the freeze window is sized
          // to the clip, so the clip ends right as the cow returns to the side.
          loop={!dancing}
          onEnded={() => {
            // Clip finished → cow returns to the side. For a server-paced dance this is what ends the
            // centre performance (exactly one clip play); the server independently resumes the game.
            setDancing(false);
            if (controlled && !serverPaced) onDanceEnd?.();
          }}
          className="h-full w-full aspect-[9/16]"
        />

        {/* The dancing cow now plays ONLY at round completion (the round-transition celebration), so
            it no longer carries an elimination readout — the per-elimination "who's out + why"
            cinematic is owned by EliminationSequence. The cow just dances here. */}
      </div>

      {status === "over" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`arena-result-panel ${isMyWin ? "is-win" : ""}`}
        >
          <strong>{isMyWin ? "YOU WIN!" : `${winner?.name ?? "Champion"} WINS`}</strong>
          <span>{resultText}</span>
          {showPlayAgain && (
            <button
              type="button"
              onClick={() => {
                soundManager.playClick();
                onPlayAgain?.();
              }}
            >
              <RotateCcw size={15} /> PLAY AGAIN
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}
