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
  suppressIdle?: boolean;
  onPlayAgain?: () => void;
}

// Safety fallback in case the video's `ended` event is missed while playing the one-shot.
const DANCE_MAX_MS = 6000;

export function BarnabyMascot({
  status,
  winner,
  lastEliminated,
  isMyWin,
  isLocalDefeat,
  suppressIdle = false,
  onPlayAgain,
}: BarnabyMascotProps) {
  // The cow is ALWAYS on stage and ALWAYS animating (looping) on the side. When the LOCAL player is
  // eliminated it slides to centre-stage, plays the FULL clip exactly ONCE, then slides back to the
  // side and resumes its idle loop. `dancing` = the centre one-shot performance.
  const [dancing, setDancing] = useState(false);
  const prevElimRef = useRef<typeof lastEliminated>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Trigger the centre one-shot only on a NEW local defeat (fresh lastEliminated reference).
    if (isLocalDefeat && lastEliminated && lastEliminated !== prevElimRef.current) {
      prevElimRef.current = lastEliminated;
      setDancing(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDancing(false), DANCE_MAX_MS);
    }
    if (!lastEliminated) prevElimRef.current = null; // reset on a fresh game
  }, [isLocalDefeat, lastEliminated]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const resultText = lastEliminated
    ? lastEliminated.reason === "skip"
      ? `${lastEliminated.name} skipped a number`
      : lastEliminated.reason === "repeat"
        ? `${lastEliminated.name} repeated a count`
        : `${lastEliminated.name} hit 31`
    : "Round complete";
  const showStage = dancing || !suppressIdle;

  return (
    <div className="defeat-cow-layer" aria-live="polite">
      {showStage && <div className={`defeat-cow-stage ${dancing ? "is-local-defeat" : "is-idle"}`}>
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
          src="/assets/lose-animation-60fps.mp4"
          audioEnabled={dancing}
          loop={!dancing} // side = loop forever; centre defeat = play through once
          onEnded={() => setDancing(false)}
          className="h-full w-full aspect-[9/16]"
        />

        {dancing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="defeat-cow-message"
          >
            <strong>{status === "over" ? "ROUND OVER" : "YOU'RE OUT"}</strong>
            <span>{resultText}</span>
          </motion.div>
        )}
      </div>}

      {status === "over" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`arena-result-panel ${isMyWin ? "is-win" : ""}`}
        >
          <strong>{isMyWin ? "YOU WIN!" : `${winner?.name ?? "Champion"} WINS`}</strong>
          <span>{resultText}</span>
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onPlayAgain?.();
            }}
          >
            <RotateCcw size={15} /> PLAY AGAIN
          </button>
        </motion.div>
      )}
    </div>
  );
}
