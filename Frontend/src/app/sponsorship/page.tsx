"use client";

import React, { useState } from "react";
import { Handshake, Ticket, Trophy, Sparkles, Building2, CheckCircle2, Send, Mail, ShieldCheck, Users, X } from "lucide-react";
import { ArcadeHeader } from "../../components/dune/ArcadeHeader";
import { ArcadeDrawerMenu } from "../../components/dune/ArcadeDrawerMenu";
import { OfficialRulesModal } from "../../components/dune/OfficialRulesModal";
import { AuthGate } from "../../components/AuthGate";
import { useAuthStore } from "../../stores/auth-store";
import { useSponsorshipOpportunities, useCreateInquiry, type PromoTournament } from "../../lib/hooks/useSponsors";
import { useProfile } from "../../lib/hooks/useAuth";
import { soundManager } from "../../lib/soundManager";

type ContactState = { type: "SPONSORSHIP" | "ENTRY"; tournamentId?: string; title?: string; ref?: string } | null;

const refOf = (id: string) => "#" + id.slice(0, 6).toUpperCase();

export default function SponsorshipPage() {
  const { data: opportunities, isLoading } = useSponsorshipOpportunities();
  const createInquiry = useCreateInquiry();
  const accessToken = useAuthStore((s) => s.accessToken);
  const { data: profile } = useProfile();

  const [contact, setContact] = useState<ContactState>(null);
  const [gate, setGate] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Form state for modal
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [formErr, setFormErr] = useState("");
  const [formOk, setFormOk] = useState(false);

  function requestEntry() {
    soundManager.playClick();
    if (accessToken) setContact({ type: "ENTRY" });
    else setGate(true);
  }

  function openSponsorInquiry(t?: PromoTournament) {
    soundManager.playClick();
    if (t) {
      setContact({ type: "SPONSORSHIP", tournamentId: t.id, title: t.title, ref: refOf(t.id) });
    } else {
      setContact({ type: "SPONSORSHIP" });
    }
  }

  async function handleSubmitInquiry(e: React.FormEvent) {
    e.preventDefault();
    soundManager.playClick();
    if (!contact) return;
    setFormErr("");
    const em = (profile?.email || email).trim();
    if (!em) {
      setFormErr("Please provide an email address.");
      return;
    }
    try {
      await createInquiry.mutateAsync({
        type: contact.type,
        tournamentId: contact.tournamentId,
        email: em,
        message: message.trim() || undefined,
      });
      setFormOk(true);
      setTimeout(() => {
        setFormOk(false);
        setContact(null);
        setMessage("");
      }, 2500);
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Failed to send inquiry.");
    }
  }

  const list = opportunities ?? [];

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

      {/* Main Sponsorship Hub - WITH DEDICATED TOP CLEARANCE (Zero Overlap) */}
      <main className="relative z-10 w-full max-w-6xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-6">
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
                Sponsor a tournament, get co-branded custom assets, or request access to high-stakes private invitationals.
              </p>
            </div>
          </div>
        </div>

        {/* Two Primary Interactive CTAs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => openSponsorInquiry()}
            className="p-6 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/60 hover:border-amber-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center gap-4 text-left cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
              <Handshake size={28} />
            </div>
            <div className="flex flex-col">
              <span className="font-title font-black text-lg text-amber-300">Become a Sponsor</span>
              <span className="text-xs text-slate-300 mt-0.5">Back a tournament, add branded arenas & cow cosmetics.</span>
            </div>
          </button>

          <button
            onClick={requestEntry}
            className="p-6 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-emerald-400/60 hover:border-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center gap-4 text-left cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-300 group-hover:scale-110 transition-transform">
              <Ticket size={28} />
            </div>
            <div className="flex flex-col">
              <span className="font-title font-black text-lg text-emerald-300">Request Tournament Entry</span>
              <span className="text-xs text-slate-300 mt-0.5">Ask tournament hosts or admins for private arena access.</span>
            </div>
          </button>
        </div>

        {/* Live Opportunities Section from Backend API */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-title font-black text-base text-amber-300 uppercase tracking-widest flex items-center gap-2">
              <Trophy size={18} className="text-yellow-400" />
              <span>TOURNAMENTS OPEN FOR SPONSORSHIP</span>
            </span>
            <span className="text-xs font-title font-bold text-slate-400">
              {list.length} Opportunities
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-title font-bold">
              Loading sponsorship opportunities...
            </div>
          ) : list.length === 0 ? (
            <div className="p-8 rounded-3xl bg-black/60 border border-slate-800 text-center flex flex-col items-center gap-2">
              <Building2 size={32} className="text-slate-500" />
              <span className="font-title font-bold text-slate-300">No tournaments currently seeking sponsors.</span>
              <span className="text-xs text-slate-500">You can still submit a general sponsorship proposal above!</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {list.map((t) => (
                <div
                  key={t.id}
                  className="p-5 rounded-3xl bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/50 hover:border-amber-400 transition-all shadow-xl flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-title font-black text-sm text-white">{t.title}</span>
                    <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-400/40">
                      {refOf(t.id)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    {t.description || "Exciting upcoming competitive 31 tournament seeking brand partnership."}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-title font-bold">
                      <Users size={14} className="text-cyan-400" />
                      <span>{t.maxPlayers ?? 64} Players</span>
                    </span>

                    <button
                      onClick={() => openSponsorInquiry(t)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-title font-black text-xs hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow"
                    >
                      SPONSOR THIS TOURNAMENT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Inquiry Modal */}
      {contact && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-gradient-to-b from-[#192b20] via-[#0e1a13] to-[#060c08] border-2 border-amber-400 p-6 shadow-2xl flex flex-col gap-4 relative animate-scaleUp">
            <button
              onClick={() => setContact(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-black/40 cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
                {contact.type === "SPONSORSHIP" ? <Handshake size={20} /> : <Ticket size={20} />}
              </div>
              <div>
                <h3 className="font-title font-black text-lg text-white">
                  {contact.type === "SPONSORSHIP" ? "Sponsorship Proposal" : "Request Tournament Entry"}
                </h3>
                {contact.title && (
                  <span className="text-xs text-amber-300">{contact.title} ({contact.ref})</span>
                )}
              </div>
            </div>

            {formOk ? (
              <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-400 flex flex-col items-center text-center gap-2">
                <CheckCircle2 size={36} className="text-emerald-400 animate-bounce" />
                <span className="font-title font-black text-base text-white">Inquiry Sent Successfully!</span>
                <p className="text-xs text-slate-300">
                  Our team will reach out to your email address shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitInquiry} className="flex flex-col gap-3">
                {!profile?.email && (
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-title font-bold text-slate-300">Your Email Address:</label>
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-white font-title text-sm focus:border-amber-400 outline-none"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-title font-bold text-slate-300">Message / Brand Details:</label>
                  <textarea
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      contact.type === "SPONSORSHIP"
                        ? "Tell us about your brand, budget, and desired activation..."
                        : "Tell the host why you would like an invite to this tournament..."
                    }
                    className="px-4 py-2.5 rounded-xl bg-black/70 border border-slate-700 text-white font-title text-sm focus:border-amber-400 outline-none resize-none"
                  />
                </div>

                {formErr && <span className="text-xs text-rose-400 font-bold">{formErr}</span>}

                <button
                  type="submit"
                  disabled={createInquiry.isPending}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.7)] hover:brightness-110 active:scale-95 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  <span>{createInquiry.isPending ? "SENDING..." : "SUBMIT INQUIRY"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* AuthGate for Guests */}
      <AuthGate
        open={gate}
        onClose={() => setGate(false)}
        title="Sign in required"
        message="Please sign in or register to request entry to private tournaments."
      />

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
