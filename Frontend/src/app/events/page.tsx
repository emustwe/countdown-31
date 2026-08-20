"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, KeyRound, Swords, Users, Clock, Award, Sparkles, Flame, ShieldAlert, ArrowRight } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { soundManager } from "../../lib/soundManager";

interface TournamentCard {
  id: string;
  title: string;
  prizePool: string;
  entryFee: string;
  players: string;
  startTime: string;
  status: "LIVE" | "STARTING SOON" | "REGISTERING";
  badgeColor: string;
  arena: string;
}

const TOURNAMENTS: TournamentCard[] = [
  {
    id: "t1",
    title: "🌾 Pasture Grand Championship 31",
    prizePool: "$5,000 USDT",
    entryFee: "50 Coins",
    players: "32 / 64 Players",
    startTime: "Live in 12m",
    status: "STARTING SOON",
    badgeColor: "bg-amber-400 text-slate-950",
    arena: "Royal Pasture Arena",
  },
  {
    id: "t2",
    title: "⚡ Midnight Bull Knockout Blitz",
    prizePool: "$2,500 USDT",
    entryFee: "25 Coins",
    players: "48 / 64 Players",
    startTime: "Live in 45m",
    status: "REGISTERING",
    badgeColor: "bg-emerald-400 text-slate-950",
    arena: "Thunder Dome",
  },
  {
    id: "t3",
    title: "👑 High Roller Master 31 Cup",
    prizePool: "$10,000 USDT",
    entryFee: "250 Coins",
    players: "16 / 16 Players",
    startTime: "Round 2 in Progress",
    status: "LIVE",
    badgeColor: "bg-rose-500 text-white animate-pulse",
    arena: "Imperial Golden Pasture",
  },
];

export default function TournamentsHubPage() {
  const router = useRouter();
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [codeError, setCodeError] = useState("");

  function handleJoin(t: TournamentCard) {
    soundManager.playClick();
    router.push("/home");
  }

  function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    if (!joinCode.trim()) return;
    router.push("/home");
  }

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

      {/* Main Tournaments Hub */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 my-4 flex flex-col gap-6">
        {/* Top Hero Banner */}
        <div className="w-full bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 border-2 sm:border-3 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-xl">
              <Trophy size={32} />
            </div>
            <div>
              <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Flame size={12} className="text-rose-400 fill-rose-400" />
                <span>KNOCKOUT BRACKET ARENAS</span>
              </span>
              <h1 className="font-title font-black text-3xl sm:text-5xl text-white tracking-tight mt-0.5">
                TOURNAMENT ARENAS
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-lg">
                Climb the sequential bracket, dodge the lethal 31 bomb, and claim the $10,000 Pasture Grand Prize!
              </p>
            </div>
          </div>

          {/* Private Join Code Input Bar */}
          <form
            onSubmit={handleRedeem}
            className="w-full md:w-auto flex items-center bg-black/80 border border-amber-400/60 rounded-2xl p-1.5 shadow-lg"
          >
            <div className="flex items-center gap-2 px-3 text-amber-300">
              <KeyRound size={18} />
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter Private Code..."
                className="bg-transparent border-none outline-none font-title font-black text-xs sm:text-sm text-white placeholder:text-slate-500 w-36 sm:w-44"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-title font-black text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow"
            >
              UNLOCK
            </button>
          </form>
        </div>

        {/* Live Tournaments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TOURNAMENTS.map((t) => (
            <div
              key={t.id}
              className="relative rounded-3xl p-6 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 hover:border-amber-400 transition-all flex flex-col justify-between shadow-2xl gap-4 group"
            >
              {/* Header Status */}
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-title font-black px-3 py-0.5 rounded-full shadow ${t.badgeColor}`}>
                  {t.status}
                </span>

                <span className="text-xs font-title font-bold text-slate-400 flex items-center gap-1">
                  <Clock size={13} />
                  <span>{t.startTime}</span>
                </span>
              </div>

              {/* Title & Arena */}
              <div>
                <h3 className="font-title font-black text-lg sm:text-xl text-white group-hover:text-amber-300 transition-colors">
                  {t.title}
                </h3>
                <span className="text-xs text-slate-400">{t.arena}</span>
              </div>

              {/* Prize Pool & Entry Fee Info Box */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-black/60 border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-[10px] font-title font-bold text-slate-400 uppercase">Prize Pool</span>
                  <span className="font-title font-black text-base text-emerald-400">{t.prizePool}</span>
                </div>

                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-title font-bold text-slate-400 uppercase">Entry Fee</span>
                  <span className="font-title font-black text-base text-amber-300">{t.entryFee}</span>
                </div>
              </div>

              {/* Player Count & Join Button */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <span className="flex items-center gap-1 font-title font-bold">
                    <Users size={14} className="text-cyan-400" />
                    <span>{t.players}</span>
                  </span>
                  <span className="text-emerald-400 font-title font-bold">Single Elimination</span>
                </div>

                <button
                  onClick={() => handleJoin(t)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>ENTER TOURNAMENT</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ))}
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
