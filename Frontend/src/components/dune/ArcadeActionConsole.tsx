"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Zap, RotateCcw, Shield, Moon, Sparkles, Lock, Send } from "lucide-react";
import { type SkillType } from "../../lib/hooks/useCountdownLive";
import { soundManager } from "../../lib/soundManager";

interface SkillCardDefinition {
  type: SkillType;
  title: string;
  subtitle: string;
  rarity: "Rare" | "Epic" | "Legendary";
  rarityColor: string;
  borderGlow: string;
  cardGradient: string;
  icon: React.ReactNode;
  description: string;
  badge: string;
}

const SKILL_DATABASE: Record<SkillType, SkillCardDefinition> = {
  rewind: {
    type: "rewind",
    title: "Step Back",
    subtitle: "GO BACK 2",
    rarity: "Rare",
    rarityColor: "#22d3ee",
    borderGlow: "border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)]",
    cardGradient: "bg-gradient-to-b from-[#082f49]/95 via-[#031d30]/98 to-[#020d17]",
    icon: <RotateCcw size={28} className="text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />,
    description: "Move the count back by 2.",
    badge: "-2 STEPS",
  },
  turbo: {
    type: "turbo",
    title: "Jump Ahead",
    subtitle: "GO FORWARD 3",
    rarity: "Epic",
    rarityColor: "#f59e0b",
    borderGlow: "border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.5)]",
    cardGradient: "bg-gradient-to-b from-[#451a03]/95 via-[#290e02]/98 to-[#130501]",
    icon: <Zap size={28} className="text-amber-300 fill-amber-300 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse" />,
    description: "Move the count forward by 3.",
    badge: "+3 LEAP",
  },
  shield: {
    type: "shield",
    title: "Safety Shield",
    subtitle: "STAY SAFE",
    rarity: "Epic",
    rarityColor: "#c084fc",
    borderGlow: "border-purple-400 shadow-[0_0_25px_rgba(192,132,252,0.5)]",
    cardGradient: "bg-gradient-to-b from-[#3b0764]/95 via-[#24033f]/98 to-[#10011d]",
    icon: <Shield size={28} className="text-purple-300 fill-purple-300 drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]" />,
    description: "Stay safe for one turn.",
    badge: "IMMUNITY",
  },
  nudge: {
    type: "nudge",
    title: "Skip Turn",
    subtitle: "TAKE A BREAK",
    rarity: "Legendary",
    rarityColor: "#34d399",
    borderGlow: "border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.5)]",
    cardGradient: "bg-gradient-to-b from-[#064e3b]/95 via-[#022c22]/98 to-[#01140f]",
    icon: <Moon size={28} className="text-emerald-300 fill-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.8)]" />,
    description: "Pass your turn to the next player.",
    badge: "SKIP TURN",
  },
  double: {
    type: "double",
    title: "Double Trouble",
    subtitle: "FORCE 2 CARDS",
    rarity: "Epic",
    rarityColor: "#f43f5e",
    borderGlow: "border-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.5)]",
    cardGradient: "bg-gradient-to-b from-[#4c0519]/95 via-[#2f0310]/98 to-[#140106]",
    icon: <Zap size={28} className="text-rose-300 fill-rose-300 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]" />,
    description: "Forces next player to pick at least 2 cards!",
    badge: "FORCE +2",
  },
};

interface ArcadeActionConsoleProps {
  myTurn: boolean;
  remainingSeconds: number;
  timerRunning: boolean;
  onSkill: (skill: SkillType) => void;
  skills: Record<SkillType, number>;
  equippedSkills?: SkillType[];
  count: number;
}

