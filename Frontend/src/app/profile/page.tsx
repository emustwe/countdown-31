"use client";

import React, { useState } from "react";
import { Crown, Trophy, Flame, Zap, Shield, RotateCcw, Swords, Award, Calendar, CheckCircle2, Star, Sparkles, User, Mail, Wallet, Clock } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { MasterAvatar } from "../../components/dune/MasterAvatar";
import { useAvatarStore } from "../../stores/avatar-customization-store";
import { useProfile } from "../../lib/hooks/useAuth";
import { formatUsdt } from "../../lib/money";
import { soundManager } from "../../lib/soundManager";

const MATCH_HISTORY = [
  { id: "m1", result: "VICTORY", opponent: "Daisy Cow 🌸", score: "Conquered 31", date: "Just now", trophies: "+45 🏆", coins: "+150 🪙" },
  { id: "m2", result: "VICTORY", opponent: "Bessie AI 🐮", score: "Trap at #30", date: "15m ago", trophies: "+38 🏆", coins: "+120 🪙" },
  { id: "m3", result: "DEFEAT", opponent: "Barnaby Horns 👑", score: "Hit 31 Bomb", date: "1h ago", trophies: "-15 🏆", coins: "+20 🪙" },
  { id: "m4", result: "VICTORY", opponent: "Daisy Cow 🌸", score: "Conquered 31", date: "3h ago", trophies: "+50 🏆", coins: "+200 🪙" },
];

export default function ProfilePage() {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const avatar = useAvatarStore();
  const { data: profile, isLoading } = useProfile();

  const playerName = profile?.fullName || profile?.email?.split("@")[0] || "Sameer Khan";
  const memberSince = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "August 2026";
  const balanceUsdt = profile ? formatUsdt(profile.balance) : "1,250.00";

  return (
    <div className="relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-2 sm:p-6 select-none text-white">
      {/* Background Pasture Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

      {/* Header */}
      <div className="relative z-20">
        <ArcadeHeader onMenuClick={() => setShowDrawer(true)} />
      </div>

      {/* Main Profile Showcase - WITH DEDICATED TOP CLEARANCE (Zero Overlap) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-6">
        {/* Top Hero Banner: Avatar + Prestige Identity */}
        <div className="w-full bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 sm:border-3 border-amber-400/70 rounded-3xl p-5 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center gap-6 justify-between">
          {/* Avatar Showcase */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl overflow-hidden border-3 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.6)] shrink-0 bg-black">
              <MasterAvatar
                config={avatar}
                showLevel={true}
                level={12}
                showRarity={true}
                rarityText="Champion"
                rarityColor="#f59e0b"
              />
            </div>

            {/* Name, Title, Badges */}
            <div className="flex flex-col text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400 text-[10px] font-title font-black text-amber-300 uppercase tracking-widest flex items-center gap-1">
                  <Crown size={12} className="text-yellow-400 fill-yellow-400" />
                  <span>RANK #1 ARENA MASTER</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500 text-[10px] font-title font-black text-rose-300 flex items-center gap-1">
                  <Flame size={11} className="text-rose-400 fill-rose-400 animate-pulse" />
                  <span>5 WIN STREAK</span>
                </span>
              </div>

              <h1 className="font-title font-black text-2xl sm:text-4xl text-white tracking-wide drop-shadow">
                {playerName}
              </h1>

              <span className="text-xs sm:text-sm font-title font-bold text-emerald-400 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                <Sparkles size={14} />
                <span>🏆 {avatar.title}</span>
              </span>

              {/* Account Details Row */}
              <div className="flex items-center justify-center sm:justify-start gap-4 text-xs text-slate-400 mt-3 flex-wrap">
                <span className="flex items-center gap-1">
                  <Mail size={13} className="text-amber-400" />
                  <span>{profile?.email ?? "sameer@countdown31.com"}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={13} className="text-emerald-400" />
                  <span>Member since: {memberSince}</span>
                </span>
                <span className="flex items-center gap-1">
                  <Wallet size={13} className="text-cyan-400" />
                  <span>Balance: <b>${balanceUsdt} USDT</b></span>
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

        {/* 2-Column Grid: Equipped Battle Skills & Match History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Equipped Tactical Battle Skills */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-title font-black text-sm sm:text-base text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                <span>EQUIPPED LOADOUT</span>
              </span>
              <span className="text-[10px] font-title font-bold text-slate-400">
                2 Active Skills
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#082f49] to-black border-2 border-cyan-400/70 shadow-lg">
                <div className="p-2.5 rounded-xl bg-black/60 border border-cyan-400/40 text-cyan-300">
                  <RotateCcw size={22} />
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-title font-black text-sm text-white">Chrono Rewind</span>
                    <span className="text-[10px] font-title font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-400/50">-2 STEPS</span>
                  </div>
                  <span className="text-[11px] text-slate-300 mt-0.5">Rewinds the live counter back by -2 numbers.</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-[#451a03] to-black border-2 border-amber-400/70 shadow-lg">
                <div className="p-2.5 rounded-xl bg-black/60 border border-amber-400/40 text-amber-300">
                  <Zap size={22} className="fill-amber-300" />
                </div>
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-title font-black text-sm text-white">Turbo Leap</span>
                    <span className="text-[10px] font-title font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-400/50">+3 LEAP</span>
                  </div>
                  <span className="text-[11px] text-slate-300 mt-0.5">Instantly surges forward +3 numbers in a burst.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Match History Log */}
          <div className="lg:col-span-7 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-title font-black text-sm sm:text-base text-amber-300 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={16} />
                <span>RECENT MATCH HISTORY</span>
              </span>
              <span className="text-[10px] font-title font-bold text-emerald-400">
                Last 4 Battles
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {MATCH_HISTORY.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-black/60 border border-slate-800 hover:border-amber-400/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-title font-black shadow ${
                        match.result === "VICTORY"
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-rose-600 text-white"
                      }`}
                    >
                      {match.result}
                    </span>

                    <div className="flex flex-col">
                      <span className="font-title font-black text-xs sm:text-sm text-white">
                        vs. {match.opponent}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {match.score} · {match.date}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-title font-black text-xs sm:text-sm">
                    <span className={match.result === "VICTORY" ? "text-emerald-400" : "text-rose-400"}>
                      {match.trophies}
                    </span>
                    <span className="text-amber-300">
                      {match.coins}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Drawer & Modal */}
      <ArcadeDrawerMenu
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        onOpenRules={() => setShowRules(true)}
      />
      <OfficialRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  );
}
