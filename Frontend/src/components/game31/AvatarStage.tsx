"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "../../stores/game-store";
import { CowAvatar } from "./CowAvatar";
import { Sparkles, Trophy, Zap } from "lucide-react";

export function AvatarStage() {
  const {
    turn,
    gameMode,
    difficulty,
    gameStatus,
    loser,
    winner,
    speechBubble,
    playerEmotion,
    opponentEmotion,
    stats,
    currentCount,
  } = useGameStore();

  const isPlayerTurn = turn === "player" && gameStatus === "playing";
  const isOpponentTurn = (turn === "ai" || turn === "player2") && gameStatus === "playing";

  const opponentName =
    gameMode === "vs-ai"
      ? `Bessie AI (${difficulty.toUpperCase()})`
      : "Player 2";

  return (
    <div className="w-full relative px-4 py-3 select-none">
      {/* VS Badge in Center */}
      <div className="absolute left-1/2 -translate-x-1/2 top-10 flex flex-col items-center z-20 pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 font-title font-black px-4 py-1.5 rounded-full border-2 border-amber-950 shadow-lg text-sm uppercase tracking-wider flex items-center gap-1.5"
        >
          <Zap size={14} className="fill-amber-950" />
          <span>VS</span>
        </motion.div>
        <div className="text-[11px] font-title font-bold text-amber-900/70 bg-amber-100/80 px-2 py-0.5 rounded-md mt-1 border border-amber-900/20">
          Target: 31
        </div>
      </div>

      {/* Main Avatar Arena Container */}
      <div className="grid grid-cols-2 gap-4 items-center max-w-2xl mx-auto">
        {/* Left Side: Player Cow */}
        <div className="flex flex-col items-center relative">
          <CowAvatar
            name="You (Cow King)"
            emotion={playerEmotion}
            isCurrentTurn={isPlayerTurn}
            themeColor="#22c55e"
            spotColor="#0f172a"
            size={118}
            isLoser={loser === "player"}
            isWinner={winner === "player"}
          />

          {/* Player Speech Bubble */}
          <AnimatePresence>
            {speechBubble && speechBubble.speaker === "player" && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -top-10 left-4 max-w-[170px] bg-white text-slate-800 text-xs font-title font-bold px-3 py-1.5 rounded-xl border-2 border-slate-900 shadow-md z-30 pointer-events-none"
              >
                {speechBubble.text}
                <div className="absolute -bottom-2 left-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Player Score Pill */}
          <div className="flex items-center gap-1 mt-1 text-xs font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300">
            <Trophy size={12} />
            <span>{stats.playerWins} Wins</span>
          </div>
        </div>

        {/* Right Side: Opponent / AI Cow */}
        <div className="flex flex-col items-center relative">
          <CowAvatar
            name={opponentName}
            emotion={opponentEmotion}
            isCurrentTurn={isOpponentTurn}
            themeColor="#f59e0b"
            spotColor="#78350f"
            size={118}
            isLoser={loser === "ai" || loser === "player2"}
            isWinner={winner === "ai" || winner === "player2"}
          />

          {/* Opponent Speech Bubble */}
          <AnimatePresence>
            {speechBubble && speechBubble.speaker === "opponent" && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0, y: 10 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.5, opacity: 0 }}
                className="absolute -top-10 right-4 max-w-[180px] bg-amber-50 text-amber-950 text-xs font-title font-bold px-3 py-1.5 rounded-xl border-2 border-amber-950 shadow-md z-30 pointer-events-none"
              >
                {speechBubble.text}
                <div className="absolute -bottom-2 right-6 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-50" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Opponent Score Pill */}
          <div className="flex items-center gap-1 mt-1 text-xs font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full border border-amber-300">
            <Trophy size={12} />
            <span>{stats.opponentWins} Wins</span>
          </div>
        </div>
      </div>
    </div>
  );
}
