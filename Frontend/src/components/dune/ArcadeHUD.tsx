"use client";

import React from "react";
import { Users, Trophy, Star, Clock, Wifi } from "lucide-react";

interface ArcadeHUDProps {
  playerCount: number;
  maxPlayers?: number;
  round: number;
  arenaName?: string;
  turnTime?: number;
  pingMs?: number;
}

export function ArcadeHUD({
  playerCount,
  maxPlayers = 4,
  round,
  arenaName = "Pasture",
  turnTime = 7,
  pingMs = 48,
}: ArcadeHUDProps) {
  return (
    <div className="w-full max-w-4xl mx-auto flex items-center justify-around bg-gradient-to-r from-[#0d1712]/95 via-[#060c09]/98 to-[#0d1712]/95 backdrop-blur-md border-2 border-amber-500/40 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-title font-bold text-amber-200/90 shadow-[0_10px_25px_rgba(0,0,0,0.8)] select-none my-2">
      {/* Players */}
      <div className="flex items-center gap-2">
        <Users size={18} className="text-amber-400 shrink-0" />
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[11px] text-amber-400/80 uppercase font-black tracking-wider">Players</span>
          <span className="text-white font-black text-xs sm:text-sm">{playerCount}/{maxPlayers}</span>
        </div>
      </div>

      <div className="w-[1px] h-6 bg-amber-500/30" />

      {/* Round */}
      <div className="flex items-center gap-2">
        <Trophy size={18} className="text-yellow-400 shrink-0" />
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[11px] text-amber-400/80 uppercase font-black tracking-wider">Round</span>
          <span className="text-white font-black text-xs sm:text-sm">{round}</span>
        </div>
      </div>

      <div className="w-[1px] h-6 bg-amber-500/30" />

      {/* Arena */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center shrink-0">
          <Star size={12} className="text-amber-300 fill-amber-300" />
        </div>
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[11px] text-amber-400/80 uppercase font-black tracking-wider">Arena</span>
          <span className="text-white font-black text-xs sm:text-sm">{arenaName}</span>
        </div>
      </div>

      <div className="w-[1px] h-6 bg-amber-500/30 hidden sm:block" />

      {/* Turn Time */}
      <div className="flex items-center gap-2 hidden sm:flex">
        <Clock size={18} className="text-amber-400 shrink-0" />
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[11px] text-amber-400/80 uppercase font-black tracking-wider">Turn Time</span>
          <span className="text-white font-black text-xs sm:text-sm">{turnTime}s</span>
        </div>
      </div>

      <div className="w-[1px] h-6 bg-amber-500/30" />

      {/* Ping Status */}
      <div className="flex items-center gap-2">
        <Wifi size={18} className="text-emerald-400 shrink-0" />
        <div className="flex items-center gap-1.5 leading-none">
          <span className="text-[11px] text-emerald-400/80 uppercase font-black tracking-wider">Ping</span>
          <span className="text-emerald-300 font-black text-xs sm:text-sm">{pingMs}ms</span>
        </div>
      </div>
    </div>
  );
}
