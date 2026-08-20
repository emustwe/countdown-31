"use client";

import React, { useState } from "react";
import { Handshake, Ticket, Trophy, Sparkles, Building2, CheckCircle2, Send, Mail, ShieldCheck } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { soundManager } from "../../lib/soundManager";

export default function SponsorshipPage() {
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState("Tier 2: Co-Branded Arena Tournament ($1,500)");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    if (!brandName || !email) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setBrandName("");
      setEmail("");
    }, 4000);
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

      {/* Main Sponsorship Hub */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 my-4 flex flex-col gap-6">
        {/* Top Hero Banner */}
        <div className="w-full bg-gradient-to-r from-amber-950/95 via-[#132019]/95 to-amber-950/95 border-2 sm:border-3 border-amber-400/80 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow-xl">
              <Handshake size={32} />
            </div>
            <div>
              <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={12} className="text-yellow-400" />
                <span>BRAND COLLABORATIONS & TOURNAMENT SPONSORS</span>
              </span>
              <h1 className="font-title font-black text-3xl sm:text-5xl text-white tracking-tight mt-0.5">
                SPONSORSHIP HUB
              </h1>
              <p className="text-xs text-slate-300 mt-1 max-w-lg">
                Co-brand high-stakes 31 tournaments, custom branded cow skins, and reach thousands of passionate arcade players.
              </p>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Sponsorship Tiers + Inquiry Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Sponsorship Tiers */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Tier 1 */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 hover:border-amber-400 transition-all shadow-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-title font-black text-lg text-amber-300">🌾 Pasture Arena Banner Partner</span>
                <span className="px-3 py-0.5 rounded-full bg-amber-400/20 border border-amber-400 text-xs font-title font-black text-amber-300">
                  $500 / Tournament
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Your logo and brand billboard in the live 3D pasture arena during all tournament matches.
              </p>
            </div>

            {/* Tier 2 */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-emerald-400/70 hover:border-emerald-400 transition-all shadow-xl flex flex-col gap-2 relative overflow-hidden">
              <span className="absolute top-2 right-3 text-[9px] font-title font-black text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-400">
                MOST POPULAR
              </span>
              <div className="flex items-center justify-between">
                <span className="font-title font-black text-lg text-emerald-300">👑 Co-Branded 31 Knockout Cup</span>
                <span className="px-3 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400 text-xs font-title font-black text-emerald-300">
                  $1,500 / Season
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Fully named tournament (e.g. &apos;The [Your Brand] 31 Championship&apos;), custom trophy, and branded player badges.
              </p>
            </div>

            {/* Tier 3 */}
            <div className="p-5 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-purple-400/70 hover:border-purple-400 transition-all shadow-xl flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-title font-black text-lg text-purple-300">⚡ Exclusive Branded Cow Skin</span>
                <span className="px-3 py-0.5 rounded-full bg-purple-400/20 border border-purple-400 text-xs font-title font-black text-purple-300">
                  $3,500 Custom
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Our 3D designers build a custom branded varsity jacket, hat, or bull skin for players to unlock and wear globally.
              </p>
            </div>
          </div>

          {/* Right: Sponsor Application Form */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 rounded-3xl p-6 shadow-xl flex flex-col gap-4 justify-between">
            <div>
              <div className="flex items-center gap-2 border-b border-white/10 pb-2 mb-3">
                <Mail size={18} className="text-amber-400" />
                <span className="font-title font-black text-sm text-amber-300 uppercase tracking-wider">
                  SUBMIT SPONSORSHIP INQUIRY
                </span>
              </div>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-400 flex flex-col items-center text-center gap-2 my-auto">
                  <CheckCircle2 size={36} className="text-emerald-400 animate-bounce" />
                  <span className="font-title font-black text-base text-white">Inquiry Received!</span>
                  <p className="text-xs text-slate-300">
                    Our partnership team will email you within 24 hours to finalize your brand activation.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-title font-bold text-slate-300">Brand / Company Name:</label>
                    <input
                      required
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. RedBull, Solana..."
                      className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-white font-title text-sm focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-title font-bold text-slate-300">Contact Email:</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="partners@yourbrand.com"
                      className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-white font-title text-sm focus:border-amber-400 outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-title font-bold text-slate-300">Desired Sponsorship Tier:</label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                      className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-amber-300 font-title text-xs focus:border-amber-400 outline-none cursor-pointer"
                    >
                      <option className="bg-slate-950 text-white">Tier 1: Pasture Banner Partner ($500)</option>
                      <option className="bg-slate-950 text-white">Tier 2: Co-Branded Arena Tournament ($1,500)</option>
                      <option className="bg-slate-950 text-white">Tier 3: Custom Branded Cow Skin ($3,500)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-95 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send size={16} />
                    <span>CONNECT WITH OUR TEAM</span>
                  </button>
                </form>
              )}
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-400 border-t border-white/10 pt-2">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Official Count Down 31 esports & brand activation division.</span>
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
