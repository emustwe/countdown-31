"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Flame, Sparkles } from "lucide-react";
import { TransparentVideo } from "./TransparentVideo";
import { soundManager } from "../../lib/soundManager";

interface BarnabyMascotProps {
  count: number;
  status: "waiting" | "playing" | "over";
  myTurn: boolean;
  winner: { name: string; color: string } | null;
  lastEliminated: { name: string; reason: string } | null;
  isMyWin: boolean;
  onPlayAgain?: () => void;
}

export function BarnabyMascot({
  count,
  status,
  myTurn,
  winner,
  lastEliminated,
  isMyWin,
  onPlayAgain,
}: BarnabyMascotProps) {
  if (status !== "over") return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 20 }}
      className="relative w-full max-w-2xl mx-auto flex flex-col items-center justify-center select-none z-30 py-1"
    >
      {/* NO CARD / NO BACKGROUND BOX - PURE FLOATING CHARACTER & HUD */}

      {/* Floating 3D Golden Stars Orbiting Above Head */}
      {!isMyWin && (
        <div className="flex justify-center items-center gap-2 mb-[-12px] z-30 pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <motion.span
              key={i}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.35, 1],
                y: [0, -8, 0],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.18,
              }}
              className="text-2xl sm:text-3xl drop-shadow-[0_0_15px_rgba(255,215,0,0.95)]"
            >
              ⭐
            </motion.span>
          ))}
        </div>
      )}

      {/* Floating Character Video / Avatar (Zero Card / Zero Background) */}
      <div className="relative flex items-center justify-center">
        {!isMyWin ? (
          <TransparentVideo
            src="/assets/lose-animation-60fps.mp4"
            className="w-48 h-48 sm:w-56 sm:h-56"
            width={400}
            height={400}
            keyColor="auto"
            threshold={35}
          />
        ) : (
          <motion.div
            animate={{
              y: [0, -12, 0],
              scale: [1, 1.05, 1],
            }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-40 h-40 sm:w-48 sm:h-48 drop-shadow-[0_15px_30px_rgba(245,158,11,0.8)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/Avatar1/avatar.png"
              alt="Victory Champion Bull"
              className="w-full h-full object-contain"
            />
          </motion.div>
        )}
      </div>

      {/* Floating Signature Speech Bubble */}
      <motion.div
        initial={{ scale: 0.85, y: 5 }}
        animate={{ scale: 1, y: 0 }}
        className="mt-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-amber-950 font-title font-black text-sm sm:text-base px-6 py-2 rounded-2xl border-2 border-amber-950 shadow-[0_8px_20px_rgba(0,0,0,0.6),0_0_20px_rgba(245,158,11,0.6)] text-center max-w-md"
      >
        &ldquo;{isMyWin ? "Udder perfection! You conquered 31! 🏆👑" : "Countdown 31, Round and Round 31! 💫😵"}&rdquo;
      </motion.div>

      {/* Floating Outcome Details Badge */}
      <div className="flex items-center gap-3 mt-2 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-amber-400/50 shadow-lg text-xs font-title">
        <span className="text-slate-300">
          Winner: <b className="text-emerald-400">{winner?.name ?? "Champion"}</b>
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-500" />
        <span className="text-rose-400 font-bold">
          {lastEliminated
            ? lastEliminated.reason === "skip"
              ? `${lastEliminated.name} skipped a card!`
              : lastEliminated.reason === "repeat"
                ? `${lastEliminated.name} repeated count!`
                : `${lastEliminated.name} hit 31 bomb!`
            : "Hit 31 bomb"}
        </span>
      </div>

      {/* Floating 3D Play Again Button */}
      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          soundManager.playClick();
          onPlayAgain?.();
        }}
        className="mt-3 px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm sm:text-base uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.8),0_4px_12px_rgba(0,0,0,0.6)] cursor-pointer flex items-center gap-2"
      >
        <RotateCcw size={18} />
        <span>PLAY AGAIN</span>
      </motion.button>
    </motion.div>
  );
}
