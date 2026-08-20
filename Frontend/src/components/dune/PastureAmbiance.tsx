"use client";

import React from "react";
import { motion } from "framer-motion";

export function PastureAmbiance() {
  return (
    <div className="fixed inset-0 pointer-events-none select-none overflow-hidden z-0">
      {/* Warm Golden Sunbeam Radial Glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[700px] h-[340px] rounded-full bg-gradient-to-b from-amber-300/20 via-emerald-400/10 to-transparent blur-3xl" />

      {/* Gentle Floating Sunlight Orbs */}
      <motion.div
        animate={{ y: [0, -18, 0], opacity: [0.35, 0.65, 0.35] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-28 left-[12%] w-48 h-48 rounded-full bg-emerald-400/15 blur-2xl"
      />
      <motion.div
        animate={{ y: [0, -22, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        className="absolute top-36 right-[14%] w-56 h-56 rounded-full bg-cyan-400/15 blur-2xl"
      />

      {/* Stylized Rolling Green Pasture Contours at the bottom */}
      <div className="absolute -bottom-8 inset-x-0 h-40 opacity-30">
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="w-full h-full fill-emerald-600/40">
          <path d="M0,96L80,112C160,128,320,160,480,154.7C640,149,800,107,960,96C1120,85,1280,107,1360,117.3L1440,128L1440,220L1360,220C1280,220,1120,220,960,220C800,220,640,220,480,220C320,220,160,220,80,220L0,220Z" />
        </svg>
      </div>

      <div className="absolute -bottom-14 inset-x-0 h-40 opacity-40">
        <svg viewBox="0 0 1440 220" preserveAspectRatio="none" className="w-full h-full fill-emerald-500/50">
          <path d="M0,128L60,117.3C120,107,240,85,360,101.3C480,117,600,171,720,176C840,181,960,139,1080,117.3C1200,96,1320,96,1380,96L1440,96L1440,220L1380,220C1320,220,1200,220,1080,220C960,220,840,220,720,220C600,220,480,220,360,220C240,220,120,220,60,220L0,220Z" />
        </svg>
      </div>

      {/* Floating Sparkles & Lucky Clovers */}
      <motion.div
        animate={{ y: [0, -14, 0], rotate: [0, 15, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-28 left-10 text-2xl opacity-40"
      >
        🍀
      </motion.div>

      <motion.div
        animate={{ y: [0, -18, 0], rotate: [0, -20, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-36 right-12 text-2xl opacity-40"
      >
        🌸
      </motion.div>

      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute top-44 left-[6%] text-xl opacity-30"
      >
        ✨
      </motion.div>

      <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
        className="absolute top-52 right-[8%] text-xl opacity-30"
      >
        ✨
      </motion.div>
    </div>
  );
}
