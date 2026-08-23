"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../stores/game-store";
import { AlertTriangle, Bomb, Check, Flame, Sparkles } from "lucide-react";

export function GameBoard() {
  const { currentCount, targetCount, turn, gameStatus } = useGameStore();

  const tiles = useMemo(() => {
    return Array.from({ length: targetCount }, (_, i) => i + 1);
  }, [targetCount]);

  const isDanger = currentCount >= 28 && currentCount < 31;
  const progressPct = Math.min(100, Math.round((currentCount / targetCount) * 100));

  return (
    <div className="w-full max-w-4xl mx-auto arcade-card-wood p-4 sm:p-6 shadow-xl relative select-none">
      {/* Top Track Header / Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-title text-base sm:text-lg font-bold text-amber-950 flex items-center gap-1.5">
              <Sparkles size={18} className="text-amber-600" />
              <span>Counting Track</span>
            </span>
            {isDanger && (
              <motion.span
                animate={{ scale: [1, 1.1, 1], rotate: [-2, 2, -2] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="bg-red-500 text-white font-title text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow"
              >
                <Flame size={12} className="fill-white" /> DANGER ZONE!
              </motion.span>
            )}
          </div>

          <div className="font-title font-black text-lg sm:text-xl text-amber-950 bg-amber-200/80 px-3 py-0.5 rounded-xl border-2 border-amber-900/30">
            {currentCount} / {targetCount}
          </div>
        </div>

        {/* Progress meter bar */}
        <div className="h-4 w-full bg-amber-950/20 rounded-full overflow-hidden p-0.5 border-2 border-amber-950/40 relative">
          <motion.div
            className={`h-full rounded-full transition-colors ${
              currentCount >= 31
                ? "bg-gradient-to-r from-red-500 to-rose-600"
                : currentCount >= 28
                  ? "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500"
                  : "bg-gradient-to-r from-emerald-400 to-emerald-600"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          />
        </div>
      </div>

      {/* Numbered Tiles Grid (1 to 31) */}
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-11 gap-1.5 sm:gap-2.5">
        {tiles.map((num) => {
          const isPassed = num < currentCount;
          const isCurrent = num === currentCount;
          const isNextStep1 = num === currentCount + 1 && currentCount < targetCount;
          const isNextStep2 = num === currentCount + 2 && currentCount < targetCount;
          const is31 = num === 31;
          const isDangerZone = num >= 28 && num <= 30;

          // Tile class logic
          let bgClass = "bg-amber-100/90 text-amber-900 border-amber-900/30";
          let borderClass = "border-2 sm:border-3";

          if (is31) {
            bgClass = isCurrent
              ? "arcade-token-31"
              : "bg-gradient-to-br from-rose-500 to-red-700 text-yellow-200 border-red-950 shadow-md";
          } else if (isPassed) {
            bgClass = "bg-emerald-200/70 text-emerald-900/60 border-emerald-700/30 opacity-75";
          } else if (isCurrent) {
            bgClass = isDangerZone
              ? "arcade-token-danger arcade-token-active"
              : "bg-gradient-to-br from-amber-300 to-yellow-400 text-amber-950 border-amber-900 arcade-token-active";
          } else if (isDangerZone) {
            bgClass = "bg-gradient-to-br from-orange-400 to-amber-500 text-amber-950 border-amber-900 shadow-sm";
          } else if (isNextStep1 || isNextStep2) {
            bgClass = "bg-white text-emerald-900 border-emerald-600/70 ring-2 ring-emerald-300 shadow-sm";
          }

          return (
            <motion.div
              key={num}
              whileHover={
                isNextStep1 || isNextStep2
                  ? { scale: 1.12, y: -2 }
                  : { scale: 1.04 }
              }
              animate={
                isCurrent
                  ? { scale: [1.1, 1.18, 1.1] }
                  : is31 && !isPassed
                    ? { scale: [1, 1.06, 1] }
                    : { scale: 1 }
              }
              transition={
                isCurrent
                  ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                  : is31
                    ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
                    : { duration: 0.2 }
              }
              className={`relative flex flex-col items-center justify-center h-11 sm:h-14 rounded-xl font-title font-black text-sm sm:text-lg transition-all cursor-default select-none ${bgClass} ${borderClass}`}
            >
              {/* Passed checkmark */}
              {isPassed && (
                <div className="absolute top-1 right-1 text-emerald-700 opacity-70">
                  <Check size={10} strokeWidth={4} />
                </div>
              )}

              {/* Step indicator badges */}
              {isNextStep1 && gameStatus === "playing" && (
                <span className="absolute -top-2 bg-emerald-600 text-white text-[9px] font-title px-1 rounded-md shadow">
                  +1
                </span>
              )}
              {isNextStep2 && gameStatus === "playing" && (
                <span className="absolute -top-2 bg-sky-600 text-white text-[9px] font-title px-1 rounded-md shadow">
                  +2
                </span>
              )}

              {/* Danger flame icon for 28-30 */}
              {isDangerZone && !isPassed && (
                <div className="text-[10px] text-amber-950 flex items-center justify-center -mb-1">
                  🔥
                </div>
              )}

              {/* 31 Bomb / Skull Icon */}
              {is31 ? (
                <div className="flex items-center gap-0.5">
                  <Bomb size={14} className={isCurrent ? "animate-spin" : ""} />
                  <span>31</span>
                </div>
              ) : (
                <span>{num}</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Danger Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs font-title text-amber-900/80 pt-3 border-t border-amber-900/20">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-400 border border-emerald-700 inline-block" />
            <span>Passed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 border border-amber-800 inline-block" />
            <span>Active</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 border border-amber-900 inline-block" />
            <span>Danger (28-30)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 border border-rose-950 inline-block" />
            <span>31 Defeat!</span>
          </span>
        </div>
      </div>
    </div>
  );
}
