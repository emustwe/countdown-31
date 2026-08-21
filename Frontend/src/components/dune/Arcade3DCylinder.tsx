"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Skull, Star, Zap, CheckCircle2, Send } from "lucide-react";
import { type LastMoveInfo, type SkillType } from "../../lib/hooks/useCountdownLive";
import { soundManager } from "../../lib/soundManager";

interface Arcade3DCylinderProps {
  currentCount: number;
  myTurn: boolean;
  selectedCards: number[];
  onToggleCard: (num: number) => void;
  onConfirmMove: () => void;
  status: "waiting" | "playing" | "over";
  lastMove?: LastMoveInfo | null;
  lastSkillUsed?: {
    skill: SkillType;
    userName: string;
    description: string;
  } | null;
  taken?: Record<number, string>;
  forbiddenK?: number | null;
}

const TARGET = 31;
const SLOTS_LEFT = 4;
const SLOTS_RIGHT = 4;

function calculateSlotNumber(currentCount: number, offset: number): number {
  if (currentCount === 0) {
    if (offset <= 0) {
      // Prior to start: 0, 31, 30, 29...
      const n = TARGET + offset;
      return n <= 0 ? TARGET : n;
    }
    return ((offset - 1) % TARGET) + 1;
  }

  const raw = currentCount + offset;
  if (raw <= 0) return TARGET + ((raw % TARGET) || -TARGET) + 1;
  return ((raw - 1) % TARGET) + 1;
}

