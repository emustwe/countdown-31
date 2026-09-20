"use client";

import React from "react";
import {
  Crown,
  Trophy,
  Flame,
  Swords,
  Award,
  Sparkles,
  Mail,
  Clock,
} from "lucide-react";
import { MasterAvatar } from "./MasterAvatar";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { useProfile } from "../../lib/hooks/useAuth";

/**
 * The full player-card / profile UI (hero banner + loadout + match history), with no page
 * chrome. Rendered as the "MY PROFILE" section of the Settings page (the standalone /profile route
 * was removed — Settings already showed the same panel). Match history lives on Past Games (/history).
 */
export function ProfilePanel() {
  const avatar = useAvatarStore();
  const { data: profile } = useProfile();

  const playerName = profile?.fullName || profile?.email?.split("@")[0] || "Player";
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Loading…";

  return (
    <div className="w-full flex flex-col gap-6">
      {/* Top Hero Banner: Avatar + Prestige Identity */}
      <div className="w-full bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 sm:border-3 border-amber-400/70 rounded-3xl p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center gap-6 justify-between">
        {/* Avatar Showcase */}
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-3 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)] shrink-0 bg-black">
            <MasterAvatar config={avatar} showLevel={true} level={12} showRarity={true} rarityText="Champion" rarityColor="#f59e0b" />
          </div>

          {/* Name, Title, Badges */}
          <div className="flex flex-col text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400 text-[10px] font-title font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
                <Crown size={12} className="text-yellow-400 fill-yellow-400" />
                <span>YOUR PLAYER CARD</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500 text-[10px] font-title font-black text-rose-300 flex items-center gap-1">
                <Flame size={11} className="text-rose-400 fill-rose-400 animate-pulse" />
                <span>5 WIN STREAK</span>
              </span>
            </div>

            <h1 className="font-title font-black text-2xl sm:text-4xl text-white tracking-wide drop-shadow">{playerName}</h1>

            <span className="text-xs sm:text-sm font-title font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
              <Sparkles size={14} />
              <span>🏆 {avatar.title}</span>
            </span>

            {/* Account Details Row */}
            <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 mt-3 flex-wrap">
              <span className="flex items-center gap-1">
                <Mail size={13} className="text-amber-400" />
                <span>{profile?.email ?? "Loading…"}</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} className="text-emerald-400" />
                <span>Member since: {memberSince}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Pillar */}
        <div className="grid grid-cols-2 gap-3 w-full md:w-auto shrink-0">
          <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-400/30 flex flex-col items-center justify-center text-center">
            <Trophy size={20} className="text-yellow-400 fill-yellow-400 mb-1" />
            <span className="font-title font-black text-xl text-white">1,250</span>
            <span className="text-[10px] font-title font-bold text-slate-400 uppercase">Trophy Rating</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/60 border border-emerald-400/30 flex flex-col items-center justify-center text-center">
            <Award size={20} className="text-emerald-400 mb-1" />
            <span className="font-title font-black text-xl text-emerald-300">82%</span>
            <span className="text-[10px] font-title font-bold text-slate-400 uppercase">Win Rate</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/60 border border-rose-400/30 flex flex-col items-center justify-center text-center">
            <Flame size={20} className="text-rose-400 fill-rose-400 mb-1" />
            <span className="font-title font-black text-xl text-rose-300">9 Wins</span>
            <span className="text-[10px] font-title font-bold text-slate-400 uppercase">Best Streak</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-black/60 border border-cyan-400/30 flex flex-col items-center justify-center text-center">
            <Swords size={20} className="text-cyan-400 mb-1" />
            <span className="font-title font-black text-xl text-cyan-300">142</span>
            <span className="text-[10px] font-title font-bold text-slate-400 uppercase">Total Matches</span>
          </div>
        </div>
      </div>
    </div>
  );
}
