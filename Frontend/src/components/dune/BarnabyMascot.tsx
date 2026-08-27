"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Trophy, Skull, Eye } from "lucide-react";
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
  onSpectate?: () => void;
}

export function BarnabyMascot({
  status,
  winner,
  lastEliminated,
  isMyWin,
  isLocalDefeat,
  suppressIdle = false,
  onPlayAgain,
  onSpectate,
}: BarnabyMascotProps) {
  // When the LOCAL player is eliminated or round ends, the mascot expands into the huge center stage
  // with a black blurred backdrop, looping the animation infinitely until the user selects an action.
  const isCenterStage = isLocalDefeat || status === "over";

  // When the mascot animation comes up, silence any active BGM track completely to 0
  useEffect(() => {
    if (isCenterStage) {
      soundManager.duckBgm(true);
    } else {
      soundManager.duckBgm(false);
    }
    return () => {
      soundManager.duckBgm(false);
    };
  }, [isCenterStage]);

  const resultText = lastEliminated
    ? lastEliminated.reason === "skip"
      ? `${lastEliminated.name} skipped a number in sequence!`
      : lastEliminated.reason === "repeat"
        ? `${lastEliminated.name} repeated a count!`
        : `${lastEliminated.name} hit target 31!`
    : status === "over"
      ? winner
        ? `${winner.name} won the match!`
        : "Round complete"
      : "You were eliminated this round";

  return (
    <>
      {/* 1. Normal Gameplay: Corner Cow Mascot (Bottom-Left) */}
      {!suppressIdle && !isCenterStage && (
        <div className="defeat-cow-layer" aria-live="polite">
          <div className="defeat-cow-stage is-idle">
            <TransparentVideo
              src="/assets/lose-animation-60fps.mp4"
              audioEnabled={false}
              playbackRate={1.0}
              loop={true}
              className="h-full w-full aspect-[9/16]"
            />
          </div>
        </div>
      )}

      {/* 2. Fullscreen Black Blurred Mascot Stage (Elimination or Game Over) */}
      <AnimatePresence>
        {isCenterStage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="defeat-cow-result fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xl p-4 select-none pointer-events-auto overflow-y-auto"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(20, 30, 24, 0.95) 0%, rgba(0, 0, 0, 0.92) 80%)",
            }}
          >
            {/* Top Result Banner */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="defeat-cow-result-copy flex flex-col items-center gap-1.5 text-center mb-2 z-10"
            >
              <div className="flex items-center gap-2">
                {isMyWin ? (
                  <Trophy size={28} className="text-yellow-400 fill-yellow-400 animate-bounce" />
                ) : (
                  <Skull size={26} className="text-red-400 animate-pulse" />
                )}
                <h2 className="font-title font-black text-2xl sm:text-4xl text-amber-300 tracking-wider drop-shadow-[0_0_20px_rgba(245,158,11,0.8)] uppercase">
                  {isMyWin
                    ? "👑 VICTORY! YOU WIN!"
                    : status === "over"
                      ? `${winner?.name ?? "Champion"} WINS!`
                      : "💥 YOU'RE ELIMINATED"}
                </h2>
              </div>
              <span className="text-xs sm:text-sm font-title font-bold text-slate-300 bg-black/60 px-4 py-1 rounded-full border border-amber-400/40 shadow">
                {resultText}
              </span>
            </motion.div>

            {/* Stars Cascade above Mascot */}
            <div className="defeat-cow-result-stars flex gap-2 mb-1 z-10">
              {[0, 1, 2, 3, 4].map((star) => (
                <motion.span
                  key={star}
                  animate={{ rotate: [0, 360], y: [0, -8, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: star * 0.15 }}
                  className="text-xl sm:text-2xl drop-shadow-[0_0_10px_rgba(250,204,21,0.9)]"
                >
                  ⭐
                </motion.span>
              ))}
            </div>

            {/* Huge Middle Screen Mascot Video - Loops Infinitely & Plays at 1.4x lively speed */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 22 }}
              className="defeat-cow-result-video relative w-[280px] sm:w-[380px] md:w-[450px] aspect-[9/16] max-h-[48vh] sm:max-h-[54vh] flex items-center justify-center shrink-0 drop-shadow-[0_15px_40px_rgba(0,0,0,0.9)]"
            >
              <TransparentVideo
                src="/assets/lose-animation-60fps.mp4"
                audioEnabled={true}
                playbackRate={1.0}
                loop={true}
                className="h-full w-full aspect-[9/16] object-contain"
              />
            </motion.div>

            {/* Action Buttons Below the Mascot */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.35 }}
              className="defeat-cow-result-actions mt-3 sm:mt-5 z-20 flex flex-col sm:flex-row items-center gap-3"
            >
              {/* Primary Action: PLAY AGAIN */}
              <button
                type="button"
                onClick={() => {
                  soundManager.playConfirm();
                  onPlayAgain?.();
                }}
                className="px-8 py-3.5 sm:px-10 sm:py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:from-emerald-300 hover:to-green-300 text-slate-950 font-title font-black text-base sm:text-lg shadow-[0_0_35px_rgba(52,211,153,0.9),0_6px_20px_rgba(0,0,0,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2.5 cursor-pointer select-none border-2 border-emerald-200"
              >
                <RotateCcw
                  size={20}
                  className="animate-spin"
                  style={{ animationDuration: "10s" }}
                />
                <span>PLAY AGAIN</span>
              </button>

              {/* Secondary Action: SPECTATE MATCH (when match is still in progress) */}
              {status === "playing" && onSpectate && (
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playClick();
                    onSpectate();
                  }}
                  className="px-6 py-3 rounded-2xl bg-black/60 hover:bg-black/80 text-amber-300 hover:text-amber-200 border-2 border-amber-400/50 hover:border-amber-400 font-title font-bold text-sm sm:text-base shadow-[0_4px_15px_rgba(0,0,0,0.6)] flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Eye size={18} />
                  <span>SPECTATE MATCH</span>
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
