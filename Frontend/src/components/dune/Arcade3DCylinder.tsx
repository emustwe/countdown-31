"use client";

import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import { motion } from "framer-motion";
import { Flame, Skull, Star, Zap } from "lucide-react";
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
  compact?: boolean;
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
  onConfirmMove: _onConfirmMove,
  status,
  lastMove,
  lastSkillUsed,
  taken = {},
  forbiddenK: _forbiddenK,
  compact = false,
}: Arcade3DCylinderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Dynamically compute scale factor so all 7 cards fit perfectly on any viewport (mobile to 4K)
  useLayoutEffect(() => {
    function updateScale() {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const availableScale = Math.max(0.4, width / 840);
        setScale(Math.min(compact ? 0.85 : 1, availableScale));
      }
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [compact]);

  // Visible slot offsets around next playable number: -3, -2, -1, 0, 1, 2, 3 (Always 7 Cards)
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

  const baseCenterX = "50%";
  const nativeWidth = 840;
  const nativeHeight = 245;

  // Track recently played cards to trigger sequential 3D roll-over and 360 spin animation
  const [activeTumblePicks, setActiveTumblePicks] = useState<number[]>([]);
  const prevMoveTimeRef = useRef<number>(0);

  React.useEffect(() => {
    if (lastMove?.picks && lastMove.picks.length > 0) {
      const now = Date.now();
      // Trigger tumble sequence on new move
      if (now - prevMoveTimeRef.current > 300) {
        prevMoveTimeRef.current = now;
        setActiveTumblePicks(lastMove.picks);

        // Play aerodynamic whoosh sound for each card in the roll-over sequence
        lastMove.picks.forEach((_, idx) => {
          setTimeout(() => {
            soundManager.playCardSpinWhoosh();
          }, idx * 280);
        });

        const timer = setTimeout(() => {
          setActiveTumblePicks([]);
        }, 1800);
        return () => clearTimeout(timer);
      }
    }
  }, [lastMove, currentCount]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[840px] mx-auto select-none flex flex-col items-center"
      style={{
        height: `${Math.round(nativeHeight * scale + (lastSkillUsed ? 36 : 0))}px`,
      }}
    >
      {/* Tactical Skill Event Combat Banner */}
      {lastSkillUsed && (
        <div className="flex items-center justify-center mb-1 animate-fadeIn">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-950/90 via-black/90 to-amber-950/90 border border-amber-400/70 shadow-[0_0_15px_rgba(245,158,11,0.5)] text-xs font-title font-black text-amber-200">
            <Zap size={14} className="text-yellow-400 fill-yellow-400 animate-pulse" />
            <span className="text-white font-bold">{lastSkillUsed.userName}</span>
            <span className="text-amber-300 font-semibold">{lastSkillUsed.description}</span>
          </div>
        </div>
      )}

      {/* Proportional Scaling Wrapper: Ensures all 7 cards shrink into the game box on mobile */}
      <div
        style={{
          width: `${nativeWidth}px`,
          height: `${nativeHeight}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
        className="relative shrink-0 rounded-3xl overflow-hidden bg-gradient-to-b from-[#0e1612] via-[#09100c] to-[#040806] border-2 sm:border-3 border-amber-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.9),inset_0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center"
      >
        {/* Background Radial Glow & Dynamic Arena Light */}
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${
            isLethal31
              ? "bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.45)_0%,transparent_70%)]"
              : isDangerZone
                ? "bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.35)_0%,transparent_70%)]"
                : "bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.22)_0%,transparent_70%)]"
          }`}
        />

        {/* Top Heavy Brass Rim with Rivets and Moving Light Shimmer */}
        <div className="absolute top-0 inset-x-0 h-6 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-b border-amber-300/60 shadow-md flex items-center justify-around px-4 z-30 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 anim-holo-shimmer opacity-40 pointer-events-none" />
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-200 to-amber-900 border border-amber-950/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]"
            />
          ))}
        </div>

        {/* Bottom Heavy Brass Rim with Rivets and Moving Light Shimmer */}
        <div className="absolute bottom-0 inset-x-0 h-6 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-t border-amber-300/60 shadow-md flex items-center justify-around px-4 z-30 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 anim-holo-shimmer opacity-40 pointer-events-none" />
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-amber-200 to-amber-900 border border-amber-950/60 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]"
            />
          ))}
        </div>

        {/* Top Fixed Golden Pointer Arrow (Locked in Exact 50% Dead Center over Next Playable Card) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center pointer-events-none">
          <div className="w-5 h-5 bg-gradient-to-b from-amber-300 via-amber-500 to-amber-600 rotate-45 border-2 border-amber-200 shadow-[0_4px_12px_rgba(245,158,11,0.8)] -mb-2.5 animate-pulse" />
        </div>

        {/* Center Illuminated "NEXT" Bracket Frame (Hugs Center Card Cleanly with Ambient Light) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110px] h-[180px] rounded-2xl border-3 border-amber-400/90 bg-gradient-to-b from-amber-400/15 via-transparent to-amber-400/10 shadow-[0_0_35px_rgba(245,158,11,0.5),inset_0_0_20px_rgba(245,158,11,0.3)] z-25 pointer-events-none flex flex-col justify-between items-center py-2">
          <span className="text-[10px] font-title font-black tracking-widest text-amber-300 uppercase bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-400/50 shadow flex items-center gap-1">
            <Star size={10} className="text-yellow-400 fill-yellow-400 animate-spin" style={{ animationDuration: "6s" }} />
            <span>{myTurn ? "PICK 1ST" : "NEXT"}</span>
          </span>
          <div className="w-full flex justify-between px-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
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
            const isTargetCenter = offset === 0;
            const isPlayable1 = offset === 0;
            const isPlayable2 = offset === 1;
            const isPlayable3 = offset === 2;

            const isTileDanger = tileNum >= 28 && tileNum <= 30;
            const isTargetBomb = tileNum === 31;
            const isSelected = selectedCards.includes(tileNum);

            // Check if this card is currently in active sequential tumble spin
            const tumbleIndex = activeTumblePicks.indexOf(tileNum);
            const isTumbling = tumbleIndex !== -1;

            // Spacing Math for all 7 Cards:
            let posX = 0;
            let posZ = 0;
            let rotY = 0;
            let cardScale = 1.0;
            let cardOpacity = 1.0;
            let cardZIndex = 20;

            const STEP = 118;

            if (isTargetCenter) {
              posX = 0;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 30;
            } else if (isPlayable2) {
              posX = STEP;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 28;
            } else if (isPlayable3) {
              posX = STEP * 2;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 26;
            } else if (offset === 3) {
              posX = STEP * 3;
              posZ = -20;
              rotY = -8;
              cardScale = 0.94;
              cardOpacity = 0.75;
              cardZIndex = 20;
            } else if (offset === -1) {
              posX = -STEP;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 28;
            } else if (offset === -2) {
              posX = -STEP * 2;
              posZ = 0;
              rotY = 0;
              cardScale = 1.0;
              cardOpacity = 1.0;
              cardZIndex = 26;
            } else if (offset === -3) {
              posX = -STEP * 3;
              posZ = -20;
              rotY = 8;
              cardScale = 0.94;
              cardOpacity = 0.75;
              cardZIndex = 20;
            }

            const isLastTurnPick =
              lastPicks.includes(tileNum) ||
              (offset < 0 && offset >= -lastCount && currentCount > 0);

            const highlightColor = lastMove?.playerColor ?? "#21e6d7";
            const priorColor = taken[tileNum];

            return (
              <motion.div
                key={tileNum}
                role="button"
                aria-label={`Number ${tileNum}`}
                data-tile-number={tileNum}
                tabIndex={myTurn && status === "playing" && (isPlayable1 || isPlayable2 || isPlayable3) ? 0 : -1}
                initial={false}
                animate={
                  isTumbling
                    ? {
                        transform: [
                          `translate(-50%, -50%) translateX(${posX + (tumbleIndex + 1) * 60}px) translateZ(80px) rotateY(0deg) rotateZ(0deg) scale(1.24)`,
                          `translate(-50%, -50%) translateX(${posX + 20}px) translateZ(100px) rotateY(180deg) rotateZ(-12deg) scale(1.3)`,
                          `translate(-50%, -50%) translateX(${posX}px) translateZ(40px) rotateY(360deg) rotateZ(0deg) scale(1.12)`,
                          `translate(-50%, -50%) translateX(${posX}px) translateZ(${posZ}px) rotateY(${rotY}deg) rotateZ(0deg) scale(${cardScale})`,
                        ],
                        opacity: cardOpacity,
                      }
                    : {
                        transform: `translate(-50%, -50%) translateX(${posX}px) translateZ(${
                          isSelected ? posZ + 38 : posZ
                        }px) rotateY(${rotY}deg) scale(${
                          isSelected ? cardScale * 1.12 : cardScale
                        })`,
                        opacity: cardOpacity,
                      }
                }
                whileHover={
                  myTurn && (isPlayable1 || isPlayable2 || isPlayable3)
                    ? {
                        y: -8,
                        scale: isSelected ? 1.15 : 1.06,
                        rotateX: 4,
                        boxShadow: "0 0 35px rgba(52,211,153,0.8), inset 0 0 15px rgba(52,211,153,0.4)",
                      }
                    : undefined
                }
                whileTap={
                  myTurn && (isPlayable1 || isPlayable2 || isPlayable3)
                    ? { scale: 0.97 }
                    : undefined
                }
                transition={
                  isTumbling
                    ? {
                        duration: 1.15,
                        delay: tumbleIndex * 0.28,
                        ease: [0.25, 1, 0.5, 1],
                      }
                    : {
                        type: "spring",
                        stiffness: 220,
                        damping: 24,
                        mass: 0.9,
                      }
                }
                className={`absolute top-1/2 w-[104px] h-[168px] rounded-2xl flex flex-col items-center justify-center border-2 transition-colors select-none ${
                  isSelected
                    ? "bg-gradient-to-b from-emerald-900 via-emerald-800 to-black border-emerald-300 shadow-[0_0_40px_rgba(52,211,153,0.95),inset_0_0_18px_rgba(52,211,153,0.6)] cursor-pointer z-35"
                    : isTumbling
                      ? "bg-gradient-to-b from-amber-900 via-yellow-900 to-black border-yellow-300 shadow-[0_0_50px_rgba(255,215,0,1)] z-40"
                      : isLastTurnPick
                        ? "bg-gradient-to-b from-[#0e1d24] via-[#09151b] to-black border-2"
                        : myTurn && (isPlayable1 || isPlayable2 || isPlayable3)
                          ? "bg-gradient-to-b from-[#16271c] via-[#0d1a12] to-black border-emerald-500/70 hover:border-emerald-400 cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                          : isTargetBomb
                            ? "bg-gradient-to-b from-red-950/60 via-red-900/40 to-black border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]"
                            : isTileDanger
                              ? "bg-gradient-to-b from-amber-950/50 via-amber-900/30 to-black border-amber-500/80 anim-danger-ember"
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
                    ? "0 0 35px rgba(52,211,153,0.9), inset 0 0 18px rgba(52,211,153,0.5)"
                    : isLastTurnPick
                      ? `0 0 25px ${highlightColor}95, inset 0 0 14px ${highlightColor}40`
                      : undefined,
                }}
                onClick={() => {
                  if (myTurn && status === "playing" && (isPlayable1 || isPlayable2 || isPlayable3)) {
                    soundManager.playClick();
                    onToggleCard(tileNum);
                  }
                }}
              >
                {/* Active Selection Glow Ring & Particle Aura */}
                {isSelected && (
                  <div className="absolute -inset-1 rounded-2xl border-2 border-emerald-400 animate-ping pointer-events-none opacity-40" />
                )}

                {/* Previous Turn Pick Pill Badge */}
                {isLastTurnPick && (
                  <span
                    className="absolute top-1.5 px-2 py-0.5 rounded-full text-[8px] font-title font-black uppercase tracking-wider border shadow-md flex items-center gap-1 z-20"
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
                  <span className="absolute top-1 text-[8px] font-title font-black text-rose-200 bg-rose-950 px-2 py-0.5 rounded-full border border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.8)] flex items-center gap-1 animate-bounce">
                    <span className="text-xs">💣</span>
                    <Skull size={12} className="text-rose-400 animate-pulse" />
                    <span>LETHAL 31</span>
                  </span>
                )}

                {/* Progressive Flame Badges (28 = 🔥, 29 = 🔥🔥, 30 = 🔥🔥🔥) */}
                {isTileDanger && !isTargetBomb && (
                  <span className="absolute top-1 text-[8px] font-title font-black text-amber-300 bg-amber-950 px-1.5 py-0.5 rounded-full border border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.6)] flex items-center gap-0.5">
                    {tileNum === 28 && <Flame size={12} className="text-amber-400 animate-pulse" />}
                    {tileNum === 29 && (
                      <>
                        <Flame size={12} className="text-orange-400 animate-pulse" />
                        <Flame size={12} className="text-orange-400 animate-pulse" />
                      </>
                    )}
                    {tileNum === 30 && (
                      <>
                        <Flame size={12} className="text-rose-400 animate-bounce" />
                        <Flame size={12} className="text-rose-400 animate-bounce" />
                        <Flame size={12} className="text-rose-400 animate-bounce" />
                      </>
                    )}
                  </span>
                )}

                {/* Number Display with 3D Bevel Typography */}
                <span
                  className={`font-title font-black leading-none transition-all ${
                    isSelected
                      ? "text-5xl text-emerald-200 drop-shadow-[0_4px_20px_rgba(52,211,153,1)] scale-110"
                      : isLastTurnPick
                        ? "text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
                        : isTargetBomb
                          ? "text-5xl font-black text-rose-300 animate-pulse drop-shadow-[0_0_16px_rgba(244,63,94,1)]"
                          : isTileDanger
                            ? "text-5xl font-black text-amber-300 drop-shadow-[0_0_16px_rgba(251,191,36,0.8)]"
                            : myTurn && (isPlayable1 || isPlayable2 || isPlayable3)
                              ? "text-5xl font-black text-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.6)]"
                              : "text-5xl font-black text-slate-400/80"
                  }`}
                >
                  {tileNum}
                </span>

                {/* Bottom Card Indicators */}
                <div className="absolute bottom-2 inset-x-0 flex items-center justify-center gap-1 pointer-events-none">
                  {isSelected ? (
                    <div className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-title font-black text-[9px] uppercase tracking-wider shadow-[0_0_10px_rgba(52,211,153,0.8)]">
                      SELECTED
                    </div>
                  ) : myTurn && (isPlayable1 || isPlayable2 || isPlayable3) ? (
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-[8px] font-title font-bold text-emerald-300 uppercase tracking-widest">TAP</span>
                    </div>
                  ) : (
                    <div className="flex gap-1 opacity-30">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

