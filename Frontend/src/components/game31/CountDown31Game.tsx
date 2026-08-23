"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useGameStore, GameMode, Difficulty } from "../../stores/game-store";
import { AvatarStage } from "./AvatarStage";
import { GameBoard } from "./GameBoard";
import { ActionButtons } from "./ActionButtons";
import { BackgroundCanvas } from "./BackgroundCanvas";
import { RulesModal31 } from "./RulesModal31";
import { useGameSound } from "../../hooks/useGameSound";
import {
  Volume2,
  VolumeX,
  HelpCircle,
  RotateCcw,
  Bot,
  Users,
  Sparkles,
  Trophy,
  Flame,
} from "lucide-react";

export function CountDown31Game() {
  const {
    gameMode,
    difficulty,
    gameStatus,
    screenShake,
    setGameMode,
    setDifficulty,
    startGame,
    resetGame,
    stats,
  } = useGameStore();

  const { isMuted, toggleMute, playClick, playMoo } = useGameSound();
  const [showRules, setShowRules] = useState(false);
  const [muted, setMuted] = useState(isMuted);

  const handleMuteToggle = () => {
    const next = toggleMute();
    setMuted(next);
  };

  const handleModeChange = (mode: GameMode) => {
    playClick();
    setGameMode(mode);
    startGame(mode, difficulty);
  };

  const handleDifficultyChange = (diff: Difficulty) => {
    playClick();
    setDifficulty(diff);
    startGame(gameMode, diff);
  };

  return (
    <div
      className={`min-h-screen w-full relative flex flex-col items-center justify-between p-3 sm:p-6 select-none ${
        screenShake ? "animate-screen-shake" : ""
      }`}
    >
      {/* Cartoon Background Canvas */}
      <BackgroundCanvas />

      {/* Rules Modal */}
      <RulesModal31 isOpen={showRules} onClose={() => setShowRules(false)} />

      {/* Main Content Layout */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center gap-4 z-10">
        {/* Top Navigation & Controls Header */}
        <header className="w-full flex flex-wrap items-center justify-between gap-3 bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border-3 border-amber-950/20 shadow-md">
          {/* Game Title with Cow Icon */}
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => {
              playMoo();
            }}
            title="Click for Cow Moo!"
          >
            <motion.span
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
              className="text-3xl filter drop-shadow"
            >
              🐮
            </motion.span>
            <div>
              <h1 className="font-title text-xl sm:text-2xl font-black text-amber-950 tracking-wide flex items-center gap-1.5 leading-none">
                <span>COUNT DOWN</span>
                <span className="text-red-600 bg-red-100 px-1.5 py-0.5 rounded-lg border border-red-300">
                  31
                </span>
              </h1>
              <span className="text-[10px] font-title font-bold text-amber-900/60 uppercase">
                Arcade Cow Battle
              </span>
            </div>
          </div>

          {/* Mode & Difficulty Badges */}
          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex bg-amber-100/90 p-1 rounded-xl border border-amber-900/20 text-xs font-title font-bold">
              <button
                onClick={() => handleModeChange("vs-ai")}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  gameMode === "vs-ai"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-amber-900/70 hover:text-amber-950"
                }`}
              >
                <Bot size={14} />
                <span>VS AI</span>
              </button>
              <button
                onClick={() => handleModeChange("pass-and-play")}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  gameMode === "pass-and-play"
                    ? "bg-amber-500 text-white shadow-sm"
                    : "text-amber-900/70 hover:text-amber-950"
                }`}
              >
                <Users size={14} />
                <span>2-PLAYER</span>
              </button>
            </div>

            {/* AI Difficulty Selector (only in vs-ai mode) */}
            {gameMode === "vs-ai" && (
              <div className="hidden sm:flex bg-amber-100/90 p-1 rounded-xl border border-amber-900/20 text-xs font-title font-bold">
                {(["easy", "normal", "master"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDifficultyChange(d)}
                    className={`px-2 py-1 rounded-lg capitalize transition-all ${
                      difficulty === d
                        ? "bg-amber-600 text-white shadow-sm"
                        : "text-amber-900/70 hover:text-amber-950"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            {/* Sound Toggle */}
            <button
              onClick={handleMuteToggle}
              className="p-2 rounded-xl bg-amber-100/90 text-amber-950 hover:bg-amber-200 border border-amber-900/20 transition-colors shadow-sm"
              title={muted ? "Unmute Sound" : "Mute Sound"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Rules Modal Button */}
            <button
              onClick={() => {
                playClick();
                setShowRules(true);
              }}
              className="p-2 rounded-xl bg-amber-100/90 text-amber-950 hover:bg-amber-200 border border-amber-900/20 transition-colors shadow-sm"
              title="How to Play"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {/* Cow Avatar Stage */}
        <AvatarStage />

        {/* 1-31 Counting Track Board */}
        <GameBoard />

        {/* Oversized Juicy 3D Action Buttons (+1, +2) */}
        <ActionButtons />
      </div>

      {/* Footer Info */}
      <footer className="w-full text-center text-xs font-title text-amber-950/60 mt-4 z-10">
        <span>Count Down 31 • Land on 31 to trigger the Dizzy Cow Spin! 🐮💫</span>
      </footer>
    </div>
  );
}
