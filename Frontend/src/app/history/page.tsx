"use client";

import React, { useState } from "react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";

const PAST_BATTLES = [
  { id: "b1", result: "VICTORY", opponent: "Daisy Cow 🌸", countReached: 30, myMoves: "18 ➔ 20 ➔ 23 ➔ 26 ➔ 30", date: "Today, 4:10 PM", trophies: "+45 🏆", coins: "+150 🪙", mode: "Skill Mode" },
  { id: "b2", result: "VICTORY", opponent: "Bessie AI 🐮", countReached: 29, myMoves: "15 ➔ 17 ➔ 21 ➔ 25 ➔ 29", date: "Today, 2:40 PM", trophies: "+38 🏆", coins: "+120 🪙", mode: "Classic" },
  { id: "b3", result: "DEFEAT", opponent: "Barnaby Horns 👑", countReached: 31, myMoves: "19 ➔ 22 ➔ 27 ➔ 31 (Bomb)", date: "Today, 1:15 PM", trophies: "-15 🏆", coins: "+20 🪙", mode: "Skill Mode" },
  { id: "b4", result: "VICTORY", opponent: "Daisy Cow 🌸", countReached: 30, myMoves: "10 ➔ 13 ➔ 18 ➔ 22 ➔ 30", date: "Yesterday", trophies: "+50 🏆", coins: "+200 🪙", mode: "Classic" },
  { id: "b5", result: "VICTORY", opponent: "Bessie AI 🐮", countReached: 28, myMoves: "7 ➔ 10 ➔ 14 ➔ 19 ➔ 28", date: "Yesterday", trophies: "+40 🏆", coins: "+140 🪙", mode: "Skill Mode" },
];

export default function HistoryPage() {
  const [showRules, setShowRules] = useState(false);

  return (
    <div className="friendly-page relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col justify-between p-2 sm:p-6 select-none text-white">
      {/* Background Pasture Atmosphere */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity"
        style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }}
      />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

      {/* Header */}
      <div className="relative z-20">
        <ArcadeHeader onOpenRules={() => setShowRules(true)} />
      </div>

      {/* Main History Arena - WITH DEDICATED TOP CLEARANCE (Zero Overlap) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-6">
        {/* The "PAST GAMES" hero banner — title, blurb and the PLAY AGAIN button — was removed; it ate
            a band of vertical space above the battle list. Home is in the arcade header. The heading
            stays for screen readers. */}
        <h1 className="sr-only">Past games</h1>

        {/* Battles List */}
        <div className="flex flex-col gap-3">
          {PAST_BATTLES.map((battle) => (
            <div
              key={battle.id}
              className="p-5 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 hover:border-amber-400 transition-all shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <span
                  className={`px-3 py-1.5 rounded-2xl text-xs font-title font-black shadow ${
                    battle.result === "VICTORY"
                      ? "bg-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
                      : "bg-rose-600 text-white"
                  }`}
                >
                  {battle.result}
                </span>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-title font-black text-base sm:text-lg text-white">
                      vs. {battle.opponent}
                    </h3>
                    <span className="text-[10px] font-title font-bold text-amber-300 bg-black/60 px-2 py-0.5 rounded border border-amber-400/40">
                      {battle.mode}
                    </span>
                    {/* The outcome summary the Settings match-history card used to show ("Conquered 31",
                        "Hit 31 Bomb"). countReached was already in the data but never rendered. */}
                    <span
                      className={`text-[10px] font-title font-bold px-2 py-0.5 rounded border ${
                        battle.countReached >= 31
                          ? "text-rose-300 bg-rose-950/60 border-rose-400/40"
                          : "text-slate-300 bg-black/60 border-white/15"
                      }`}
                    >
                      {battle.countReached >= 31 ? "Hit 31 💣" : `Reached ${battle.countReached}`}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mt-0.5">
                    Move Sequence: <b className="text-slate-200">{battle.myMoves}</b>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 font-title font-black text-sm">
                <span className="text-xs text-slate-400">{battle.date}</span>
                <span className={battle.result === "VICTORY" ? "text-emerald-400" : "text-rose-400"}>
                  {battle.trophies}
                </span>
                <span className="text-amber-300">
                  {battle.coins}
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      <OfficialRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  );
}
