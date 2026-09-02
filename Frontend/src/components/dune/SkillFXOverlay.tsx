"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Zap, Shield, Moon, Sparkles } from "lucide-react";
import { type SkillType } from "../../lib/hooks/useCountdownLive";

interface SkillFXOverlayProps {
  lastSkillUsed?: {
    skill: SkillType;
    userName: string;
    description: string;
  } | null;
}

export function SkillFXOverlay({ lastSkillUsed }: SkillFXOverlayProps) {
  const [activeSkill, setActiveSkill] = useState<{
    skill: SkillType;
    userName: string;
    description: string;
    id: number;
  } | null>(null);

  // The socket re-broadcasts the same `lastSkillUsed` on every state tick, so keying the effect on the
  // object reference re-armed the 2.4s timer forever and the banner never left. Key on the CONTENT
  // signature instead → it fires once per genuinely-new skill use and then clears cleanly.
  const lastSigRef = useRef<string | null>(null);
  useEffect(() => {
    // The engine clears `lastSkillUsed` once the next player moves (or the game ends) → drop the
    // banner immediately then, so it never lingers into the next turn or onto the winner screen.
    if (!lastSkillUsed) {
      setActiveSkill(null);
      lastSigRef.current = null;
      return;
    }
    const sig = `${lastSkillUsed.skill}|${lastSkillUsed.userName}|${lastSkillUsed.description}`;
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;
    setActiveSkill({ ...lastSkillUsed, id: Date.now() });
    // Fallback cap so it always clears even if the engine never nulls it.
    const timer = setTimeout(() => setActiveSkill(null), 5000);
    return () => clearTimeout(timer);
  }, [lastSkillUsed]);

  if (!activeSkill) return null;

  const isRewind = activeSkill.skill === "rewind";
  const isTurbo = activeSkill.skill === "turbo";
  const isShield = activeSkill.skill === "shield";
  const isSnooze = activeSkill.skill === "nudge" || activeSkill.skill === "double";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-[120] overflow-hidden select-none flex flex-col items-center justify-center">
        {/* ========================================================= */}
        {/* 1. CHROMATIC SCREEN WARP PULSE                            */}
        {/* ========================================================= */}
        <motion.div
          key={`screen-flash-${activeSkill.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.6, 0] }}
          transition={{ duration: 0.65, ease: "easeOut" }}
          className={`absolute inset-0 ${
            isRewind
              ? "bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.35)_0%,transparent_75%)]"
              : isTurbo
                ? "bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.4)_0%,transparent_75%)]"
                : isShield
                  ? "bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.35)_0%,transparent_75%)]"
                  : "bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.35)_0%,transparent_75%)]"
          }`}
        />

        {/* ========================================================= */}
        {/* 2. CHRONO REWIND: HOLOGRAPHIC SPINNING CLOCK & TIME WARP  */}
        {/* ========================================================= */}
        {isRewind && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Spinning Neon Time Vortex */}
            <motion.div
              initial={{ rotate: 0, scale: 0.4, opacity: 0 }}
              animate={{ rotate: -720, scale: [0.4, 1.4, 1.1], opacity: [0, 0.9, 0] }}
              transition={{ duration: 2.0, ease: "easeOut" }}
              className="relative w-[340px] sm:w-[460px] h-[340px] sm:h-[460px] rounded-full border-4 border-dashed border-amber-400 shadow-[0_0_60px_#f59e0b,inset_0_0_40px_#f59e0b] flex items-center justify-center"
            >
              {/* Spinning Clock Hand */}
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: -1440 }}
                transition={{ duration: 2.0, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 w-32 h-2 bg-gradient-to-r from-amber-300 to-transparent -translate-x-1/2 -translate-y-1/2 origin-left rounded-full shadow-[0_0_20px_#fef08a]"
              />
              <div className="w-16 h-16 rounded-full bg-amber-400/30 border-2 border-amber-300 flex items-center justify-center shadow-[0_0_30px_#f59e0b]">
                <RotateCcw size={36} className="text-amber-200" />
              </div>
            </motion.div>

            {/* Flying "-2 STEPS" Time Shockwave Burst */}
            <motion.div
              initial={{ scale: 0.3, y: 30, opacity: 0 }}
              animate={{ scale: [0.3, 1.4, 1], y: [30, -20, -10], opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute flex items-center gap-2 px-6 py-2 rounded-2xl bg-black/80 border-2 border-amber-400 shadow-[0_0_40px_#f59e0b]"
            >
              <RotateCcw size={28} className="text-amber-300 animate-spin" />
              <span className="font-title font-black text-3xl sm:text-4xl text-amber-300 tracking-wider drop-shadow">
                -2 STEPS REWIND
              </span>
            </motion.div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. TURBO LEAP: ELECTRIC LIGHTNING BOLTS & PLASMA BURST    */}
        {/* ========================================================= */}
        {isTurbo && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Pulsing Lightning Ring Wave */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: [0.2, 1.5, 1.8], opacity: [0, 1, 0] }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute w-[360px] sm:w-[500px] h-[360px] sm:h-[500px] rounded-full border-4 border-cyan-400 shadow-[0_0_80px_#22d3ee,inset_0_0_60px_#06b6d4]"
            />

            {/* Cracking Lightning SVG overlay */}
            <motion.svg
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: [0, 1, 0.4, 1, 0], scale: [0.8, 1.2, 1.1] }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="absolute w-full h-full text-cyan-300 drop-shadow-[0_0_25px_#22d3ee]"
              viewBox="0 0 800 400"
              fill="none"
            >
              <path
                d="M 120 200 L 260 140 L 380 230 L 490 120 L 620 220 L 740 160"
                stroke="url(#lightning-grad)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 160 220 L 280 180 L 410 260 L 530 160 L 680 210"
                stroke="#a5f3fc"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="lightning-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="50%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
            </motion.svg>

            {/* Flying "⚡ +3 LEAP" Surge Banner */}
            <motion.div
              initial={{ scale: 0.3, y: 30, opacity: 0 }}
              animate={{ scale: [0.3, 1.4, 1], y: [30, -20, -10], opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute flex items-center gap-2 px-6 py-2 rounded-2xl bg-black/80 border-2 border-cyan-400 shadow-[0_0_50px_#22d3ee]"
            >
              <Zap size={32} className="text-cyan-300 fill-cyan-300 animate-bounce" />
              <span className="font-title font-black text-3xl sm:text-4xl text-cyan-300 tracking-wider drop-shadow">
                +3 LEAP SURGE!
              </span>
            </motion.div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. BOVINE BARRIER: 3D CRYSTAL HEXAGON SHIELD DOME         */}
        {/* ========================================================= */}
        {isShield && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {/* Hexagon Forcefield Expanding */}
            <motion.div
              initial={{ scale: 0.3, rotate: 0, opacity: 0 }}
              animate={{ scale: [0.3, 1.3, 1.1], rotate: 180, opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute w-[360px] sm:w-[480px] h-[360px] sm:h-[480px] rounded-3xl border-6 border-emerald-400 shadow-[0_0_90px_#10b981,inset_0_0_60px_#34d399] bg-emerald-500/10 backdrop-blur-xs rotate-45"
            />

            {/* Flying "🛡️ DIVINE SHIELD" Banner */}
            <motion.div
              initial={{ scale: 0.3, y: 30, opacity: 0 }}
              animate={{ scale: [0.3, 1.4, 1], y: [30, -20, -10], opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute flex items-center gap-2 px-6 py-2 rounded-2xl bg-black/80 border-2 border-emerald-400 shadow-[0_0_50px_#10b981]"
            >
              <Shield size={30} className="text-emerald-300 fill-emerald-300" />
              <span className="font-title font-black text-3xl sm:text-4xl text-emerald-300 tracking-wider drop-shadow">
                DIVINE SHIELD ACTIVE!
              </span>
            </motion.div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. PASTURE SNOOZE: CELESTIAL DREAM AURORA & STARS         */}
        {/* ========================================================= */}
        {isSnooze && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: [0.5, 1.4, 1.1], opacity: [0, 0.85, 0] }}
              transition={{ duration: 1.9, ease: "easeOut" }}
              className="absolute w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,#c084fc_0%,#581c87_60%,transparent_75%)] blur-lg"
            />

            {/* Floating Stars & Dream Pass Banner */}
            <motion.div
              initial={{ scale: 0.3, y: 30, opacity: 0 }}
              animate={{ scale: [0.3, 1.4, 1], y: [30, -20, -10], opacity: [0, 1, 0] }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute flex items-center gap-2 px-6 py-2 rounded-2xl bg-black/80 border-2 border-purple-400 shadow-[0_0_50px_#a855f7]"
            >
              <Moon size={30} className="text-purple-300 fill-purple-300 animate-pulse" />
              <span className="font-title font-black text-3xl sm:text-4xl text-purple-300 tracking-wider drop-shadow">
                DREAM TURN PASS!
              </span>
            </motion.div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. TOP FLOATING ARCADE SKILL BANNER PILL                  */}
        {/* ========================================================= */}
        <motion.div
          key={`ribbon-${activeSkill.id}`}
          initial={{ y: -60, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -40, opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="absolute left-1/2 -translate-x-1/2 top-16 sm:top-36 z-30 px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full border-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md flex items-center gap-2 sm:gap-2.5 max-w-[92vw]"
          style={{
            background: isRewind
              ? "linear-gradient(90deg, rgba(40,20,5,0.95), rgba(20,10,2,0.98))"
              : isTurbo
                ? "linear-gradient(90deg, rgba(6,30,45,0.95), rgba(2,15,25,0.98))"
                : isShield
                  ? "linear-gradient(90deg, rgba(6,40,25,0.95), rgba(2,20,12,0.98))"
                  : "linear-gradient(90deg, rgba(35,10,50,0.95), rgba(18,5,30,0.98))",
            borderColor: isRewind
              ? "#f59e0b"
              : isTurbo
                ? "#06b6d4"
                : isShield
                  ? "#10b981"
                  : "#a855f7",
          }}
        >
          <div className="p-1 rounded-full bg-white/10">
            {isRewind && <RotateCcw size={15} className="text-amber-300" />}
            {isTurbo && <Zap size={15} className="text-cyan-300 fill-cyan-300" />}
            {isShield && <Shield size={15} className="text-emerald-300 fill-emerald-300" />}
            {isSnooze && <Moon size={15} className="text-purple-300 fill-purple-300" />}
          </div>
          <span className="font-title font-black text-xs sm:text-sm text-white tracking-wide">
            <b className="text-amber-300">{activeSkill.userName}</b>: {activeSkill.description}
          </span>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
