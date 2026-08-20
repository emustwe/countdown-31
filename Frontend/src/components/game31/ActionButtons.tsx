"use client";

import React from "react";
import { motion } from "framer-motion";
import { useGameStore } from "../../stores/game-store";
import { Play, RotateCcw, Zap, ArrowRight, ShieldAlert } from "lucide-react";

export function ActionButtons() {
  const {
    currentCount,
    targetCount,
    turn,
    gameStatus,
    isProcessing,
    addCount,
    startGame,
    resetGame,
    loser,
  } = useGameStore();

  const isPlayerTurn = turn === "player" && gameStatus === "playing" && !isProcessing;
  const isOpponentTurn = (turn === "ai" || turn === "player2") && gameStatus === "playing";

  const nextCount1 = currentCount + 1;
  const nextCount2 = currentCount + 2;

  const canPick1 = isPlayerTurn && nextCount1 <= targetCount;
  const canPick2 = isPlayerTurn && nextCount2 <= targetCount;

  const isDanger1 = nextCount1 === 31;
  const isDanger2 = nextCount2 === 31;

  if (gameStatus === "idle") {
    return (
      <div className="flex flex-col items-center gap-3 my-4">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => startGame()}
          className="btn-arcade-3d btn-arcade-green text-xl sm:text-2xl px-8 py-4 flex items-center gap-3 shadow-2xl"
        >
          <Play className="fill-white" size={26} />
          <span>START COW GAME!</span>
        </motion.button>
        <span className="text-xs font-title font-bold text-amber-900/70 bg-amber-100/90 px-3 py-1 rounded-full border border-amber-900/20">
          Rules: Take turns adding +1 or +2. Whoever hits 31 loses!
        </span>
      </div>
    );
  }

  if (gameStatus === "spin_defeat") {
    const isPlayerLoser = loser === "player";

    return (
      <div className="flex flex-col items-center gap-4 my-3">
        <div
          className={`text-center font-title font-black text-2xl sm:text-3xl px-6 py-2 rounded-2xl border-4 ${
            isPlayerLoser
              ? "bg-rose-100 text-rose-950 border-rose-600 shadow-xl"
              : "bg-emerald-100 text-emerald-950 border-emerald-600 shadow-xl"
          }`}
        >
          {isPlayerLoser ? (
            <div className="flex items-center gap-2">
              <span>🐮 DIZZY DEFEAT! YOU HIT 31! 💫</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>🏆 MOO-VELOUS VICTORY! OPPONENT HIT 31! 👑</span>
            </div>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => startGame()}
          className="btn-arcade-3d btn-arcade-amber text-lg sm:text-xl px-8 py-3.5 flex items-center gap-2"
        >
          <RotateCcw size={22} />
          <span>PLAY AGAIN</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-3 my-3 select-none">
      {/* Turn Banner */}
      <div className="text-center">
        {isPlayerTurn ? (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="font-title font-black text-lg sm:text-xl text-emerald-800 bg-emerald-100/95 px-5 py-1.5 rounded-full border-2 border-emerald-500 shadow-sm flex items-center gap-2"
          >
            <Zap size={18} className="fill-emerald-600 text-emerald-600" />
            <span>YOUR TURN! Pick +1 or +2</span>
          </motion.div>
        ) : (
          <div className="font-title font-bold text-base sm:text-lg text-amber-900 bg-amber-100/90 px-5 py-1 rounded-full border-2 border-amber-900/20 flex items-center gap-2">
            <span className="animate-spin text-lg">🐮</span>
            <span>Opponent is thinking...</span>
          </div>
        )}
      </div>

      {/* Oversized Juicy 3D Buttons [+1] and [+2] */}
      <div className="grid grid-cols-2 gap-4 sm:gap-6 w-full px-2">
        {/* +1 Button */}
        <motion.button
          whileHover={canPick1 ? { scale: 1.05, y: -3 } : {}}
          whileTap={canPick1 ? { scale: 0.94, y: 3 } : {}}
          disabled={!canPick1}
          onClick={() => addCount(1)}
          className={`btn-arcade-3d flex flex-col items-center py-4 sm:py-5 px-3 rounded-2xl transition-all ${
            isDanger1
              ? "btn-arcade-crimson"
              : "btn-arcade-green"
          }`}
        >
          <div className="flex items-center gap-1 text-2xl sm:text-4xl font-black">
            <span>+1</span>
            {isDanger1 && <ShieldAlert size={22} className="text-yellow-300" />}
          </div>
          <div className="text-xs sm:text-sm font-title font-bold tracking-normal mt-1 opacity-90 flex items-center gap-1">
            <span>Move to</span>
            <span className="underline font-black">{nextCount1}</span>
            <ArrowRight size={13} />
          </div>
        </motion.button>

        {/* +2 Button */}
        <motion.button
          whileHover={canPick2 ? { scale: 1.05, y: -3 } : {}}
          whileTap={canPick2 ? { scale: 0.94, y: 3 } : {}}
          disabled={!canPick2}
          onClick={() => addCount(2)}
          className={`btn-arcade-3d flex flex-col items-center py-4 sm:py-5 px-3 rounded-2xl transition-all ${
            isDanger2
              ? "btn-arcade-crimson"
              : "btn-arcade-blue"
          }`}
        >
          <div className="flex items-center gap-1 text-2xl sm:text-4xl font-black">
            <span>+2</span>
            {isDanger2 && <ShieldAlert size={22} className="text-yellow-300" />}
          </div>
          <div className="text-xs sm:text-sm font-title font-bold tracking-normal mt-1 opacity-90 flex items-center gap-1">
            <span>Move to</span>
            <span className="underline font-black">{nextCount2}</span>
            <ArrowRight size={13} />
          </div>
        </motion.button>
      </div>

      {/* Reset quick button */}
      <button
        onClick={resetGame}
        className="mt-1 text-xs font-title font-bold text-amber-900/60 hover:text-amber-950 flex items-center gap-1 py-1 px-3 hover:bg-amber-100/50 rounded-lg transition-colors"
      >
        <RotateCcw size={12} />
        <span>Reset Game</span>
      </button>
    </div>
  );
}
