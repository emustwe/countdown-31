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
  onPlayAgain?: () => void;
}

// The lose clip is ~3s; this is a safety fallback in case the video's `ended` event is missed.
const DANCE_MAX_MS = 4200;

export function BarnabyMascot({
  status,
  winner,
  lastEliminated,
  isMyWin,
  isLocalDefeat,
  onPlayAgain,
}: BarnabyMascotProps) {
  // The cow is ALWAYS on stage (idle at the side, holding frame 0). On each new elimination it
  // plays its clip exactly ONCE; when it's the local player's defeat it slides to centre-stage for
  // the clip and then slides back to the side. `dancing` drives one-shot playback + the position.
  const [dancing, setDancing] = useState(false);
  const prevElimRef = useRef<typeof lastEliminated>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastEliminated && lastEliminated !== prevElimRef.current) {
      prevElimRef.current = lastEliminated;
      setDancing(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDancing(false), DANCE_MAX_MS);
    }
    if (!lastEliminated) prevElimRef.current = null; // reset on a fresh game
  }, [lastEliminated]);

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

  // Slide to centre only while the LOCAL player's defeat clip is playing; otherwise idle at the side.
  const centreStage = dancing && isLocalDefeat;

  return (
    <div className="defeat-cow-layer" aria-live="polite">
      <div className={`defeat-cow-stage ${centreStage ? "is-local-defeat" : "is-idle"}`}>
        {centreStage && (
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
          audioEnabled={centreStage}
          playing={dancing}
          onEnded={() => setDancing(false)}
          className="h-full w-full aspect-[9/16]"
        />

        {centreStage && (
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
      </div>

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
