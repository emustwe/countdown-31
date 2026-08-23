"use client";

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

export function BarnabyMascot({
  status,
  winner,
  lastEliminated,
  isMyWin,
  isLocalDefeat,
  onPlayAgain,
}: BarnabyMascotProps) {
  const resultText = lastEliminated
    ? lastEliminated.reason === "skip"
      ? `${lastEliminated.name} skipped a number`
      : lastEliminated.reason === "repeat"
        ? `${lastEliminated.name} repeated a count`
        : `${lastEliminated.name} hit 31`
    : "Round complete";

  return (
    <div className="defeat-cow-layer" aria-live="polite">
      <div className={`defeat-cow-stage ${isLocalDefeat ? "is-local-defeat" : "is-idle"}`}>
        {isLocalDefeat && (
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
          audioEnabled={isLocalDefeat}
          className="h-full w-full aspect-[9/16]"
        />

        {isLocalDefeat && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="defeat-cow-message"
          >
            <strong>{status === "over" ? "ROUND OVER" : "YOU'RE OUT"}</strong>
            <span>{resultText}</span>
            {status === "over" && (
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onPlayAgain?.();
                }}
              >
                <RotateCcw size={14} /> PLAY AGAIN
              </button>
            )}
          </motion.div>
        )}
      </div>

      {status === "over" && !isLocalDefeat && (
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
