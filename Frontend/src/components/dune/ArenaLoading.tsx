"use client";

import { motion } from "framer-motion";

/**
 * A short branded loading takeover shown while the arena is prepared — used both when entering a
 * practice game and after the tournament wheel picks the starting order (so all players are seated /
 * the pasture is shuffled before play begins).
 */
export function ArenaLoading({
  title = "Preparing the arena",
  subtitle = "Seating players & shuffling the pasture…",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-7 bg-[#070e0a] px-6 select-none overflow-hidden">
      <div className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-30 mix-blend-luminosity" style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }} />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35)_0%,#040906_92%)]" />

      <div className="relative flex flex-col items-center gap-6">
        {/* Spinning gold ring with the 31 badge + a bouncing cow. */}
        <div className="relative w-28 h-28 grid place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full border-4 border-amber-400/25 border-t-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.4)]"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, ease: "linear", duration: 1.1 }}
          />
          <motion.div
            className="w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 border-2 border-white grid place-items-center shadow-[0_6px_18px_rgba(245,158,11,0.9)]"
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
          >
            <span className="font-title font-black text-3xl text-amber-950 drop-shadow">31</span>
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-1.5 text-center">
          <h2 className="font-title font-black text-xl sm:text-2xl text-amber-300 uppercase tracking-widest drop-shadow">
            {title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 font-title font-bold">{subtitle}</p>
        </div>

        {/* Animated loading dots. */}
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-amber-400"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
