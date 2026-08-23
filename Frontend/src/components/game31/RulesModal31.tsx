"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldAlert, Sparkles, HelpCircle, Trophy, Zap } from "lucide-react";
import { soundManager } from "../../lib/soundManager";

interface RulesModal31Props {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal31({ isOpen, onClose }: RulesModal31Props) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="arcade-card-wood max-w-lg w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-amber-200/80 text-amber-950 hover:bg-amber-300 border-2 border-amber-900/40 transition-colors"
          >
            <X size={20} />
          </button>

          {/* Title Header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 border-3 border-amber-900 flex items-center justify-center text-2xl shadow">
              🐮
            </div>
            <div>
              <h2 className="font-title text-2xl sm:text-3xl font-black text-amber-950 leading-tight">
                How To Play Count Down 31
              </h2>
              <p className="text-xs font-title font-bold text-amber-900/70">
                The ultimate battle of bovine wits!
              </p>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-3.5 font-ui text-sm sm:text-base text-amber-950 font-medium">
            <div className="flex items-start gap-3 bg-amber-50/80 p-3.5 rounded-xl border-2 border-amber-900/20">
              <div className="font-title font-black text-lg bg-emerald-500 text-white w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow">
                1
              </div>
              <div>
                <b className="font-title text-emerald-900 block text-base">Take Turns Counting</b>
                Players alternate turns starting from 0. On your turn, you can add <span className="font-title text-emerald-800 font-bold">+1</span> or <span className="font-title text-sky-800 font-bold">+2</span> to the current total.
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-50/80 p-3.5 rounded-xl border-2 border-amber-900/20">
              <div className="font-title font-black text-lg bg-amber-500 text-white w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow">
                2
              </div>
              <div>
                <b className="font-title text-amber-900 block text-base">The Danger Zone (28 - 30)</b>
                When the count reaches 28 or higher, every single step is critical! If you leave your opponent on 30, they are trapped!
              </div>
            </div>

            <div className="flex items-start gap-3 bg-rose-50/90 p-3.5 rounded-xl border-2 border-rose-900/20">
              <div className="font-title font-black text-lg bg-rose-500 text-white w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow">
                3
              </div>
              <div>
                <b className="font-title text-rose-900 block text-base">Don't Hit 31!</b>
                The player forced to say or land on <span className="font-title text-rose-700 font-bold">31</span> suffers the <span className="underline decoration-rose-500">Dizzy Cow Spin Defeat</span> and loses the game!
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-100/70 p-3 rounded-xl border-2 border-amber-900/30">
              <Sparkles size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-950 font-bold">
                <b>Pro Tip:</b> Try landing on multiples of 3 (3, 6, 9, 12, 15, 18, 21, 24, 27, 30) to secure a mathematically guaranteed victory!
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="btn-arcade-3d btn-arcade-green text-lg px-8 py-3 w-full"
            >
              GOT IT, LET'S MOO-VE! 🐮
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
