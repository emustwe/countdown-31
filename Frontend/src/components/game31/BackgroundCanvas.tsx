"use client";

import React from "react";
import { motion } from "framer-motion";

export function BackgroundCanvas() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Sky Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-sky-100 to-amber-50 opacity-90" />

      {/* Sun glow in the top corner */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.9, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 blur-3xl opacity-70"
      />

      {/* Floating Cartoon Clouds */}
      <motion.div
        animate={{ x: [-100, 1400] }}
        transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
        className="absolute top-12 left-0 opacity-60"
      >
        <svg width="180" height="70" viewBox="0 0 180 70" fill="white">
          <ellipse cx="60" cy="40" rx="35" ry="25" />
          <ellipse cx="100" cy="30" rx="45" ry="28" />
          <ellipse cx="140" cy="42" rx="30" ry="20" />
        </svg>
      </motion.div>

      <motion.div
        animate={{ x: [-120, 1500] }}
        transition={{ duration: 58, repeat: Infinity, ease: "linear", delay: 18 }}
        className="absolute top-28 left-0 opacity-40 scale-75"
      >
        <svg width="180" height="70" viewBox="0 0 180 70" fill="white">
          <ellipse cx="60" cy="40" rx="35" ry="25" />
          <ellipse cx="100" cy="30" rx="45" ry="28" />
          <ellipse cx="140" cy="42" rx="30" ry="20" />
        </svg>
      </motion.div>

      {/* Rolling Cartoon Pasture Hills */}
      <div className="absolute -bottom-10 inset-x-0 h-44 opacity-25">
        {/* Back Hill */}
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="w-full h-full fill-emerald-300">
          <path d="M0 100 Q 300 40 600 90 T 1200 60 L 1200 200 L 0 200 Z" />
        </svg>
      </div>

      <div className="absolute -bottom-16 inset-x-0 h-44 opacity-35">
        {/* Front Hill */}
        <svg viewBox="0 0 1200 200" preserveAspectRatio="none" className="w-full h-full fill-emerald-400">
          <path d="M0 80 Q 400 130 800 60 T 1200 90 L 1200 200 L 0 200 Z" />
        </svg>
      </div>

      {/* Floating subtle daisy flowers & sparkles */}
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [0, 15, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-24 left-8 text-2xl opacity-40"
      >
        🌼
      </motion.div>

      <motion.div
        animate={{ y: [0, -16, 0], rotate: [0, -20, 0] }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute bottom-32 right-12 text-2xl opacity-40"
      >
        🌸
      </motion.div>

      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute bottom-20 left-1/4 text-xl opacity-35"
      >
        🍀
      </motion.div>

      <motion.div
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="absolute bottom-28 right-1/4 text-xl opacity-35"
      >
        🍀
      </motion.div>
    </div>
  );
}
