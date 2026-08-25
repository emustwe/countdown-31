"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, RotateCcw, Shield, Moon, Check, X, ArrowRight } from "lucide-react";
import { type SkillType } from "../../lib/hooks/useCountdownLive";
import { soundManager } from "../../lib/soundManager";
import { useGameConfig } from "../../lib/hooks/useGameConfig";

interface SkillOption {
  type: SkillType;
  title: string;
  subtitle: string;
  badge: string;
  rarity: "Rare" | "Epic" | "Legendary";
  rarityColor: string;
  icon: React.ReactNode;
  description: string;
  gradient: string;
  borderGlow: string;
}

const ALL_SKILLS: SkillOption[] = [
  {
    type: "rewind",
    title: "Step Back",
    subtitle: "GO BACK 2",
    badge: "-2 STEPS",
    rarity: "Rare",
    rarityColor: "#22d3ee",
    icon: <RotateCcw size={24} className="text-cyan-300" />,
    description: "Move the count back by 2.",
    gradient: "bg-gradient-to-b from-[#082f49] via-[#031d30] to-[#020d17]",
    borderGlow: "border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]",
  },
  {
    type: "turbo",
    title: "Jump Ahead",
    subtitle: "GO FORWARD 3",
    badge: "+3 LEAP",
    rarity: "Epic",
    rarityColor: "#f59e0b",
    icon: <Zap size={24} className="text-amber-300 fill-amber-300" />,
    description: "Move the count forward by 3.",
    gradient: "bg-gradient-to-b from-[#451a03] via-[#290e02] to-[#130501]",
    borderGlow: "border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]",
  },
  {
    type: "shield",
    title: "Safety Shield",
    subtitle: "STAY SAFE",
    badge: "IMMUNITY",
    rarity: "Epic",
    rarityColor: "#c084fc",
    icon: <Shield size={24} className="text-purple-300 fill-purple-300" />,
    description: "Stay safe for one turn.",
    gradient: "bg-gradient-to-b from-[#3b0764] via-[#24033f] to-[#10011d]",
    borderGlow: "border-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.5)]",
  },
  {
    type: "nudge",
    title: "Skip Turn",
    subtitle: "TAKE A BREAK",
    badge: "SKIP TURN",
    rarity: "Legendary",
    rarityColor: "#34d399",
    icon: <Moon size={24} className="text-emerald-300 fill-emerald-300" />,
    description: "Pass your turn to the next player.",
    gradient: "bg-gradient-to-b from-[#064e3b] via-[#022c22] to-[#01140f]",
    borderGlow: "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)]",
  },
];

interface SkillLoadoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (chosenSkills: SkillType[]) => void;
}

export function SkillLoadoutModal({ isOpen, onClose, onConfirm }: SkillLoadoutModalProps) {
  const { data: config } = useGameConfig();
  const visibleSkills = useMemo(
    () =>
      config.skills
        .filter((skill) => skill.enabled)
        .sort((a, b) => a.order - b.order)
        .map((skill) => {
          const base = ALL_SKILLS.find((item) => item.type === skill.id) ?? ALL_SKILLS[0]!;
          return {
            ...base,
            title: skill.name,
            badge: skill.shortLabel,
            description: skill.description,
            rarityColor: skill.color,
          };
        }),
    [config.skills],
  );
  const [selected, setSelected] = useState<SkillType[]>(["rewind", "turbo"]);

  useEffect(() => {
    const available = visibleSkills.map((skill) => skill.type);
    setSelected((current) => {
      const valid = current.filter((skill) => available.includes(skill));
      return [...valid, ...available.filter((skill) => !valid.includes(skill))].slice(0, 2);
    });
  }, [visibleSkills]);

  if (!isOpen) return null;

  function toggleSkill(skill: SkillType) {
    soundManager.playCardSelect();
    if (selected.includes(skill)) {
      setSelected(selected.filter((s) => s !== skill));
    } else {
      if (selected.length < 2) {
        setSelected([...selected, skill]);
      } else {
        // Replace oldest
        setSelected([selected[1]!, skill]);
      }
    }
  }

  function handleStart() {
    // You may enter with NO skills, one, or up to two (selection is capped at 2 above).
    if (selected.length > 2) return;
    soundManager.playConfirm();
    onConfirm(selected);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[160] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md select-none"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative max-w-2xl w-full bg-gradient-to-b from-[#132019] via-[#0a1410] to-[#050b08] p-5 sm:p-7 rounded-3xl border-3 border-amber-400/80 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300 shadow">
                <Sparkles size={20} className="fill-yellow-400 text-yellow-400 animate-pulse" />
              </div>
              <div>
                <h2 className="font-title font-black text-lg sm:text-xl text-amber-300 tracking-wide">
                  PICK UP TO 2 SKILLS
                </h2>
                <p className="text-xs text-slate-400">Tap up to two cards — or none — then start.</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 text-slate-400 hover:text-white border border-slate-700"
            >
              <X size={18} />
            </button>
          </div>

          {/* Selection Counter Pill */}
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-title font-bold text-slate-300">Your picks</span>
            <span
              className={`text-xs font-title font-black px-3 py-1 rounded-full border shadow ${
                selected.length === 2
                  ? "bg-emerald-500 text-slate-950 border-emerald-300"
                  : "bg-amber-950/80 text-amber-300 border-amber-400"
              }`}
            >
              {selected.length} of 2 picked
            </span>
          </div>

          {/* 4 Skill Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {visibleSkills.map((skill) => {
              const isChosen = selected.includes(skill.type);
              return (
                <div
                  key={skill.type}
                  onClick={() => toggleSkill(skill.type)}
                  data-sound="none"
                  className={`relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between select-none ${
                    skill.gradient
                  } ${
                    isChosen
                      ? `${skill.borderGlow} scale-[1.02]`
                      : "border-slate-800 opacity-60 hover:opacity-90"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-xl bg-black/50 border border-white/10">
                        {skill.icon}
                      </div>
                      <div>
                        <h3 className="font-title font-black text-sm text-white">{skill.title}</h3>
                        <span
                          className="text-[9px] font-title font-bold uppercase tracking-wider"
                          style={{ color: skill.rarityColor }}
                        >
                          {skill.subtitle}
                        </span>
                      </div>
                    </div>

                    {isChosen ? (
                      <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shadow">
                        <Check size={14} />
                      </span>
                    ) : (
                      <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700" />
                    )}
                  </div>

                  <p className="text-[11px] text-slate-300/90 leading-snug">{skill.description}</p>
                </div>
              );
            })}
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleStart}
            data-sound="none"
            disabled={selected.length > 2}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-slate-950 font-title font-black text-base shadow-[0_0_25px_rgba(52,211,153,0.8)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed"
          >
            <span>START GAME</span>
            <ArrowRight size={18} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