export function ArcadeActionConsole({
  myTurn,
  remainingSeconds,
  timerRunning,
  onSkill,
  skills,
  equippedSkills = ["rewind", "turbo"],
  count,
}: ArcadeActionConsoleProps) {
  const [thrownSkill, setThrownSkill] = useState<SkillType | null>(null);

  const isLowTime = remainingSeconds <= 2 && timerRunning;
  const isSkillsLocked = count >= 22; // Sudden Death: Skills locked at 22+

  const activeDeck = (equippedSkills.length > 0 ? equippedSkills : (["rewind", "turbo"] as SkillType[]))
    .map((sk) => SKILL_DATABASE[sk] ?? SKILL_DATABASE.rewind);

  function handlePlayCard(skill: SkillType) {
    if (!myTurn || isSkillsLocked || (skills[skill] ?? 0) <= 0) return;
    soundManager.playClick();
    setThrownSkill(skill);
    setTimeout(() => {
      onSkill(skill);
      setThrownSkill(null);
    }, 450);
  }

  return (
    <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center bg-gradient-to-b from-[#132019]/90 via-[#0a1410]/95 to-[#050b08]/98 backdrop-blur-xl border-2 border-amber-500/40 rounded-3xl p-3 sm:p-4 shadow-[0_15px_35px_rgba(0,0,0,0.8)] select-none">
      {/* Universal Turn Header Bar */}
      <div className="w-full flex items-center justify-between bg-black/60 border border-amber-500/30 rounded-2xl px-4 py-2 mb-3 shadow-inner flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {myTurn ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-400/60 px-3 py-1 rounded-full">
              <Zap size={15} className="text-yellow-400 fill-yellow-400 animate-bounce" />
              <span className="font-title font-black text-xs sm:text-sm text-emerald-300 tracking-wider uppercase">
                YOUR TURN · PICK 1, 2, OR 3
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
              <span className="font-title font-bold text-xs sm:text-sm text-slate-300 tracking-wide uppercase">
                OPPONENT TURN...
              </span>
            </div>
          )}

          {isSkillsLocked && (
            <span className="text-[11px] font-title font-black text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-500/50 flex items-center gap-1">
              <Lock size={12} />
              <span>SKILLS PAUSE AT 22</span>
            </span>
          )}
        </div>

        {/* Turn Countdown Timer Pill */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-title font-black text-xs sm:text-sm border transition-colors ${
            isLowTime
              ? "bg-rose-950/90 text-rose-300 border-rose-500 animate-bounce shadow-[0_0_12px_rgba(239,68,68,0.7)]"
              : "bg-amber-950/70 text-amber-300 border-amber-400/50"
          }`}
        >
          <Clock size={14} className={isLowTime ? "text-rose-400" : "text-amber-400"} />
          <span>{timerRunning ? `${remainingSeconds}s TURN TIMER` : "7s"}</span>
        </div>
      </div>

      {/* Section Sub-Title */}
      <div className="w-full flex items-center justify-between px-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={16} className="text-yellow-400 fill-yellow-400 animate-pulse" />
          <span className="text-xs sm:text-sm font-title font-black text-amber-300 uppercase tracking-widest">
            YOUR SKILLS
          </span>
        </div>
        <span className="text-[11px] font-title font-bold text-slate-400">
          Tap a card to use it
        </span>
      </div>

      {/* 2 Big Collectible Tactical Skill Cards Hand */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl">
        {activeDeck.map((card) => {
          const available = (skills[card.type] ?? 0) > 0;
          const canPlay = myTurn && !isSkillsLocked && available;
          const isBeingThrown = thrownSkill === card.type;

          return (
            <motion.div
              key={card.type}
              animate={
                isBeingThrown
                  ? { y: -80, opacity: 0, scale: 1.15, rotate: -5 }
                  : { y: 0, opacity: 1, scale: 1, rotate: 0 }
              }
              transition={{ duration: 0.4, ease: "easeOut" }}
              whileHover={canPlay ? { y: -6, scale: 1.02 } : {}}
              onClick={() => canPlay && handlePlayCard(card.type)}
              className={`relative rounded-3xl p-3.5 sm:p-4 flex flex-col justify-between border-2 transition-all select-none min-h-[190px] sm:min-h-[210px] ${
                card.cardGradient
              } ${
                canPlay
                  ? `${card.borderGlow} cursor-pointer hover:brightness-110 shadow-2xl`
                  : "border-slate-800 opacity-50 grayscale cursor-not-allowed"
              }`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[9px] font-title font-black px-2 py-0.5 rounded-full uppercase tracking-wider text-slate-950 shadow"
                  style={{ backgroundColor: card.rarityColor }}
                >
                  {card.rarity}
                </span>

                <span className="text-[10px] font-title font-black text-amber-300 bg-black/60 px-2 py-0.5 rounded-lg border border-amber-400/40">
                  {card.badge}
                </span>
              </div>

              {/* Center Art Box */}
              <div className="w-full h-16 sm:h-20 rounded-2xl bg-black/50 border border-white/10 flex flex-col items-center justify-center relative overflow-hidden my-1 shadow-inner">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
                <div className="relative z-10">{card.icon}</div>
              </div>

              {/* Title & Subtitle */}
              <div className="flex flex-col text-center mt-1">
                <span className="font-title font-black text-sm sm:text-base text-white truncate drop-shadow">
                  {card.title}
                </span>
                <span
                  className="text-[9px] font-title font-bold uppercase tracking-wider"
                  style={{ color: card.rarityColor }}
                >
                  {card.subtitle}
                </span>
              </div>

              {/* Description */}
              <p className="text-[10px] text-slate-300/90 leading-snug line-clamp-2 text-center my-1">
                {card.description}
              </p>

              {/* Action Button */}
              <div className="mt-1 pt-1.5 border-t border-white/10 flex justify-center">
                {isSkillsLocked ? (
                  <span className="text-[10px] font-title font-black text-slate-400 flex items-center gap-1">
                    <Lock size={11} />
                    <span>LOCKED (22+)</span>
                  </span>
                ) : !available ? (
                  <span className="text-[10px] font-title font-black text-slate-500">
                    EXHAUSTED
                  </span>
                ) : (
                  <button
                    disabled={!canPlay}
                    className={`w-full py-1.5 rounded-xl font-title font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                      canPlay
                        ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 cursor-pointer"
                        : "bg-slate-900 text-slate-500"
                    }`}
                  >
                    <span>USE SKILL</span>
                    <Send size={11} />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
