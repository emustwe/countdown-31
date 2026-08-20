"use client";

import React from "react";
import { motion } from "framer-motion";
import { Trophy, RotateCcw, Flame, Sparkles } from "lucide-react";
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
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="w-full max-w-2xl mx-auto rounded-3xl p-4 sm:p-5 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 sm:border-3 border-amber-400 shadow-[0_0_50px_rgba(245,158,11,0.5)] select-none flex flex-col items-center gap-3 relative overflow-hidden"
    >
      {/* Ambient Radial Lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.18)_0%,transparent_70%)] pointer-events-none" />

      {/* Top Banner Outcome Title */}
      <div className="w-full flex items-center justify-between border-b border-amber-400/30 pb-2 px-1 z-10">
        <span className="font-title font-black text-base sm:text-xl text-amber-300 tracking-wide flex items-center gap-2">
          {isMyWin ? "🏆 VICTORY CHAMPION!" : "💫 ROUND & ROUND 31!"}
        </span>
        <span
          className={`text-[10px] font-title font-black px-2.5 py-0.5 rounded-full uppercase shadow ${
            isMyWin ? "bg-emerald-400 text-slate-950" : "bg-rose-500 text-white"
          }`}
        >
          {isMyWin ? "CONQUERED" : "ELIMINATED"}
        </span>
      </div>

      {/* Center Showcase: 3D Video & Outcome Info */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-12 gap-4 items-center z-10">
        {/* Left Video / Mascot Box (5 Cols) */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative">
            {/* Stars above head on Defeat */}
            {!isMyWin && (
              <div className="absolute -top-4 inset-x-0 flex justify-center items-center gap-1 z-20 pointer-events-none">
                {[...Array(4)].map((_, i) => (
                  <motion.span
                    key={i}
                    animate={{
                      rotate: 360,
                      scale: [1, 1.25, 1],
                      y: [0, -4, 0],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "linear",
                      delay: i * 0.2,
                    }}
                    className="text-lg drop-shadow-[0_0_8px_rgba(255,215,0,0.9)]"
                  >
                    ⭐
                  </motion.span>
                ))}
              </div>
            )}

            {/* 3D Cow Video on Defeat / Golden Bull on Victory */}
            <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-2 sm:border-3 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] relative bg-black flex items-center justify-center">
              {!isMyWin ? (
                <video
                  src="/assets/lose-animation-60fps.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/assets/Avatar1/avatar.png"
                  alt="Victory Champion Bull"
                  className="w-full h-full object-cover object-center"
                />
              )}
            </div>
          </div>
        </div>

        {/* Right Match Stats & Play Again Button (7 Cols) */}
        <div className="sm:col-span-7 flex flex-col justify-between gap-2.5">
          {/* Quote Pill */}
          <div className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-amber-950 font-title font-black text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border border-amber-950 shadow text-center">
            &ldquo;{isMyWin ? "Udder perfection! You conquered 31!" : "Countdown 31, Round and Round 31!"}&rdquo;
          </div>

          {/* Stats Details */}
          <div className="bg-black/60 border border-slate-800 rounded-xl p-2.5 text-xs font-title flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-slate-300 border-b border-white/10 pb-1">
              <span className="text-slate-400 font-normal">Match Winner</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Trophy size={13} /> {winner?.name ?? "Champion"}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="text-slate-400 font-normal">Outcome</span>
              <span className="text-rose-400 font-bold">
                {lastEliminated
                  ? lastEliminated.reason === "skip"
                    ? `${lastEliminated.name} committed a BLUNDER: Skipped a card!`
                    : lastEliminated.reason === "repeat"
                      ? `${lastEliminated.name} repeated previous count!`
                      : `${lastEliminated.name} hit 31 bomb!`
                  : "Hit 31 bomb"}
              </span>
            </div>
          </div>

          {/* Play Again Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              onPlayAgain?.();
            }}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            <span>PLAY AGAIN</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
