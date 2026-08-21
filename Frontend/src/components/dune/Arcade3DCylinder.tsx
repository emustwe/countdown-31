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
const SLOTS_LEFT = 3;
const SLOTS_RIGHT = 3;

/**
 * Robust, zero-glitch 1..31 modulo function.
 * Anchors offset 0 directly to the next playable number (currentCount + 1).
 */
function calculateSlotNumber(currentCount: number, offset: number): number {
  const raw = currentCount + 1 + offset;
  const mod = (((raw - 1) % TARGET) + TARGET) % TARGET + 1;
  return mod;
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
  // Visible slot offsets around next playable number: -3, -2, -1, 0, 1, 2, 3
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
    <div className="relative w-full max-w-[920px] mx-auto my-1 select-none flex flex-col items-center gap-2">
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
      <div
        className="relative w-full h-[225px] sm:h-[255px] md:h-[275px] rounded-3xl overflow-hidden bg-gradient-to-b from-[#0e1612] via-[#09100c] to-[#040806] border-2 border-amber-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center"
        style={
          {
            "--card-step": "126px",
          } as React.CSSProperties
        }
      >
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
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-br from-amber-200 to-amber-900 border border-amber-950/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]"
            />
          ))}
        </div>

        {/* Bottom Heavy Brass Rim with Rivets */}
        <div className="absolute bottom-0 inset-x-0 h-6 sm:h-7 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-t border-amber-300/60 shadow-md flex items-center justify-around px-4 z-30 pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-gradient-to-br from-amber-200 to-amber-900 border border-amber-950/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]"
            />
          ))}
        </div>

        {/* Top Fixed Golden Pointer Arrow (Locked in Exact 50% Dead Center over Next Playable Card) */}
        <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none">
          <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 rotate-45 border-2 border-amber-200 shadow-[0_4px_12px_rgba(245,158,11,0.8)] -mb-2.5 sm:-mb-3" />
        </div>

        {/* Center Illuminated "NEXT" Bracket Frame (Hugs Center Card Cleanly with Zero Neighbor Overlap) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92px] sm:w-[108px] md:w-[118px] h-[148px] sm:h-[168px] md:h-[188px] rounded-2xl border-2 sm:border-3 border-amber-400/90 bg-gradient-to-b from-amber-400/15 via-transparent to-amber-400/10 shadow-[0_0_30px_rgba(245,158,11,0.45),inset_0_0_20px_rgba(245,158,11,0.25)] z-25 pointer-events-none flex flex-col justify-between items-center py-2 sm:py-3">
          <span className="text-[9px] sm:text-[11px] font-title font-black tracking-widest text-amber-300 uppercase bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-400/50 shadow flex items-center gap-1">
            <Star size={10} className="text-yellow-400 fill-yellow-400" />
            <span>{myTurn ? "PICK 1ST" : "NEXT"}</span>
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
            const isTargetCenter = offset === 0; // The next playable card in 50% dead center
            const isPlayable1 = offset === 0;   // 1st selectable card (currentCount + 1)
            const isPlayable2 = offset === 1;   // 2nd selectable card (currentCount + 2)
            const isPlayable3 = offset === 2;   // 3rd selectable card (currentCount + 3)

            const isTargetBomb = tileNum === TARGET;
            const isTileDanger = tileNum >= 28 && tileNum < TARGET;
            const isSelected = selectedCards.includes(tileNum);

            // Wide, Chunky, Non-Overlapping Spacing Math:
            // 7 Thick, Premium Cards with generous 12px separation gaps!
            let posX = 0;
            let posZ = 0;
            let rotY = 0;
            let cardScale = 1.0;
            let cardOpacity = 1.0;
            let cardZIndex = 20;

            const STEP = 126; // 126px step with 114px card width = 12px clean breathing space!

            if (isTargetCenter) {
              // 0 (Center Next Playable Card under Arrow)
              posX = 0;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 30;
            } else if (isPlayable2) {
              // +1 (Next Card Right)
              posX = STEP;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 28;
            } else if (isPlayable3) {
              // +2 (Next Card Right)
              posX = STEP * 2;
              posZ = 0;
              rotY = 0;
              cardScale = 0.98;
              cardOpacity = 1.0;
              cardZIndex = 26;
            } else if (offset === 3) {
              // +3 (Right Peek Card)
              posX = STEP * 3;
              posZ = 0;
              rotY = 0;
              cardScale = 0.96;
              cardOpacity = 1.0;
              cardZIndex = 24;
            } else if (offset === -1) {
              // -1 (Previous Player's Last Card, e.g. 14)
              posX = -STEP;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 28;
            } else if (offset === -2) {
              // -2 (Previous Player's 2nd Card, e.g. 13)
              posX = -STEP * 2;
              posZ = 0;
              rotY = 0;
              cardScale = 0.98;
              cardOpacity = 1.0;
              cardZIndex = 26;
            } else if (offset === -3) {
              // -3 (Previous Player's 1st Card, e.g. 12)
              posX = -STEP * 3;
              posZ = 0;
              rotY = 0;
              cardScale = 0.96;
              cardOpacity = 1.0;
              cardZIndex = 24;
            }

            // Identify whether this card was part of the previous move (1, 2, or 3 cards)
            const isLastTurnPick =
              lastPicks.includes(tileNum) ||
              (offset < 0 && offset >= -lastCount && currentCount > 0);

            const highlightColor = lastMove?.playerColor ?? "#21e6d7";
            const priorColor = taken[tileNum];

            return (
              <motion.div
                key={`${offset}-${tileNum}`}
                initial={false}
                animate={{
                  transform: `translate(-50%, -50%) translateX(${posX}px) translateZ(${posZ}px) rotateY(${rotY}deg) scale(${
                    isSelected ? cardScale * 1.06 : cardScale
                  })`,
                  opacity: cardOpacity,
                }}
                transition={{
                  type: "spring",
                  stiffness: 280,
                  damping: 25,
                  mass: 0.9,
                }}
                className={`absolute top-1/2 w-[88px] sm:w-[104px] md:w-[114px] h-[140px] sm:h-[160px] md:h-[175px] rounded-2xl flex flex-col items-center justify-center border-2 transition-all select-none ${
                  isSelected
                    ? "bg-gradient-to-b from-emerald-900 via-emerald-800 to-black border-emerald-300 shadow-[0_0_35px_rgba(52,211,153,0.9),inset_0_0_15px_rgba(52,211,153,0.5)] cursor-pointer z-35"
                    : isLastTurnPick
                      ? "bg-gradient-to-b from-[#0e1d24] via-[#09151b] to-black border-2"
                      : myTurn && (isPlayable1 || isPlayable2 || isPlayable3)
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
                  if (myTurn && status === "playing" && (isPlayable1 || isPlayable2 || isPlayable3)) {
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
                    <CheckCircle2 size={14} className="fill-emerald-400 text-slate-950" />
                  </span>
                )}

                {/* Previous Turn Pick Pill Badge (Subtle & High-Contrast for ALL Previous Cards including the last one) */}
                {isLastTurnPick && (
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
                    <Skull size={11} className="text-rose-400 animate-pulse" />
                    <span>31</span>
                  </span>
                )}

                {/* Progressive Flame Badges (28 = 🔥, 29 = 🔥🔥, 30 = 🔥🔥🔥) */}
                {isTileDanger && !isTargetBomb && (
                  <span className="absolute top-1 text-[8px] sm:text-[9px] font-title font-black text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/60 shadow flex items-center gap-0.5">
                    {tileNum === 28 && <Flame size={11} className="text-amber-400" />}
                    {tileNum === 29 && (
                      <>
                        <Flame size={11} className="text-orange-400" />
                        <Flame size={11} className="text-orange-400" />
                      </>
                    )}
                    {tileNum === 30 && (
                      <>
                        <Flame size={11} className="text-rose-400 animate-bounce" />
                        <Flame size={11} className="text-rose-400 animate-bounce" />
                        <Flame size={11} className="text-rose-400 animate-bounce" />
                      </>
                    )}
                  </span>
                )}

                {/* Number Display with 3D Bevel Typography */}
                <span
                  className={`font-title font-black leading-none transition-all ${
                    isSelected
                      ? "text-4xl sm:text-5xl md:text-6xl text-emerald-200 drop-shadow-[0_4px_16px_rgba(52,211,153,1)] scale-110"
                      : isLastTurnPick
                        ? "text-3xl sm:text-4xl md:text-5xl text-cyan-300 drop-shadow-[0_2px_14px_rgba(33,230,215,0.9)]"
                        : isTargetCenter
                          ? "text-4xl sm:text-5xl md:text-6xl text-amber-300 drop-shadow-[0_4px_12px_rgba(245,158,11,0.9)]"
                          : myTurn && (isPlayable2 || isPlayable3)
                            ? "text-3xl sm:text-4xl md:text-5xl text-emerald-300 drop-shadow-[0_2px_8px_rgba(34,197,94,0.8)]"
                            : isTargetBomb
                              ? "text-3xl sm:text-4xl md:text-5xl text-rose-500 drop-shadow-[0_2px_8px_rgba(239,68,68,0.8)]"
                              : "text-2xl sm:text-3xl md:text-4xl text-amber-100/70"
                  }`}
                >
                  {tileNum}
                </span>

                {/* Bottom Accents / Indicator Dot */}
                <div className="absolute bottom-1.5 flex gap-1.5 items-center">
                  {isLastTurnPick ? (
                    <span className="text-[9px] font-title font-black" style={{ color: highlightColor }}>
                      ✓ Played
                    </span>
                  ) : (
                    <>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected
                            ? "bg-emerald-400"
                            : isTargetCenter
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
                            : isTargetCenter
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

      {/* 3D Glowing Green Confirm Move Button (Solid, 100% Stable) */}
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
