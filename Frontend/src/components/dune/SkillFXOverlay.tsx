"use client";

import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    if (lastSkillUsed) {
      setActiveSkill({
        ...lastSkillUsed,
        id: Date.now(),
      });

      const timer = setTimeout(() => {
        setActiveSkill(null);
      }, 2600);

      return () => clearTimeout(timer);
    }
  }, [lastSkillUsed]);

  if (!activeSkill) return null;

  const isRewind = activeSkill.skill === "rewind";
  const isTurbo = activeSkill.skill === "turbo";
  const isShield = activeSkill.skill === "shield";
  const isSnooze = activeSkill.skill === "nudge" || activeSkill.skill === "double";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center select-none">
        {/* 1. Chromatic Edge Shockwave Flash */}
        <motion.div
          key={`flash-${activeSkill.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.7, 0] }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`absolute inset-0 ${
            isRewind
              ? "bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.4)_0%,transparent_80%)]"
              : isTurbo
                ? "bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.45)_0%,transparent_80%)]"
                : isShield
                  ? "bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.45)_0%,transparent_80%)]"
                  : "bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.45)_0%,transparent_80%)]"
          }`}
        />

        {/* 2. Full-Screen Energy Shockwaves */}
        {isTurbo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 0], scale: [0.8, 1.4] }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="w-[800px] h-[800px] rounded-full border-4 border-cyan-400/80 shadow-[0_0_80px_#22d3ee,inset_0_0_80px_#06b6d4] animate-ping" />
            <div className="absolute w-[600px] h-[600px] rounded-full border-2 border-indigo-400/60 shadow-[0_0_60px_#818cf8]" />
          </motion.div>
        )}

        {isRewind && (
          <motion.div
            initial={{ rotate: 0, scale: 0.5, opacity: 0 }}
            animate={{ rotate: -360, scale: 1.3, opacity: [0, 0.9, 0] }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
            className="absolute w-[650px] h-[650px] rounded-full border-4 border-dashed border-amber-400/70 shadow-[0_0_70px_#f59e0b,inset_0_0_50px_#f59e0b]"
          />
        )}

        {isShield && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.2, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="absolute w-[700px] h-[700px] rounded-3xl border-8 border-emerald-400/80 shadow-[0_0_100px_#10b981,inset_0_0_80px_#34d399] rotate-45"
          />
        )}

        {isSnooze && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: [0.6, 1.3, 0.9], opacity: [0, 0.85, 0] }}
            transition={{ duration: 1.8, ease: "easeOut" }}
            className="absolute w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,#c084fc_0%,#3b0764_50%,transparent_75%)] blur-md"
          />
        )}

        {/* 3. Center Hero 3D Skill Crest Surge */}
        <motion.div
          key={`crest-${activeSkill.id}`}
          initial={{ scale: 0.2, y: 60, opacity: 0 }}
          animate={{ scale: [0.2, 1.2, 1], y: 0, opacity: 1 }}
          exit={{ scale: 0.8, y: -40, opacity: 0 }}
          transition={{ duration: 0.45, type: "spring", stiffness: 350, damping: 20 }}
          className="relative z-20 flex flex-col items-center gap-3 p-6 sm:p-8 rounded-3xl backdrop-blur-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9)] border-2 max-w-sm sm:max-w-md mx-4 text-center"
          style={{
            background: isRewind
              ? "linear-gradient(135deg, rgba(35, 20, 5, 0.95), rgba(15, 10, 5, 0.98))"
              : isTurbo
                ? "linear-gradient(135deg, rgba(6, 30, 45, 0.95), rgba(3, 15, 25, 0.98))"
                : isShield
                  ? "linear-gradient(135deg, rgba(6, 40, 25, 0.95), rgba(3, 20, 12, 0.98))"
                  : "linear-gradient(135deg, rgba(30, 10, 45, 0.95), rgba(15, 5, 25, 0.98))",
            borderColor: isRewind
              ? "rgba(245, 158, 11, 0.9)"
              : isTurbo
                ? "rgba(6, 182, 212, 0.9)"
                : isShield
                  ? "rgba(52, 211, 153, 0.9)"
                  : "rgba(168, 85, 247, 0.9)",
          }}
        >
          {/* Floating Skill 3D Icon Badge */}
          <motion.div
            animate={{
              rotate: isRewind ? [-10, 10, -10] : [0, 5, -5, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl flex items-center justify-center shadow-2xl border-2 ${
              isRewind
                ? "bg-gradient-to-br from-amber-400 to-yellow-600 border-amber-200 text-slate-950 shadow-[0_0_35px_#f59e0b]"
                : isTurbo
                  ? "bg-gradient-to-br from-cyan-400 to-blue-600 border-cyan-200 text-slate-950 shadow-[0_0_35px_#06b6d4]"
                  : isShield
                    ? "bg-gradient-to-br from-emerald-400 to-green-600 border-emerald-200 text-slate-950 shadow-[0_0_35px_#10b981]"
                    : "bg-gradient-to-br from-purple-400 to-indigo-600 border-purple-200 text-white shadow-[0_0_35px_#a855f7]"
            }`}
          >
            {isRewind && <RotateCcw size={48} className="animate-spin-slow" />}
            {isTurbo && <Zap size={50} className="fill-current animate-bounce" />}
            {isShield && <Shield size={50} className="fill-current" />}
            {isSnooze && <Moon size={48} className="fill-current animate-pulse" />}
          </motion.div>

          {/* Skill Title & User Tag */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-title font-black uppercase tracking-widest px-3 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/15">
              TACTICAL SKILL ACTIVATED
            </span>
            <h3
              className={`font-title font-black text-2xl sm:text-3xl tracking-wide uppercase drop-shadow ${
                isRewind
                  ? "text-amber-300"
                  : isTurbo
                    ? "text-cyan-300"
                    : isShield
                      ? "text-emerald-300"
                      : "text-purple-300"
              }`}
            >
              {isRewind && "CHRONO REWIND"}
              {isTurbo && "TURBO LEAP SURGE"}
              {isShield && "BOVINE BARRIER"}
              {isSnooze && "PASTURE SNOOZE"}
            </h3>
            <p className="font-title font-bold text-xs sm:text-sm text-slate-200">
              <b className="text-white font-black">{activeSkill.userName}</b> {activeSkill.description}
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
