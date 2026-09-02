"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, ChevronLeft } from "lucide-react";
import confetti from "canvas-confetti";
import { soundManager } from "../../lib/soundManager";

/**
 * Full-screen end-of-game takeover: when a game is OVER this covers the entire arena (board, roster,
 * everything) and shows ONLY the winner + fireworks. Real tournaments end here (no "play again");
 * practice offers a rematch.
 */
export function WinnerCelebration({
  winnerName,
  isMyWin,
  isTournament,
  onPlayAgain,
  onExit,
}: {
  winnerName: string;
  isMyWin: boolean;
  isTournament: boolean;
  onPlayAgain?: () => void;
  onExit?: () => void;
}) {
  // Ongoing fireworks bursts for the whole celebration (independent of the one-shot in CountDown31).
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const colors = ["#5be348", "#ffdf78", "#ff43c4", "#21e6d7", "#f59e0b"];
    const burst = () => {
      try {
        confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
        confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
      } catch {
        /* confetti unavailable — ignore */
      }
    };
    burst();
    timerRef.current = setInterval(burst, 1200);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const title = isMyWin ? "YOU WIN!" : `${winnerName} WINS!`;
  const subtitle = isMyWin ? "Last cow standing — the crown is yours" : "The last cow standing takes the crown";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 px-6 text-center bg-[radial-gradient(ellipse_at_center,#123420_0%,#06120c_60%,#020806_100%)]"
    >
      <motion.div
        initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 14 }}
        className="flex items-center justify-center w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-4 border-white shadow-[0_0_60px_rgba(245,158,11,0.9)]"
      >
        <Trophy size={64} className="text-amber-950 fill-amber-200" />
      </motion.div>

      <motion.h1
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="font-title font-black text-4xl sm:text-6xl text-amber-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] tracking-wide"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="font-title font-bold text-sm sm:text-lg text-slate-200 max-w-md"
      >
        🏆 {subtitle}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="mt-2"
      >
        {isTournament ? (
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onExit?.();
            }}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={18} /> Back to Tournaments
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onPlayAgain?.();
            }}
            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(52,211,153,0.7)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw size={18} /> Play Again
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}
