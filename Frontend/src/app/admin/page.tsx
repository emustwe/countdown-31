"use client";

import React, { useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  Copy,
  Handshake,
  Link2,
  Mail,
  Ticket,
  Users,
  XCircle,
  Trophy,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Check,
} from "lucide-react";
import {
  usePromoOverview,
  useSponsors,
  useAdminPromoTournaments,
  useSetPromoStatus,
  useAdminInquiries,
  useSetInquiryStatus,
  useAssignSponsorToInquiry,
  type Inquiry,
} from "../../lib/hooks/useSponsors";
import { soundManager } from "../../lib/soundManager";

export default function NewAdminDashboardPage() {
  const { data: ov } = usePromoOverview();
  const { data: sponsors } = useSponsors();
  const { data: promos } = useAdminPromoTournaments();
  const { data: inquiries } = useAdminInquiries();
  const setStatus = useSetPromoStatus();
  const setInquiry = useSetInquiryStatus();
  const [assignFor, setAssignFor] = useState<Inquiry | null>(null);

  const pending = (promos ?? []).filter((t) => t.status === "PENDING");
  const openInquiries = (inquiries ?? []).filter((i) => i.status !== "CLOSED");

  const stats = [
    { label: "Total Players", value: ov?.totalUsers ?? "—", icon: Users, color: "from-amber-400 to-yellow-600" },
    { label: "Active (7 Days)", value: ov?.activeUsers7d ?? "—", icon: TrendingUp, color: "from-emerald-400 to-green-600" },
    { label: "New Today", value: ov?.newUsersToday ?? "—", icon: Sparkles, color: "from-cyan-400 to-blue-600" },
    { label: "Active Sponsors", value: ov?.sponsorCount ?? "—", icon: Building2, color: "from-purple-400 to-indigo-600" },
    { label: "Pending Approvals", value: ov?.pendingTournaments ?? "—", icon: Clock, color: "from-rose-400 to-amber-600" },
  ];

  return (
    <div className="flex flex-col gap-6 select-none font-sans">
      {/* Page Heading Marquee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-[#18281e]/90 via-[#0e1a13]/95 to-[#060c08] border-2 border-amber-400/60 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-title font-black text-amber-400 tracking-widest uppercase">
            <Sparkles size={13} />
            <span>OPERATIONAL DASHBOARD</span>
          </div>
          <h1 className="font-title font-black text-2xl sm:text-3xl text-white tracking-wide mt-0.5">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time player counts, tournament approvals, and partner sponsor pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-black/60 border border-emerald-400/40 text-emerald-400 font-title font-bold text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE SOCKET ENGINE</span>
          </span>
        </div>
      </div>

      {/* Hero Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((st) => {
          const Icon = st.icon;
          return (
            <div
              key={st.label}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-500/40 p-4 sm:p-5 shadow-lg flex flex-col justify-between gap-3 group hover:border-amber-400 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-title font-bold text-slate-400 uppercase tracking-wider">
                  {st.label}
                </span>
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${st.color} flex items-center justify-center text-slate-950 shadow-md`}>
                  <Icon size={16} />
                </div>
              </div>
              <span className="font-title font-black text-2xl sm:text-3xl text-white drop-shadow">
                {st.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main 2-Column Grid: Approvals & Sponsors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Pending Tournament Approvals (7 Cols) */}
        <div className="lg:col-span-7 rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
            <div>
              <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">
                VERIFICATION PIPELINE
              </span>
              <h2 className="font-title font-black text-lg text-white">
                Pending Sponsor Tournaments
              </h2>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
              <Clock size={16} />
            </div>
          </div>

          {pending.length === 0 ? (
            <div className="py-10 text-center text-slate-500 font-title font-bold text-xs flex flex-col items-center gap-2">
              <ShieldCheck size={28} className="text-emerald-400/60" />
              <span>All caught up! Zero pending approvals in queue.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-2xl bg-black/60 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400/60 transition-colors"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="font-title font-black text-sm text-white truncate">
                      {t.title}
                    </span>
                    <span className="text-xs text-amber-300/80">
                      {t.sponsor ? `By ${t.sponsor.name}` : "House Tournament"} · {t.description || "No description"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold mt-1">
                      Prize Pool: ${t.prizePool} USDT · {t.winnerCount} Winner(s)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setStatus.mutate({ id: t.id, action: "approve" });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-400 to-green-600 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <CheckCircle2 size={14} />
                      <span>APPROVE</span>
                    </button>
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setStatus.mutate({ id: t.id, action: "reject" });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-title font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <XCircle size={14} />
                      <span>REJECT</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Partner Sponsors Roster (5 Cols) */}
        <div className="lg:col-span-5 rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-5 sm:p-6 shadow-xl flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
            <div>
              <span className="text-[10px] font-title font-bold text-purple-400 uppercase tracking-widest">
                BRAND PARTNERS
              </span>
              <h2 className="font-title font-black text-lg text-white">
                Sponsors Roster
              </h2>
            </div>
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-400 flex items-center justify-center text-purple-300">
              <Building2 size={16} />
            </div>
          </div>

          {(sponsors ?? []).length === 0 ? (
            <div className="py-10 text-center text-slate-500 font-title font-bold text-xs">
              No sponsors registered yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {(sponsors ?? []).map((s) => (
                <div
                  key={s.id}
                  className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-400/60 flex items-center justify-center text-purple-300 font-title font-black">
                      <Building2 size={16} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-title font-black text-xs text-white truncate">
                        {s.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        @{s.username} · {s.tournamentCount} tournament(s)
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[9px] font-title font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase">
                    ACTIVE
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inquiries & Sponsorship Requests Console */}
      <div className="rounded-3xl bg-gradient-to-b from-[#18281e]/98 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/70 p-5 sm:p-6 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between pb-3 border-b border-amber-500/30">
          <div>
            <span className="text-[10px] font-title font-bold text-amber-400 uppercase tracking-widest">
              INBOUND PIPELINE
            </span>
            <h2 className="font-title font-black text-lg text-white">
              Sponsorship & Entry Inquiries
            </h2>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
            <Mail size={16} />
          </div>
        </div>

        {openInquiries.length === 0 ? (
          <div className="py-8 text-center text-slate-500 font-title font-bold text-xs">
            Zero open inquiry requests.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {openInquiries.map((i) => {
              const sponsorSpecific = i.type === "SPONSORSHIP" && !!i.tournament;
              return (
                <div
                  key={i.id}
                  className="p-4 rounded-2xl bg-black/60 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-title font-black uppercase flex items-center gap-1 ${
                        i.type === "SPONSORSHIP" ? "bg-purple-500 text-slate-950" : "bg-emerald-500 text-slate-950"
                      }`}>
                        {i.type === "SPONSORSHIP" ? <Handshake size={10} /> : <Ticket size={10} />}
                        <span>{i.type}</span>
                      </span>
                      <span className="font-title font-black text-sm text-white">
                        {i.name || i.email}
                      </span>
                      <span className="text-xs text-amber-300">
                        ({i.email})
                      </span>
                    </div>

                    <p className="text-xs text-slate-300">
                      {i.tournament?.title ? `Target Event: ${i.tournament.title}` : "General Sponsorship Inquiry"}
                    </p>

                    {i.message && (
                      <p className="text-xs text-slate-400 italic bg-black/40 p-2 rounded-xl border border-slate-800/80">
                        &ldquo;{i.message}&rdquo;
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sponsorSpecific && !i.sponsor && (
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setAssignFor(i);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-title font-bold text-xs flex items-center gap-1 shadow cursor-pointer"
                      >
                        <Link2 size={13} />
                        <span>Assign Sponsor</span>
                      </button>
                    )}
                    {i.status === "NEW" && (
                      <button
                        onClick={() => {
                          soundManager.playClick();
                          setInquiry.mutate({ id: i.id, status: "CONTACTED" });
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 size={13} />
                        <span>Mark Contacted</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        soundManager.playClick();
                        setInquiry.mutate({ id: i.id, status: "CLOSED" });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950 text-slate-400 hover:text-rose-300 font-title font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle size={13} />
                      <span>Close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Sponsor Modal */}
      {assignFor && <AssignSponsorModal inquiry={assignFor} onClose={() => setAssignFor(null)} />}
    </div>
  );
}

function AssignSponsorModal({ inquiry, onClose }: { inquiry: Inquiry; onClose: () => void }) {
  const assign = useAssignSponsorToInquiry();
  const [form, setForm] = useState({ name: inquiry.name ?? "", username: "", password: "" });
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  async function submit() {
    soundManager.playClick();
    setError("");
    try {
      const res = await assign.mutateAsync({
        id: inquiry.id,
        name: form.name.trim() || undefined,
        username: form.username.trim() || undefined,
        password: form.password.trim() || undefined,
      });
      if (res.credentials) setCreds(res.credentials);
      else onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not assign sponsor");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#18281e] via-[#0d1811] to-[#050a07] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4">
        {creds ? (
          <>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
              <Check size={24} />
            </div>
            <div>
              <h2 className="font-title font-black text-xl text-white">Sponsor Assigned ✓</h2>
              <p className="text-xs text-slate-300 mt-1">
                &ldquo;{inquiry.tournament?.title}&rdquo; is now attached to the new sponsor. Share these credentials with them:
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/80 border border-amber-500/40 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-title font-bold text-slate-400">USERNAME</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-amber-300 font-mono">{creds.username}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(creds.username);
                      setCopiedUser(true);
                      setTimeout(() => setCopiedUser(false), 2000);
                    }}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {copiedUser ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-title font-bold text-slate-400">PASSWORD</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-amber-300 font-mono">{creds.password}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(creds.password);
                      setCopiedPass(true);
                      setTimeout(() => setCopiedPass(false), 2000);
                    }}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {copiedPass ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow hover:brightness-110"
            >
              DONE
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="font-title font-black text-xl text-white">Assign a Sponsor</h2>
              <p className="text-xs text-slate-300 mt-1">
                For <b>{inquiry.tournament?.title}</b> requested by {inquiry.name || inquiry.email}.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-title font-bold text-slate-300">Sponsor Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Neon Corp"
                  className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-white outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-title font-bold text-slate-300">Username (optional)</span>
                <input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="auto if blank"
                  className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-white outline-none"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-title font-bold text-slate-300">Password (optional)</span>
                <input
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="auto if blank"
                  className="w-full bg-black/80 border-2 border-slate-700 focus:border-amber-400 rounded-xl py-2 px-3 text-sm text-white outline-none"
                />
              </label>
            </div>

            {error && <p className="text-xs text-rose-400 font-bold">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-2xl bg-black/60 border border-slate-700 text-slate-300 font-title font-bold text-xs"
              >
                CANCEL
              </button>
              <button
                onClick={submit}
                disabled={assign.isPending}
                className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-title font-black text-xs uppercase shadow hover:brightness-110"
              >
                {assign.isPending ? "ASSIGNING..." : "CREATE & ATTACH"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
