"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Skull, Trophy } from "lucide-react";
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
        : `${lastEliminated.name} hit 31!`
    : "Don't be the one to hit 31!";

  return (
    <>
      {/* 1. Full-Screen Cinematic Defeat Stage Modal (Activated when player is eliminated) */}
      <AnimatePresence>
        {isLocalDefeat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none pointer-events-auto"
          >
            {/* Spinning Stars Crown above Cow's Head */}
            <div className="relative z-10 flex items-center justify-center gap-2 mb-[-18px]">
              {[0, 1, 2, 3, 4].map((star) => (
                <motion.span
                  key={star}
                  animate={{
                    rotate: [0, 360],
                    y: [0, -10, 0],
                    scale: [1, 1.25, 1],
                  }}
                  transition={{
                    duration: 1.4,
                    repeat: Infinity,
                    delay: star * 0.18,
                    ease: "easeInOut",
                  }}
                  className="text-2xl sm:text-3xl md:text-4xl filter drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]"
                >
                  ⭐
                </motion.span>
              ))}
            </div>

            {/* Big Center Animated Cow */}
            <div className="relative w-52 h-72 sm:w-64 sm:h-88 md:w-72 md:h-96 flex items-center justify-center">
              <TransparentVideo
                src="/assets/lose-animation-60fps.mp4"
                audioEnabled={true}
                className="w-full h-full object-contain filter drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)]"
              />
            </div>

            {/* Defeat Result Card */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#2a1012]/98 via-[#18090a]/98 to-[#0b0304] border-2 sm:border-3 border-rose-500 rounded-3xl p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_35px_rgba(244,63,94,0.4)] flex flex-col items-center text-center gap-2.5 -mt-4 z-10"
            >
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/90 border border-rose-500/70 text-rose-300 text-xs font-title font-black shadow">
                <Skull size={14} className="text-rose-400 animate-pulse" />
                <span>YOU'RE ELIMINATED!</span>
              </div>

              <h2 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide drop-shadow">
                YOU HIT 31!
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 font-medium">
                {resultText}
              </p>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onPlayAgain?.();
                }}
                className="w-full mt-2 btn-arcade-3d btn-arcade-amber py-3.5 rounded-2xl text-base font-title font-black flex items-center justify-center gap-2 cursor-pointer shadow-xl"
              >
                <RotateCcw size={18} />
                <span>PLAY AGAIN</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Victory Modal for Round Winner */}
      <AnimatePresence>
        {status === "over" && isMyWin && !isLocalDefeat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] flex flex-col items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none pointer-events-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="relative w-full max-w-sm bg-gradient-to-b from-[#192b20]/98 via-[#0e1a13]/98 to-[#060c08] border-3 border-amber-400 rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_40px_rgba(245,158,11,0.5)] flex flex-col items-center text-center gap-3"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-xl mb-1">
                <Trophy size={36} className="text-yellow-400 fill-yellow-400 animate-bounce" />
              </div>

              <span className="text-xs font-title font-black uppercase tracking-widest text-emerald-400">
                CHAMPION OF THE PASTURE
              </span>

              <h2 className="font-title font-black text-3xl text-white tracking-wide">
                YOU WIN! 👑
              </h2>

              <p className="text-xs text-slate-300 font-medium">
                You survived the countdown! Don't let your guard down.
              </p>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onPlayAgain?.();
                }}
                className="w-full mt-2 btn-arcade-3d btn-arcade-green py-3.5 rounded-2xl text-base font-title font-black flex items-center justify-center gap-2 cursor-pointer shadow-xl"
              >
                <RotateCcw size={18} />
                <span>NEXT ROUND</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Non-Local Round Over Notice */}
      <AnimatePresence>
        {status === "over" && !isMyWin && !isLocalDefeat && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4 select-none pointer-events-auto"
          >
            <div className="w-full bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#050a07] border-2 border-amber-400 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Trophy size={22} className="text-yellow-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="font-title font-black text-sm text-white truncate">
                    {winner?.name ?? "Champion"} Wins!
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium truncate">
                    {resultText}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onPlayAgain?.();
                }}
                className="btn-arcade-3d btn-arcade-amber px-4 py-2 rounded-xl text-xs font-title font-black shrink-0 flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>PLAY</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
