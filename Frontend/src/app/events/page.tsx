"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, KeyRound, Swords, Users, Clock, Award, Sparkles, Flame, ShieldAlert, ArrowRight } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { AuthGate } from "../../components/AuthGate";
import { usePublicPromoTournaments, useRedeemJoinCode } from "../../lib/hooks/useSponsors";
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
  const redeem = useRedeemJoinCode();

  const [showRules, setShowRules] = useState(false);
  const [gate, setGate] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  function onEnter(id: string) {
    soundManager.playClick();
    if (accessToken) {
      router.push(`/events/${id}`);
    } else {
      setGate(true);
    }
  }

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    setCodeError("");
    if (!code.trim()) return;
    try {
      const t = await redeem.mutateAsync(code.trim());
      setShowCodeModal(false);
      router.push(`/events/${t.id}?code=${encodeURIComponent(code.trim().toUpperCase())}`);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Invalid tournament code");
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
        {/* Top Hero Banner */}
        <div className="w-full bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 border-2 sm:border-3 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-xl">
              <Trophy size={32} />
            </div>
            <div>
              <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Flame size={12} className="text-rose-400 fill-rose-400" />
                <span>PLAY TOGETHER</span>
              </span>
              <h1 className="font-title font-black text-3xl sm:text-5xl text-white tracking-tight mt-0.5">
                TOURNAMENTS
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-lg">
                Pick a game below, or use a private code.
              </p>
            </div>
          </div>

          {/* Private tournaments are code-gated: open a popup that asks for the referral code. */}
          <button
            type="button"
            onClick={() => { soundManager.playClick(); setCode(""); setCodeError(""); setShowCodeModal(true); }}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-black/70 border border-amber-400/60 text-amber-300 font-title font-black text-xs sm:text-sm hover:border-amber-400 hover:text-white active:scale-95 transition-all cursor-pointer shadow-lg"
          >
            <KeyRound size={18} />
            <span>HAVE A PRIVATE CODE?</span>
          </button>
        </div>

        {/* Live Tournaments Grid */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-title font-black text-base text-amber-300 uppercase tracking-widest flex items-center gap-2">
              <Swords size={18} className="text-yellow-400" />
              <span>GAMES TO JOIN</span>
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
                    <span className="text-[10px] font-title font-black px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 shadow uppercase">
                      {t.status}
                    </span>

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

                  {/* Enter Button */}
                  <button
                    onClick={() => onEnter(t.id)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                      <span>JOIN GAME</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Private tournament referral-code popup */}
      {showCodeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none"
          onClick={() => setShowCodeModal(false)}
        >
          <form
            onSubmit={onRedeem}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-gradient-to-b from-[#132019] via-[#0a1410] to-[#050b08] p-6 rounded-3xl border-2 border-amber-400/80 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 text-white"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                <KeyRound size={20} />
              </div>
              <div>
                <h2 className="font-title font-black text-lg text-amber-300">PRIVATE TOURNAMENT</h2>
                <p className="text-xs text-slate-400">Enter the referral code you were given.</p>
              </div>
            </div>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. JOIN-XXXXXXXX"
              autoCapitalize="characters"
              className="w-full px-4 py-3 rounded-2xl bg-black/70 border border-amber-400/50 outline-none focus:border-amber-400 font-title font-black text-sm text-white placeholder:text-slate-500 tracking-wider"
            />
            {codeError && <span className="text-xs text-rose-400 font-bold">{codeError}</span>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCodeModal(false)}
                className="flex-1 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-slate-300 font-title font-black text-xs hover:text-white transition-all cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={redeem.isPending || !code.trim()}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {redeem.isPending ? "…" : "FIND TOURNAMENT"}
              </button>
            </div>
          </form>
        </div>
      )}

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
