"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, Lock, Sparkles, UserPlus, LogIn, ArrowRight, ShieldCheck } from "lucide-react";
import { soundManager } from "../../lib/soundManager";

interface AuthGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  featureName?: string;
  redirectTo?: string;
}

export function AuthGateModal({
  isOpen,
  onClose,
  title = "Unlock Full Features",
  description = "You're currently playing as a guest. Sign in or create a free account to customize your avatar, access the market, and save your winnings.",
  featureName = "this feature",
  redirectTo = "/home",
}: AuthGateModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  function handleAuth(path: string) {
    soundManager.playClick();
    router.push(`${path}?next=${encodeURIComponent(redirectTo)}`);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            soundManager.playClick();
            onClose();
          }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Console */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 280 }}
          className="relative w-full max-w-md bg-gradient-to-b from-[#18281e] via-[#0d1811] to-[#050a07] border-2 sm:border-3 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(245,158,11,0.3)] z-50 flex flex-col items-center text-center"
        >
          {/* Top Rivet Accent */}
          <div className="absolute top-0 inset-x-0 h-4 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 border-b border-amber-300/60 shadow flex items-center justify-around px-4 pointer-events-none rounded-t-2xl">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-amber-950 border border-amber-300 shadow-inner" />
            ))}
          </div>

          {/* Close Button */}
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-black/60 border border-slate-700 hover:border-amber-400 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <X size={16} />
          </button>

          {/* Icon Shield */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 border-2 border-amber-200 flex items-center justify-center text-slate-950 shadow-[0_0_25px_rgba(245,158,11,0.7)] mt-2 mb-4">
            <Lock size={30} className="drop-shadow" />
          </div>

          {/* Text Content */}
          <h3 className="font-title font-black text-2xl text-white tracking-wide drop-shadow">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-xs">
            {description}
          </p>

          {/* Perks list */}
          <div className="w-full bg-black/50 border border-amber-500/30 rounded-2xl p-3.5 my-5 flex flex-col gap-2 text-left">
            <div className="flex items-center gap-2.5 text-xs text-amber-200">
              <Sparkles size={14} className="text-yellow-400 shrink-0" />
              <span>Save custom cow avatars & rare skins</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-emerald-200">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>Deposit & withdraw USDT cryptocurrency</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-amber-200">
              <Sparkles size={14} className="text-yellow-400 shrink-0" />
              <span>Compete on global leaderboards & tournaments</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={() => handleAuth("/register")}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(52,211,153,0.7)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <UserPlus size={16} />
              <span>CREATE FREE ACCOUNT</span>
            </button>

            <button
              onClick={() => handleAuth("/login")}
              className="w-full py-2.5 rounded-2xl bg-black/80 border border-amber-500/50 hover:border-amber-400 text-amber-300 font-title font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogIn size={15} />
              <span>ALREADY HAVE AN ACCOUNT? SIGN IN</span>
            </button>

            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer pt-1"
            >
              Continue playing as Guest
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
