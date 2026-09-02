"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { LivePlayer } from "../../lib/hooks/useCountdownLive";

/**
 * Kickoff wheel: when a tournament reaches its start time the game auto-enters and this wheel spins
 * to pick who takes the FIRST turn. Players sit on the wheel NUMBERED in seating order; a pointer
 * sweeps around and decelerates to land on one player — the game then starts from that player and
 * proceeds onward in that same seating order. Purely presentational — the engine owns `spinEndsAt`
 * and the actual starting `currentId` (which this wheel lands on).
 */
export function KickoffWheel({
  players,
  spinEndsAt,
  startingId,
  now,
}: {
  players: LivePlayer[];
  spinEndsAt: number;
  startingId: string | null;
  now: number;
}) {
  const spinning = now < spinEndsAt;

  // Numbered ring in seating order (capped so a huge arena still renders cleanly). We ALWAYS keep the
  // starting player in the ring so the pointer lands on the real starter even in a 100-cow arena.
  const ring = useMemo(() => {
    const CAP = 16;
    const base = players.slice(0, CAP);
    if (startingId && !base.some((p) => p.id === startingId)) {
      const sp = players.find((p) => p.id === startingId);
      if (sp) return [...players.slice(0, CAP - 1), sp];
    }
    return base;
  }, [players, startingId]);
  const N = Math.max(1, ring.length);
  const seg = 360 / N;
  const targetIndex = Math.max(0, ring.findIndex((p) => p.id === startingId));
  const startingName = ring[targetIndex]?.name ?? "—";

  // Capture the total spin duration ONCE so the pointer eases to its landing over the whole phase.
  const durationRef = useRef<number>(Math.max(600, spinEndsAt - now));
  // The pointer sweeps several full turns and lands pointing at the target pip (angle = seg*index).
  const finalAngle = 360 * 5 + seg * targetIndex;

  // Trigger the CSS transition: start at 0, then flip to finalAngle on mount so it animates + lands.
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setAngle(finalAngle));
    return () => cancelAnimationFrame(raf);
  }, [finalAngle]);

  const radius = 120;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md select-none">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2 text-amber-300 font-title font-black text-lg uppercase tracking-widest">
          <Sparkles size={20} className="fill-yellow-400 text-yellow-400 animate-pulse" />
          <span>{spinning ? "Spinning for the starting cow…" : "First turn goes to"}</span>
        </div>

        <div className="relative w-72 h-72 sm:w-80 sm:h-80">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-amber-400/80 bg-[radial-gradient(circle,rgba(20,30,24,0.97),rgba(3,9,6,0.99))] shadow-[0_0_40px_rgba(245,158,11,0.5)]" />

          {/* Numbered player pips (static + upright) */}
          {ring.map((p, i) => {
            const isStart = !spinning && i === targetIndex;
            return (
              <div
                key={p.id}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ transform: `translate(-50%,-50%) rotate(${seg * i}deg) translateY(-${radius}px) rotate(${-seg * i}deg)` }}
              >
                <div
                  className={`flex flex-col items-center leading-none transition-all ${
                    isStart ? "scale-125" : ""
                  }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full font-title font-black text-[11px] border ${
                      isStart
                        ? "bg-emerald-400 text-slate-950 border-white shadow-[0_0_12px_rgba(52,211,153,0.9)]"
                        : "bg-black/70 text-amber-300 border-amber-400/60"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`mt-0.5 font-title font-black text-[8px] whitespace-nowrap ${
                      isStart ? "text-emerald-300" : "text-slate-300"
                    }`}
                  >
                    {p.name.replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 10) || "Cow"}
                  </span>
                </div>
              </div>
            );
          })}

          {/* Sweeping pointer that decelerates and lands on the chosen pip */}
          <div
            className="absolute left-1/2 bottom-1/2 origin-bottom z-10"
            style={{
              transform: `translateX(-50%) rotate(${angle}deg)`,
              transition: `transform ${durationRef.current}ms cubic-bezier(0.16, 1, 0.3, 1)`,
            }}
          >
            <div className="w-0 h-0 border-l-[9px] border-r-[9px] border-b-[110px] border-l-transparent border-r-transparent border-b-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
          </div>

          {/* Hub */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-14 h-14 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 border-2 border-white flex items-center justify-center font-title font-black text-slate-950 text-sm shadow">
            {spinning ? Math.max(0, Math.ceil((spinEndsAt - now) / 1000)) : "GO"}
          </div>
        </div>

        {!spinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="font-title font-black text-xl sm:text-2xl text-emerald-300 drop-shadow flex items-center gap-2"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-400 text-slate-950 text-base">
              {targetIndex + 1}
            </span>
            <span>{startingName} starts!</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