export function Arcade3DCylinder({
  currentCount,
  myTurn,
  selectedCards,
  onToggleCard,
  onConfirmMove,
  status,
  lastMove,
  lastSkillUsed,
  taken = {},
  forbiddenK,
}: Arcade3DCylinderProps) {
  // Generate list of visible slot offsets around current count: -4, -3, -2, -1, 0, 1, 2, 3, 4
  const visibleOffsets = useMemo(() => {
    const offsets: number[] = [];
    for (let i = -SLOTS_LEFT; i <= SLOTS_RIGHT; i++) {
      offsets.push(i);
    }
    return offsets;
  }, []);

  const isLethal31 = currentCount === TARGET;
  const isDangerZone = currentCount >= 28 && currentCount < TARGET;

  const lastPicks = lastMove?.picks ?? [];
  const lastCount = lastMove?.count ?? 1;

  const baseCenterX = "50%"; // Exact 50% Dead Center of the drum machine container!

  return (
    <div className="relative w-full max-w-5xl mx-auto my-1 select-none flex flex-col items-center gap-2">
      {/* Tactical Skill Event Combat Banner */}
      {lastSkillUsed && (
        <div className="flex items-center justify-center animate-fadeIn">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-950/90 via-black/90 to-amber-950/90 border-2 border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.5)] text-xs sm:text-sm font-title font-black text-amber-200">
            <Zap size={15} className="text-yellow-400 fill-yellow-400 animate-pulse" />
            <span className="text-white font-bold">{lastSkillUsed.userName}</span>
            <span className="text-amber-300 font-semibold">{lastSkillUsed.description}</span>
          </div>
        </div>
      )}

      {/* Physical 3D Machine Housing */}
      <div className="relative w-full h-[215px] sm:h-[245px] md:h-[265px] rounded-3xl overflow-hidden bg-gradient-to-b from-[#0e1612] via-[#09100c] to-[#040806] border-2 border-amber-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center">
        {/* Background Radial Glow */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
            isLethal31
              ? "bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.35)_0%,transparent_70%)]"
              : isDangerZone
                ? "bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.25)_0%,transparent_70%)]"
                : "bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.18)_0%,transparent_70%)]"
          }`}
        />

        {/* Top Heavy Brass Rim with Rivets */}
        <div className="absolute top-0 inset-x-0 h-6 sm:h-7 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-b border-amber-300/60 shadow-md flex items-center justify-around px-4 z-30 pointer-events-none">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-br from-amber-200 to-amber-900 border border-amber-950/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]"
            />
          ))}
        </div>

        {/* Bottom Heavy Brass Rim with Rivets */}
        <div className="absolute bottom-0 inset-x-0 h-6 sm:h-7 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-t border-amber-300/60 shadow-md flex items-center justify-around px-4 z-30 pointer-events-none">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-br from-amber-200 to-amber-900 border border-amber-950/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]"
            />
          ))}
        </div>

        {/* Top Fixed Golden Pointer Arrow (Locked in Exact 50% Dead Center) */}
        <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 rotate-45 border-2 border-amber-200 shadow-[0_4px_12px_rgba(245,158,11,0.8)] -mb-2.5 sm:-mb-3" />
        </div>

        {/* Center Illuminated "NOW" Bracket Frame (Locked in Exact 50% Dead Center over Current Card) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[86px] sm:w-[100px] md:w-[112px] h-[145px] sm:h-[165px] md:h-[185px] rounded-2xl border-2 sm:border-3 border-amber-400/90 bg-gradient-to-b from-amber-400/15 via-transparent to-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.45),inset_0_0_20px_rgba(245,158,11,0.25)] z-25 pointer-events-none flex flex-col justify-between items-center py-2 sm:py-3">
          <span className="text-[9px] sm:text-[11px] font-title font-black tracking-widest text-amber-300 uppercase bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-400/50 shadow flex items-center gap-1">
            <Star size={10} className="text-yellow-400 fill-yellow-400" />
            <span>NOW</span>
          </span>
          <div className="w-full flex justify-between px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </div>
        </div>

        {/* Card Reel Display Arena */}
        <div
          className="relative w-full h-full flex items-center overflow-hidden"
          style={{
            perspective: "1400px",
            perspectiveOrigin: "50% 50%",
            transformStyle: "preserve-3d",
          }}
        >
          {visibleOffsets.map((offset) => {
            const tileNum = calculateSlotNumber(currentCount, offset);
            const isCurrent = offset === 0;
            const isRight1 = offset === 1;
            const isRight2 = offset === 2;
            const isRight3 = offset === 3;
            const isLeft1 = offset === -1;
            const isLeft2 = offset === -2;
            const isLeft3 = offset === -3;

            const isTargetBomb = tileNum === TARGET;
            const isTileDanger = tileNum >= 28 && tileNum < TARGET;
            const isSelected = selectedCards.includes(tileNum);

            // Symmetrical, 7-Card Flat Spacing Math:
            // Cards: [-3, -2, -1, 0, 1, 2, 3] are 7 completely flat, 100% visible front-facing cards!
            let posX = 0;
            let posZ = 0;
            let rotY = 0;
            let cardScale = 1.0;
            let cardOpacity = 1.0;
            let cardZIndex = 20;

            const STEP = 100; // 100px step creates 7 fully visible cards spanning 600px perfectly inside the 780px container!

            if (isCurrent) {
              // 0 (Center NOW Card)
              posX = 0;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 30;
            } else if (isRight1) {
              // +1 (Next Card Right)
              posX = STEP;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 28;
            } else if (isRight2) {
              // +2 (Next Card Right)
              posX = STEP * 2;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 26;
            } else if (isRight3) {
              // +3 (Next Card Right)
              posX = STEP * 3;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 24;
            } else if (offset >= 4) {
              // +4 (Far Right Peek Edge)
              posX = STEP * 3.85;
              posZ = -40;
              rotY = -16;
              cardScale = 0.82;
              cardOpacity = 0.45;
              cardZIndex = 14;
            } else if (isLeft1) {
              // -1 (Previous Card Left)
              posX = -STEP;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 28;
            } else if (isLeft2) {
              // -2 (Previous Card Left)
              posX = -STEP * 2;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 26;
            } else if (isLeft3) {
              // -3 (Previous Card Left)
              posX = -STEP * 3;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 24;
            } else {
              // -4 (Far Left Peek Edge)
              posX = -STEP * 3.85;
              posZ = -40;
              rotY = 16;
              cardScale = 0.82;
              cardOpacity = 0.45;
              cardZIndex = 14;
            }

            // Identify whether this card was part of the previous move (1, 2, or 3 cards)
            const isLastTurnPick =
              lastPicks.includes(tileNum) ||
              (offset <= 0 && offset >= -(lastCount - 1) && currentCount > 0);

            const highlightColor = lastMove?.playerColor ?? "#21e6d7";
            const priorColor = taken[tileNum];

            return (
              <motion.div
                key={`${offset}-${tileNum}`}
                initial={false}
                animate={{
                  transform: `translate(-50%, -50%) translateX(${posX}px) translateZ(${posZ}px) rotateY(${rotY}deg) scale(${
                    isSelected ? cardScale * 1.08 : cardScale
                  })`,
                  opacity: cardOpacity,
                }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 25,
                  mass: 0.9,
                }}
                className={`absolute top-1/2 w-[82px] sm:w-[94px] md:w-[104px] h-[135px] sm:h-[155px] md:h-[170px] rounded-2xl flex flex-col items-center justify-center border-2 transition-all select-none ${
                  isSelected
                    ? "bg-gradient-to-b from-emerald-900 via-emerald-800 to-black border-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.9),inset_0_0_15px_rgba(52,211,153,0.5)] cursor-pointer z-35"
                    : isCurrent
                      ? isTargetBomb
                        ? "bg-gradient-to-b from-rose-950 via-rose-900 to-black border-rose-500 shadow-[0_0_35px_rgba(239,68,68,0.7)]"
                        : isTileDanger
                          ? "bg-gradient-to-b from-amber-950 via-amber-900 to-black border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)]"
                          : "bg-gradient-to-b from-slate-900 via-slate-950 to-black border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.4)]"
                      : isLastTurnPick
                        ? "bg-gradient-to-b from-[#0e1d24] via-[#09151b] to-black border-2"
                        : myTurn && (isRight1 || isRight2 || isRight3)
                          ? "bg-gradient-to-b from-[#16271c] via-[#0d1a12] to-black border-emerald-500/70 hover:border-emerald-400 hover:scale-105 cursor-pointer shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                          : isTargetBomb
                            ? "bg-gradient-to-b from-red-950/40 to-black/80 border-red-500/40"
                            : priorColor
                              ? "bg-gradient-to-b from-[#141b18] to-black border-slate-700"
                              : "bg-gradient-to-b from-neutral-900/60 to-black/90 border-amber-900/40"
                }`}
                style={{
                  left: baseCenterX,
                  transformStyle: "preserve-3d",
                  zIndex: isSelected ? 40 : cardZIndex,
                  borderColor: isSelected ? "#34d399" : isLastTurnPick ? highlightColor : undefined,
                  boxShadow: isSelected
                    ? "0 0 30px rgba(52,211,153,0.8), inset 0 0 15px rgba(52,211,153,0.4)"
                    : isLastTurnPick
                      ? `0 0 20px ${highlightColor}90, inset 0 0 12px ${highlightColor}35`
                      : undefined,
                }}
                onClick={() => {
                  if (myTurn && status === "playing" && (isRight1 || isRight2 || isRight3)) {
                    soundManager.playCardSelect();
                    onToggleCard(tileNum);
                  }
                }}
              >
                {/* Vertical Metallic Ribs */}
                <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-amber-500/20 via-amber-400/40 to-transparent" />
                <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-amber-500/20 via-amber-400/40 to-transparent" />

                {/* Selected Checkmark Badge */}
                {isSelected && (
                  <span className="absolute top-1.5 left-1.5 text-emerald-300 bg-emerald-950 p-0.5 rounded-full border border-emerald-400 shadow animate-bounce z-20">
                    <CheckCircle2 size={13} className="fill-emerald-400 text-slate-950" />
                  </span>
                )}

                {/* Previous Turn Pick Pill Badge (Subtle & High-Contrast for 1, 2, or 3 Previous Cards) */}
                {isLastTurnPick && !isCurrent && (
                  <span
                    className="absolute top-1.5 px-2 py-0.5 rounded-full text-[8px] sm:text-[9px] font-title font-black uppercase tracking-wider border shadow-md flex items-center gap-1 z-20"
                    style={{
                      color: highlightColor,
                      borderColor: `${highlightColor}90`,
                      backgroundColor: "rgba(0, 0, 0, 0.88)",
                      boxShadow: `0 0 8px ${highlightColor}60`,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: highlightColor }} />
                    <span>PREV</span>
                  </span>
                )}

                {/* Lethal 31 Spiked Skull Bomb Badge */}
                {isTargetBomb && (
                  <span className="absolute top-1 text-[8px] sm:text-[9px] font-title font-black text-rose-300 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/60 shadow flex items-center gap-1">
                    <span className="text-xs">💣</span>
                    <Skull size={10} className="text-rose-400 animate-pulse" />
                    <span>31</span>
                  </span>
                )}

                {/* Progressive Flame Badges (28 = 🔥, 29 = 🔥🔥, 30 = 🔥🔥🔥) */}
                {isTileDanger && !isTargetBomb && (
                  <span className="absolute top-1 text-[8px] sm:text-[9px] font-title font-black text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/60 shadow flex items-center gap-0.5">
                    {tileNum === 28 && <Flame size={10} className="text-amber-400" />}
                    {tileNum === 29 && (
                      <>
                        <Flame size={10} className="text-orange-400" />
                        <Flame size={10} className="text-orange-400" />
                      </>
                    )}
                    {tileNum === 30 && (
                      <>
                        <Flame size={10} className="text-rose-400 animate-bounce" />
                        <Flame size={10} className="text-rose-400 animate-bounce" />
                        <Flame size={10} className="text-rose-400 animate-bounce" />
                      </>
                    )}
                  </span>
                )}

                {/* Number Display with 3D Bevel Typography */}
                <span
                  className={`font-title font-black leading-none transition-all ${
                    isSelected
                      ? "text-4xl sm:text-5xl md:text-6xl text-emerald-200 drop-shadow-[0_4px_16px_rgba(52,211,153,1)] scale-110"
                      : isCurrent
                        ? "text-4xl sm:text-5xl md:text-6xl text-amber-300 drop-shadow-[0_4px_12px_rgba(245,158,11,0.9)]"
                        : isLastTurnPick
                          ? "text-3xl sm:text-4xl md:text-5xl text-cyan-300 drop-shadow-[0_2px_14px_rgba(33,230,215,0.9)]"
                          : myTurn && (isRight1 || isRight2 || isRight3)
                            ? "text-3xl sm:text-4xl md:text-5xl text-emerald-300 drop-shadow-[0_2px_8px_rgba(34,197,94,0.8)]"
                            : isTargetBomb
                              ? "text-3xl sm:text-4xl md:text-5xl text-rose-500 drop-shadow-[0_2px_8px_rgba(239,68,68,0.8)]"
                              : "text-2xl sm:text-3xl md:text-4xl text-amber-100/70"
                  }`}
                >
                  {isCurrent && currentCount === 0 ? "0" : tileNum}
                </span>

                {/* Bottom Accents / Indicator Dot */}
                <div className="absolute bottom-1.5 flex gap-1.5 items-center">
                  {isLastTurnPick && !isCurrent ? (
                    <span className="text-[9px] font-title font-black" style={{ color: highlightColor }}>
                      ✓ Played
                    </span>
                  ) : (
                    <>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? "bg-emerald-400"
                            : isCurrent
                              ? "bg-amber-400"
                              : isTargetBomb
                                ? "bg-rose-500"
                                : "bg-amber-500/40"
                        }`}
                      />
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? "bg-emerald-400"
                            : isCurrent
                              ? "bg-amber-400"
                              : isTargetBomb
                                ? "bg-rose-500"
                                : "bg-amber-500/40"
                        }`}
                      />
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* 3D Glowing Green Confirm Move Button */}
      <AnimatePresence>
        {myTurn && selectedCards.length > 0 && status === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="z-30 mt-1"
          >
            <button
              onClick={() => {
                soundManager.playClick();
                onConfirmMove();
              }}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-slate-950 font-title font-black text-base shadow-[0_0_25px_rgba(52,211,153,0.9),0_4px_12px_rgba(0,0,0,0.5)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2.5"
            >
              <span>CONFIRM MOVE ({selectedCards.length} {selectedCards.length === 1 ? "CARD" : "CARDS"})</span>
              <Send size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
