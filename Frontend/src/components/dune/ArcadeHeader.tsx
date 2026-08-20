"use client";

import React from "react";
import { Menu, Volume2, VolumeX, Sparkles, Dices } from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { soundManager } from "../../lib/soundManager";
import { type GameMode } from "../../lib/hooks/useCountdownLive";

interface ArcadeHeaderProps {
  onMenuClick?: () => void;
  gameMode?: GameMode;
  onToggleMode?: (mode: GameMode) => void;
  showModeToggle?: boolean;
}

export function ArcadeHeader({
  onMenuClick,
  gameMode = "skills",
  onToggleMode,
  showModeToggle = false,
}: ArcadeHeaderProps) {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSoundStore = useSettingsStore((s) => s.toggleSound);

  // Only show the game mode selector if explicitly enabled or if onToggleMode is supplied
  const canToggle = showModeToggle || !!onToggleMode;

  function toggleSound() {
    toggleSoundStore();
    const next = !soundEnabled;
    soundManager.setMuted(!next);
    if (next) soundManager.playClick();
  }

  return (
    <header className="relative w-full flex items-start justify-between px-3 sm:px-8 pt-3 pb-2 z-30 select-none h-24 sm:h-28">
      {/* Left Menu Button & Optional Mode Selector Pill (Only in Arena) */}
      <div className="flex items-center gap-2.5 z-20 pt-1">
        <button
          onClick={() => {
            soundManager.playClick();
            onMenuClick?.();
          }}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#1f2b23] to-[#0a140e] border-2 border-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center text-amber-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          title="Menu"
          aria-label="Menu"
        >
          <Menu size={20} />
        </button>

        {/* Mode Selector Toggle Pill - ONLY rendered on Game Arena page */}
        {canToggle && (
          <div className="flex items-center bg-black/75 border border-amber-400/50 rounded-2xl p-1 shadow-lg backdrop-blur-md">
            <button
              onClick={() => {
                soundManager.playClick();
                onToggleMode?.("classic");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${
                gameMode === "classic"
                  ? "bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-102"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Dices size={14} />
              <span>CLASSIC</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onToggleMode?.("skills");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-title font-black transition-all cursor-pointer ${
                gameMode === "skills"
                  ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-[0_0_14px_rgba(168,85,247,0.8)] scale-102"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              <Sparkles size={14} className="text-yellow-300 fill-yellow-300 animate-pulse" />
              <span>SKILL MODE</span>
            </button>
          </div>
        )}
      </div>

      {/* Center 3D Marquee Banner: COUNT DOWN 31 (Absolute Dead Center on Screen) */}
      <div className="absolute left-1/2 -translate-x-1/2 top-2 flex flex-col items-center pointer-events-none z-10">
        <div className="pointer-events-auto relative flex items-center gap-2 bg-gradient-to-r from-amber-950 via-yellow-900 to-amber-950 px-6 sm:px-10 py-2 sm:py-2.5 rounded-2xl border-2 sm:border-3 border-amber-400 shadow-[0_8px_25px_rgba(0,0,0,0.8),0_0_25px_rgba(245,158,11,0.5),inset_0_1px_2px_rgba(255,255,255,0.5)]">
          {/* Decorative Corner Rivets */}
          <span className="absolute top-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute bottom-1 left-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />
          <span className="absolute bottom-1 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-200 border border-amber-900" />

          <h1 className="font-title font-black text-xl sm:text-3xl md:text-4xl tracking-wider text-white drop-shadow-[0_3px_6px_rgba(0,0,0,0.9)]">
            COUNT DOWN
          </h1>

          {/* 3D Golden "31" Shield Badge */}
          <div className="flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 border-white shadow-[0_4px_12px_rgba(245,158,11,0.9)] -mr-1">
            <span className="font-title font-black text-lg sm:text-2xl text-amber-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.6)]">
              31
            </span>
          </div>
        </div>

        {/* Subtitle Warning Pill - ONLY shown in Game Arena */}
        {canToggle && (
          <span className="mt-1.5 text-[10px] sm:text-xs font-title font-black tracking-widest text-amber-300 uppercase bg-black/80 px-3.5 py-0.5 rounded-full border border-amber-400/40 shadow pointer-events-auto">
            {gameMode === "skills" ? "⚡ Tactical Skills Activated!" : "🎲 Classic Pure Counting!"}
          </span>
        )}
      </div>

      {/* Right Sound Toggle Button with Golden Bezel */}
      <div className="flex items-center justify-end z-20 pt-1">
        <button
          onClick={toggleSound}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-b from-[#1f2b23] to-[#0a140e] border-2 border-amber-400 shadow-[0_4px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.4)] flex items-center justify-center text-amber-300 hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          title={soundEnabled ? "Mute sound" : "Enable sound"}
          aria-label="Sound Toggle"
        >
          {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} className="text-slate-400" />}
        </button>
      </div>
    </header>
  );
}
