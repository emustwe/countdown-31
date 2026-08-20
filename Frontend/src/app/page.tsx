"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Play, Trophy, BookOpen, Shield, Sparkles, ChevronRight, Zap, Crown, Volume2, VolumeX } from "lucide-react";
import { PastureAmbiance } from "../components/dune/PastureAmbiance";
import { OfficialRulesModal } from "../components/dune/OfficialRulesModal";
import { soundManager } from "../lib/soundManager";
import { useSettingsStore } from "../stores/settings-store";

export default function RootLandingPage() {
  const router = useRouter();
  const [showRules, setShowRules] = useState(false);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const toggleSoundStore = useSettingsStore((s) => s.toggleSound);

  function handlePlayNow() {
    soundManager.playClick();
    router.push("/home");
  }

  function handleOpenRules() {
    soundManager.playClick();
    setShowRules(true);
  }

  function handleToggleSound() {
    toggleSoundStore();
    const next = !soundEnabled;
    soundManager.setMuted(!next);
    if (next) soundManager.playClick();
  }

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-b from-[#0e1c16] via-[#0b1812] to-[#06100c] text-white flex flex-col justify-between overflow-x-hidden select-none">
      {/* Background Pasture Ambiance & Sunbeams */}
      <PastureAmbiance />

      {/* Top Bar */}
      <header className="relative z-20 w-full max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-8 py-4">
        <div className="flex items-center gap-2.5">
          <span className="text-3xl sm:text-4xl drop-shadow">🐮</span>
          <div>
            <h1 className="font-title font-black text-xl sm:text-2xl text-amber-300 tracking-wider">
              COUNT DOWN 31
            </h1>
            <span className="text-[10px] sm:text-xs font-title font-semibold text-emerald-400 tracking-widest uppercase">
              Arcade Bovine Tournament
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleSound}
            className="w-10 h-10 rounded-full bg-black/60 border border-amber-400/50 flex items-center justify-center text-amber-300 hover:text-white cursor-pointer transition-transform hover:scale-105"
            title="Sound"
          >
            {soundEnabled ? <Volume2 size={18} className="text-emerald-400" /> : <VolumeX size={18} />}
          </button>

          <button
            onClick={handleOpenRules}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-black/60 border border-amber-400/50 text-amber-300 text-xs font-title font-bold hover:border-amber-300 hover:text-white transition-colors cursor-pointer"
          >
            <BookOpen size={15} />
            <span className="hidden sm:inline">Official Rules</span>
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-12 px-4 sm:px-8 py-6 my-auto">
        {/* Left: Barnaby Mascot 3D Presentation */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="relative flex flex-col items-center max-w-md text-center"
        >
          {/* Barnaby Character Card with Golden Bevel Frame */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-3xl overflow-hidden border-3 border-amber-400 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(245,158,11,0.4)] bg-gradient-to-b from-amber-950/80 to-slate-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/barnaby/barnaby-field.jpg"
              alt="Barnaby the Bovine Champion"
              className="w-full h-full object-cover object-center"
            />
            {/* Champion Ribbon */}
            <div className="absolute bottom-2 inset-x-3 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 text-amber-950 font-title font-black text-xs py-1 rounded-xl shadow-lg border border-white/60">
              MEET BARNABY · THE ARENA CHAMPION
            </div>
          </div>

          <p className="font-ui text-xs sm:text-sm text-amber-200/90 font-semibold mt-3 max-w-sm">
            &ldquo;Can you count your way through the pasture without landing on the lethal 31?&rdquo;
          </p>
        </motion.div>

        {/* Right: Game Title, CTAs & Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-lg"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-title font-bold mb-4 shadow">
            <Sparkles size={14} className="text-yellow-400" />
            <span>THE #1 BOVINE ARCADIA STRATEGY BATTLE</span>
          </div>

          <h2 className="font-title font-black text-4xl sm:text-5xl md:text-6xl text-white tracking-tight leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)] mb-3">
            DON&apos;T HIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500">31!</span>
          </h2>

          <p className="font-ui text-sm sm:text-base text-amber-100/85 font-medium leading-relaxed mb-6">
            Step 1, 2, or 3 numbers on the 3D rotating cylinder drum. Outsmart your opponents using modulo-3 math and tactical skills, and force them into the dizzy 31 defeat!
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto mb-8">
            <button
              onClick={handlePlayNow}
              className="btn-arcade-3d btn-arcade-green text-lg sm:text-xl py-4 px-10 rounded-2xl w-full sm:w-auto flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(34,197,94,0.5)] cursor-pointer hover:scale-105 active:scale-95 transition-transform"
            >
              <Play size={22} className="fill-white" />
              <span>ENTER ARENA / PLAY NOW</span>
            </button>

            <button
              onClick={handleOpenRules}
              className="btn-arcade-3d btn-arcade-amber text-base sm:text-lg py-3.5 px-6 rounded-2xl w-full sm:w-auto flex items-center justify-center gap-2 cursor-pointer hover:scale-105 transition-transform"
            >
              <BookOpen size={18} />
              <span>31 RULES</span>
            </button>
          </div>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 w-full">
            <div className="p-2.5 rounded-2xl bg-black/40 border border-amber-500/30 flex flex-col items-center lg:items-start text-left">
              <span className="text-lg mb-1">🎡</span>
              <span className="font-title font-black text-xs text-white">3D Cylinder</span>
              <span className="text-[10px] text-amber-200/70">Physical drum reel</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-black/40 border border-amber-500/30 flex flex-col items-center lg:items-start text-left">
              <span className="text-lg mb-1">⚡</span>
              <span className="font-title font-black text-xs text-white">Tactical Skills</span>
              <span className="text-[10px] text-amber-200/70">Rewind & Turbo</span>
            </div>

            <div className="p-2.5 rounded-2xl bg-black/40 border border-amber-500/30 flex flex-col items-center lg:items-start text-left col-span-2 sm:col-span-1">
              <span className="text-lg mb-1">🏆</span>
              <span className="font-title font-black text-xs text-white">Knockout</span>
              <span className="text-[10px] text-amber-200/70">Last standing wins</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between px-4 sm:px-8 py-3 border-t border-amber-500/20 text-[11px] font-title font-bold text-amber-300/70">
        <span>© 2026 Count Down 31 — WM Tournaments</span>
        <span>Play responsibly · 18+ · For entertainment</span>
      </footer>

      {/* Official 31 Rules Modal */}
      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
