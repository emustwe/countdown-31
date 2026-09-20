"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, KeyRound, Swords, Users, Clock, Award, Sparkles, ShieldAlert, ArrowRight } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { AuthGate } from "../../components/AuthGate";
import { usePublicPromoTournaments } from "../../lib/hooks/useSponsors";
import { useAuthStore } from "../../stores/auth-store";
import { soundManager } from "../../lib/soundManager";

function fmtStart(iso: string | null): string {
  if (!iso) return "Open now";
  const d = new Date(iso);
  return d.getTime() <= Date.now() ? "Started" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function TournamentsHubPage() {
  const router = useRouter();
  const { data: tournaments, isLoading } = usePublicPromoTournaments();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [showRules, setShowRules] = useState(false);
  const [gate, setGate] = useState(false);

  function onEnter(id: string) {
    soundManager.playClick();
    if (accessToken) {
      router.push(`/events/${id}`);
    } else {
      setGate(true);
    }
  }

  const list = tournaments ?? [];

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

      {/* Main Tournaments Hub - WITH DEDICATED TOP CLEARANCE (Zero Overlap) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-6">
        {/* The big "TOURNAMENTS" hero banner was removed — it ate a whole screenful on phones and said
            nothing the "TOURNAMENTS TO JOIN" strip below doesn't. The page heading stays for screen readers. */}
        <h1 className="sr-only">Tournaments</h1>

        {/* Live Tournaments Grid */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-title font-black text-base text-amber-300 uppercase tracking-widest flex items-center gap-2">
              <Swords size={18} className="text-yellow-400" />
              <span>TOURNAMENTS TO JOIN</span>
            </span>
            <span className="text-xs font-title font-bold text-slate-400">
              {list.length} Arenas
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-title font-bold">
              Loading tournaments...
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 rounded-3xl bg-black/60 border border-slate-800 text-center flex flex-col items-center gap-2">
              <Trophy size={32} className="text-slate-500" />
              <span className="font-title font-bold text-slate-300">No public tournaments open right now.</span>
              <span className="text-xs text-slate-500">Try again soon, or use a private code.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((t) => (
                <div
                  key={t.id}
                  className="relative rounded-3xl p-6 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 hover:border-amber-400 transition-all flex flex-col justify-between shadow-2xl gap-4 group"
                >
                  {/* Header Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-title font-black px-3 py-0.5 rounded-full shadow uppercase ${t.finished ? "bg-fuchsia-500 text-white" : "bg-amber-400 text-slate-950"}`}>
                        {t.finished ? "Finished" : t.status}
                      </span>
                      {t.visibility === "PRIVATE" && (
                        <span className="text-[10px] font-title font-black px-2 py-0.5 rounded-full bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/40 shadow uppercase flex items-center gap-1">
                          <KeyRound size={11} /> Private
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-title font-bold text-slate-400 flex items-center gap-1">
                      <Clock size={13} />
                      <span>{fmtStart(t.startAt)}</span>
                    </span>
                  </div>

                  {/* Title & Arena */}
                  <div>
                    <h3 className="font-title font-black text-lg sm:text-xl text-white group-hover:text-amber-300 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {t.description || "Compete in the 31 knockout arena for massive glory and prizes!"}
                    </p>
                  </div>

                  {/* Info Box */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-2xl bg-black/60 border border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-title font-bold text-slate-400 uppercase">Max Players</span>
                      <span className="font-title font-black text-base text-emerald-400">{t.maxPlayers ?? 64}</span>
                    </div>

                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-title font-bold text-slate-400 uppercase">Elimination</span>
                      <span className="font-title font-black text-base text-amber-300">Single KO</span>
                    </div>
                  </div>

                  {/* Finished tournaments show the winner + a Watch button; otherwise a Join button. */}
                  {t.finished ? (
                    <>
                      <div className="w-full rounded-2xl bg-amber-500/10 border border-amber-400/50 p-2.5 text-center flex flex-col">
                        <span className="text-[10px] font-title font-bold text-amber-400/80 uppercase tracking-widest">🏆 Winner</span>
                        <span className="font-title font-black text-sm text-amber-300 truncate">
                          {t.winnerName ?? "Champion"}
                        </span>
                      </div>
                      <button
                        onClick={() => onEnter(t.id)}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-500 text-white font-title font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Award size={15} /> <span>WATCH THE WINNER</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => onEnter(t.id)}
                      className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {t.visibility === "PRIVATE" ? (
                        <>
                          <KeyRound size={14} />
                          <span>JOIN WITH CODE</span>
                        </>
                      ) : (
                        <>
                          <span>JOIN GAME</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* AuthGate for Guests */}
      <AuthGate
        open={gate}
        onClose={() => setGate(false)}
        title="Sign in required"
        message="Please sign in or create an account to enter competitive tournaments."
      />

      <OfficialRulesModal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
      />
    </div>
  );
}
