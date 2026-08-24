"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Gift, KeyRound, Lock, Trophy, Users, Vote } from "lucide-react";
import { PageShell } from "../../../components/dune/Shell";
import { PastureAmbiance } from "../../../components/dune/PastureAmbiance";
import { ArcadeHeader } from "../../../components/dune/ArcadeHeader";
import { OfficialRulesModal } from "../../../components/dune/OfficialRulesModal";
import { CountDown31 } from "../../../components/dune/CountDown31";
import { usePromoDetail, useJoinPromo, useVoteStartTime } from "../../../lib/hooks/useSponsors";
import { useAuthStore } from "../../../stores/auth-store";
import { soundManager } from "../../../lib/soundManager";

function fmtGmtDate(iso: string | null): string {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleDateString([], { dateStyle: "full", timeZone: "UTC" });
}
function fmtGmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " GMT";
}
function fmtCountdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const hh = String(Math.floor((s % 86400) / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return (d > 0 ? `${d}d ` : "") + `${hh}:${mm}:${ss}`;
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const code = search.get("code") ?? undefined;
  const authed = !!useAuthStore((s) => s.user);

  const { data: t, isLoading, isError } = usePromoDetail(id, { code, authed });
  const join = useJoinPromo();
  const voteTime = useVoteStartTime();
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [refCode, setRefCode] = useState(code ?? "");
  const [showVote, setShowVote] = useState(false);
  const [slotPick, setSlotPick] = useState("");
  const [showRules, setShowRules] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);

  const isPrivate = t?.visibility === "PRIVATE";
  const hasTimeVote = (t?.timeOptions?.length ?? 0) > 0;
  const startMs = t?.startAt ? Date.parse(t.startAt) : null;
  const started = startMs != null && now >= startMs;
  // TEMPORARY: an always-open test tournament ("[TEST] …") can be entered any time (bypasses lobby).
  const isTest = !!t?.title?.startsWith("[TEST]");
  const canEnter = started || isTest;

  useEffect(() => {
    if (showVote && t) setSlotPick(t.myTimeVote ?? t.timeOptions?.[0] ?? "");
  }, [showVote, t]);

  async function onJoin() {
    setError("");
    if (!authed) {
      router.push("/register");
      return;
    }
    if (isPrivate && !refCode.trim()) {
      setError("Enter the tournament referral code to enter this private tournament.");
      return;
    }
    try {
      await join.mutateAsync({ id, joinCode: isPrivate ? refCode.trim() : undefined });
      if (hasTimeVote) setShowVote(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    }
  }

  async function submitVote() {
    if (!slotPick) return;
    try {
      await voteTime.mutateAsync({ id, slot: slotPick });
      setShowVote(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your vote");
    }
  }

  // In-game view: full-screen arcade, old nav hidden (only after the tournament has started).
  if (t && playing && canEnter) {
    return (
      <PageShell className="practice-page relative">
        <PastureAmbiance />
        <main className="page-main cd31-page relative z-10">
          <CountDown31 roomId={`tour:${id}`} />
        </main>
      </PageShell>
    );
  }

  return (
    <div className="friendly-page relative w-full min-h-screen bg-[#070e0a] overflow-x-hidden flex flex-col p-2 sm:p-6 select-none text-white">
      <div className="fixed inset-0 pointer-events-none bg-cover bg-center opacity-40 mix-blend-luminosity" style={{ backgroundImage: "url('/assets/barnaby/barnaby-field.jpg')" }} />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,#040906_90%)]" />

      <div className="relative z-20">
        <ArcadeHeader onOpenRules={() => setShowRules(true)} />
      </div>

      <main className="relative z-10 w-full max-w-3xl mx-auto flex-1 mt-8 sm:mt-12 md:mt-14 mb-6 flex flex-col gap-5">
        <button
          onClick={() => router.push("/events")}
          className="self-start flex items-center gap-1.5 text-amber-300 hover:text-white font-title font-bold text-xs cursor-pointer"
        >
          <ChevronLeft size={16} /> ALL TOURNAMENTS
        </button>

        {isLoading && (
          <div className="p-12 text-center text-slate-400 font-title font-bold">Loading…</div>
        )}

        {(isError || (!isLoading && !t)) && (
          <div className="p-8 rounded-3xl bg-black/60 border border-slate-800 text-center flex flex-col items-center gap-2">
            <Lock size={30} className="text-slate-500" />
            <h1 className="font-title font-black text-xl text-white">Not available</h1>
            <p className="text-xs text-slate-400 max-w-sm">This tournament is private or no longer open. If it&apos;s private, use its referral code on the Tournaments page.</p>
          </div>
        )}

        {t && (
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#192b20]/95 via-[#0e1a13]/98 to-[#060c08] border-2 border-amber-400/60 shadow-2xl flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-300 shadow">
                <Trophy size={26} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-title font-black text-2xl sm:text-3xl text-white truncate">{t.title}</h1>
                  <span className={`text-[10px] font-title font-black px-2 py-0.5 rounded-full uppercase ${isPrivate ? "bg-fuchsia-500/25 text-fuchsia-200" : "bg-emerald-500/25 text-emerald-200"}`}>
                    {isPrivate ? "Private" : "Public"}
                  </span>
                </div>
                {t.sponsor && <p className="text-xs text-amber-300/80 mt-0.5">Sponsored by {t.sponsor.name}</p>}
              </div>
            </div>

            <p className="text-sm text-slate-300">{t.description || "A brand-new tournament."}</p>

            {/* Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { icon: <Gift size={15} />, label: "Prize", value: t.prizePool || "—" },
                { icon: <Trophy size={15} />, label: "Winners", value: String(t.winnerCount) },
                { icon: <Users size={15} />, label: "Joined", value: String(t.entryCount) },
                { icon: <CalendarDays size={15} />, label: "Date (GMT)", value: fmtGmtDate(t.startDate) },
              ].map((f) => (
                <div key={f.label} className="p-3 rounded-2xl bg-black/60 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-[10px] font-title font-bold text-slate-400 uppercase flex items-center gap-1">{f.icon}{f.label}</span>
                  <span className="font-title font-black text-sm text-amber-300 truncate">{f.value}</span>
                </div>
              ))}
            </div>

            {/* Start-time vote survey (GMT) */}
            {hasTimeVote && (
              <div className="rounded-2xl border border-amber-400/40 bg-black/40 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-title font-bold text-slate-300 flex items-center gap-1.5"><Clock size={14} className="text-amber-400" /> START TIME (GMT) — VOTED BY PLAYERS</span>
                  <b className="text-amber-300 font-title text-sm">{t.startAt ? fmtGmt(t.startAt) : "Awaiting votes"}</b>
                </div>
                <div className="flex flex-col gap-2">
                  {(t.timeVotes ?? t.timeOptions.map((slot) => ({ slot, votes: 0 }))).map((v) => {
                    const total = (t.timeVotes ?? []).reduce((a, x) => a + x.votes, 0) || 1;
                    const pct = Math.round((v.votes / total) * 100);
                    const mine = t.myTimeVote === v.slot;
                    return (
                      <div key={v.slot} className="grid grid-cols-[64px_1fr_28px] items-center gap-3">
                        <span className={`font-title font-black text-xs ${mine ? "text-amber-300" : "text-slate-200"}`}>{v.slot}{mine && " ★"}</span>
                        <span className="h-2 rounded-full bg-white/10 overflow-hidden"><i className={`block h-full rounded-full ${mine ? "bg-gradient-to-r from-amber-400 to-yellow-500" : "bg-gradient-to-r from-sky-400 to-sky-500"}`} style={{ width: `${pct}%` }} /></span>
                        <span className="text-right font-title font-bold text-xs text-slate-400">{v.votes}</span>
                      </div>
                    );
                  })}
                </div>
                {t.joined && (
                  <button onClick={() => { soundManager.playClick(); setShowVote(true); }} className="mt-1 py-2 rounded-xl bg-black/60 border border-amber-400/50 text-amber-300 font-title font-black text-xs hover:text-white hover:border-amber-400 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                    <Vote size={14} /> {t.myTimeVote ? "CHANGE YOUR TIME VOTE" : "VOTE FOR THE START TIME"}
                  </button>
                )}
              </div>
            )}

            {/* Join / lobby / enter */}
            {t.joined ? (
              <>
                <div className="flex items-center gap-2 text-emerald-300 font-title font-bold text-sm"><CheckCircle2 size={18} /> You&apos;re in — knockout: last one standing wins.</div>
                {canEnter ? (
                  <button onClick={() => { soundManager.playClick(); setPlaying(true); }} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2">
                    <Trophy size={18} /> Enter the game
                  </button>
                ) : (
                  <div className="rounded-2xl border border-sky-400/40 bg-sky-500/10 p-4 flex items-center justify-center gap-2 text-sky-200 font-title font-bold text-sm">
                    <Clock size={16} />
                    {startMs != null ? (
                      <span>Starts in <b className="text-white font-title">{fmtCountdown(startMs - now)}</b> · {fmtGmt(t.startAt)}</span>
                    ) : (
                      <span>Start time not set yet{hasTimeVote ? " — vote for a time above" : ""}.</span>
                    )}
                  </div>
                )}
              </>
            ) : started && !isTest ? (
              <div className="rounded-2xl border border-slate-700 bg-black/50 p-4 flex items-center justify-center gap-2 text-slate-300 font-title font-bold text-sm"><Lock size={16} /> Entry closed — this tournament has already started.</div>
            ) : (
              <>
                {isPrivate && authed && (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-title font-bold text-slate-400 flex items-center gap-1"><KeyRound size={13} /> Tournament referral code (required)</span>
                    <input value={refCode} onChange={(e) => setRefCode(e.target.value)} placeholder="e.g. JOIN-XXXXXXXX" autoCapitalize="characters" className="px-4 py-3 rounded-2xl bg-black/70 border border-amber-400/50 outline-none focus:border-amber-400 font-title font-black text-sm text-white placeholder:text-slate-500 tracking-wider" />
                  </label>
                )}
                <button onClick={onJoin} disabled={join.isPending} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40">
                  {join.isPending ? "Joining…" : authed ? "Join tournament" : "Sign up to join"}
                </button>
              </>
            )}
            {error && <div className="text-xs text-rose-400 font-bold">{error}</div>}

            <p className="text-[11px] text-slate-500 text-center">Knockout Count Down 31 — every elimination shrinks the field until one winner remains. The game opens for everyone at the GMT start time.</p>
          </div>
        )}
      </main>

      {/* Start-time survey popup (GMT) — arcade themed */}
      {showVote && t && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none" onClick={() => setShowVote(false)}>
          <div className="relative w-full max-w-md bg-gradient-to-b from-[#132019] via-[#0a1410] to-[#050b08] p-6 rounded-3xl border-2 border-amber-400/80 shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col gap-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300"><Clock size={20} /></div>
              <div>
                <h2 className="font-title font-black text-lg text-amber-300">PICK A START TIME</h2>
                <p className="text-xs text-slate-400">On {fmtGmtDate(t.startDate)} · all times GMT — most-voted wins.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {t.timeOptions.map((slot) => (
                <button key={slot} type="button" onClick={() => setSlotPick(slot)} className={`py-3 rounded-2xl border font-title font-black text-sm flex items-center justify-center gap-1 transition-all cursor-pointer ${slotPick === slot ? "bg-amber-400/20 border-amber-400 text-amber-300" : "bg-black/60 border-slate-700 text-slate-200 hover:border-amber-400/60"}`}>
                  <Clock size={13} /> {slot}
                </button>
              ))}
            </div>
            <button onClick={submitVote} disabled={!slotPick || voteTime.isPending} className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-title font-black text-xs uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40">
              {voteTime.isPending ? "Saving…" : "Save my vote"}
            </button>
          </div>
        </div>
      )}

      <OfficialRulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
    </div>
  );
}
