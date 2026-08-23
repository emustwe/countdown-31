"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Sparkles, ArrowLeft } from "lucide-react";
import { soundManager } from "../../lib/soundManager";

export function NewAdminPlaceholder({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  const router = useRouter();

  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center py-12 select-none">
      <div className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 sm:border-3 border-amber-400/80 p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.25)] flex flex-col items-center text-center gap-4">
        {/* Glowing Icon Shield */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 border-2 border-amber-200 flex items-center justify-center text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.7)] mb-1">
          <Icon size={38} className="drop-shadow" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-title font-black text-amber-400 uppercase tracking-widest">
            <Sparkles size={12} />
            <span>MODULE CALIBRATION</span>
          </div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide mt-1">
            {title} Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xs leading-relaxed">
            This module is being connected to the live backend ledger and tournament database. Full controls coming soon.
          </p>
        </div>

        <button
          onClick={() => {
            soundManager.playClick();
            router.push("/admin");
          }}
          className="mt-4 px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:brightness-110 active:scale-98 transition-all cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft size={14} />
          <span>RETURN TO DASHBOARD</span>
        </button>
      </div>
    </div>
  );
}
