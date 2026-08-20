"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Flame, RotateCw, Trophy, X, RotateCcw, ArrowRight } from "lucide-react";
import { soundManager } from "../../lib/soundManager";

interface BarnabyMascotProps {
  count: number;
  status: "waiting" | "playing" | "over";
  myTurn: boolean;
  winner: { name: string; color: string } | null;
  lastEliminated: { name: string; reason: string } | null;
  isMyWin: boolean;
  onPlayAgain?: () => void;
}

export function BarnabyMascot({
  count,
  status,
  myTurn,
  winner,
  lastEliminated,
  isMyWin,
  onPlayAgain,
}: BarnabyMascotProps) {
  const [quote, setQuote] = useState("Moo-ve smart! Don't be the one to hit 31! 🐮");
  const [showModal, setShowModal] = useState(false);
  const isDanger = count >= 28 && count < 31;
  const isGameOver = status === "over";

  useEffect(() => {
    if (isGameOver) {
      setShowModal(true);
      if (isMyWin) {
        setQuote("Udder perfection! You conquered the pasture! 🏆👑");
      } else {
        setQuote("Countdown 31, Round and Round 31! 💫😵");
      }
    } else {
      setShowModal(false);
      if (isDanger) {
        setQuote(
          count === 30
            ? "CRITICAL! Counter is at 30! Whoever goes next is trapped! 🔥"
            : "DANGER ZONE! 28+ reached! One wrong step and it's 31! 💦"
        );
      } else if (count >= 20) {
        setQuote("The pasture is heating up! Keep your eyes on the reel! ⚡");
      } else if (count >= 10) {
        setQuote("Nice steady counting! Barnaby approves! 👍");
      } else if (myTurn) {
        setQuote("Your turn! Click directly on a number card to play! 🍀");
      } else {
        setQuote("Barnaby is watching the field! Who will take the next step? 🐮");
      }
    }
  }, [count, isDanger, isGameOver, isMyWin, myTurn]);

  // Full-Screen Spinning Defeat / Victory Screen Overlay
  const renderGameOverModal = () => {
    if (!isGameOver || !showModal) return null;

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 20 }}
            className="relative flex flex-col items-center text-center max-w-lg w-full bg-gradient-to-b from-amber-950 via-emerald-950 to-slate-950 p-6 sm:p-8 rounded-3xl border-3 border-amber-400 shadow-[0_0_60px_rgba(245,158,11,0.6)] overflow-hidden"
          >
            {/* Close Button at top right */}
            <button
              onClick={() => {
                soundManager.playClick();
                setShowModal(false);
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-amber-200 hover:text-white hover:bg-black/70 border border-amber-400/40 transition-colors z-30"
              title="Close Summary"
            >
              <X size={20} />
            </button>

            {/* Ambient Golden Rays */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.25)_0%,transparent_70%)] pointer-events-none" />

            {/* Screen Header Title */}
            <motion.div
              animate={{ rotate: [-2, 2, -2], scale: [1, 1.04, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              className="font-title font-black text-2xl sm:text-4xl text-amber-300 tracking-wide drop-shadow-[0_4px_16px_rgba(245,158,11,0.8)] mb-2"
            >
              {isMyWin ? "🏆 VICTORY CHAMPION! 👑" : "💫 ROUND & ROUND 31! 😵"}
            </motion.div>

            {/* Barnaby Mascot Visual */}
            <div className="relative my-3">
              {/* Circling 5 Golden Stars above head on Defeat */}
              {!isMyWin && (
                <div className="absolute -top-6 inset-x-0 flex justify-center items-center gap-1.5 z-20 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <motion.span
                      key={i}
                      animate={{
                        rotate: 360,
                        scale: [1, 1.35, 1],
                        y: [0, -8, 0],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: "linear",
                        delay: i * 0.18,
                      }}
                      className="text-2xl drop-shadow-[0_0_12px_rgba(255,215,0,0.95)]"
                    >
                      ⭐
                    </motion.span>
                  ))}
                </div>
              )}

              {/* Crown for Victory */}
              {isMyWin && (
                <motion.div
                  animate={{ y: [-6, 2, -6], rotate: [-4, 4, -4] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-7 inset-x-0 flex justify-center text-4xl z-20 pointer-events-none drop-shadow-[0_0_15px_rgba(255,215,0,0.9)]"
                >
                  👑
                </motion.div>
              )}

              {/* Barnaby Mascot Image */}
              <motion.div
                animate={
                  !isMyWin
                    ? {
                        rotate: [0, 360, 720, 1080, 1440],
                        scale: [1, 1.1, 0.95, 1.08, 1],
                      }
                    : {
                        y: [0, -12, 0],
                        scale: [1, 1.06, 1],
                      }
                }
                transition={
                  !isMyWin
                    ? { duration: 2.2, ease: [0.25, 1, 0.5, 1] }
                    : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
                }
                className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden border-4 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)] relative bg-amber-950 mx-auto"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    isMyWin
                      ? "/assets/barnaby/barnaby-field.jpg"
                      : "/assets/barnaby/barnaby-dizzy-stars.jpg"
                  }
                  alt="Barnaby Cow Mascot"
                  className="w-full h-full object-cover object-center"
                />
              </motion.div>
            </div>

            {/* Signature Dialogue Banner */}
            <motion.div
              initial={{ scale: 0.8, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="mt-1 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 text-amber-950 font-title font-black text-base sm:text-xl px-5 py-2 rounded-2xl border-2 border-amber-950 shadow-xl"
            >
              &ldquo;{isMyWin ? "Udder perfection! You conquered 31!" : "Countdown 31, Round and Round 31!"}&rdquo;
            </motion.div>

            {/* Match Result Stats Box */}
            <div className="w-full bg-black/40 border border-amber-400/30 rounded-2xl p-3 my-3 text-xs sm:text-sm font-ui text-amber-100">
              <div className="flex justify-between items-center py-1 border-b border-white/10">
                <span className="text-amber-300 font-bold">Match Winner</span>
                <span className="font-title font-black text-emerald-400 flex items-center gap-1">
                  <Trophy size={14} /> {winner?.name ?? "Champion"}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-amber-300 font-bold">Defeat Reason</span>
                <span className="text-rose-400 font-bold">
                  {lastEliminated
                    ? lastEliminated.reason === "skip"
                      ? `${lastEliminated.name} committed a BLUNDER: Skipped a card!`
                      : lastEliminated.reason === "repeat"
                        ? `${lastEliminated.name} repeated previous count!`
                        : `${lastEliminated.name} landed on 31!`
                    : "Hit 31 bomb"}
                </span>
              </div>
            </div>

            {/* Primary Action Buttons (Play Again / Close) */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-2">
              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowModal(false);
                  onPlayAgain?.();
                }}
                className="btn-arcade-3d btn-arcade-green text-lg py-3.5 px-6 w-full flex items-center justify-center gap-2 shadow-xl"
              >
                <RotateCcw size={20} />
                <span>PLAY AGAIN</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  setShowModal(false);
                }}
                className="btn-arcade-3d btn-arcade-amber text-base py-3 px-5 w-full sm:w-auto flex items-center justify-center gap-1.5"
              >
                <span>CONTINUE</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return <>{renderGameOverModal()}</>;
}
