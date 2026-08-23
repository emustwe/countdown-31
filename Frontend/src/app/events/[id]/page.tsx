"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronLeft, Clock, Gift, Lock, Trophy, Unlock, Users, Vote } from "lucide-react";
import { PageShell } from "../../../components/dune/Shell";
import { PastureAmbiance } from "../../../components/dune/PastureAmbiance";
import { CountDown31 } from "../../../components/dune/CountDown31";
import { usePromoDetail, useJoinPromo, useVoteStartTime } from "../../../lib/hooks/useSponsors";
import { useAuthStore } from "../../../stores/auth-store";

// The admin-chosen GMT calendar date, shown as-is (no timezone shift).
function fmtGmtDate(iso: string | null): string {
  if (!iso) return "TBA";
  return new Date(iso).toLocaleDateString([], { dateStyle: "full", timeZone: "UTC" });
}
// The resolved start instant, rendered in GMT to match the "(GMT)" label.
function fmtGmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " GMT";
}
// A "starts in" countdown like "2d 04:12:33" / "04:12:33".
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
  const authed = !!useAuthStore((s) => s.user); // memory-only token → gate on the persisted user

  const { data: t, isLoading, isError } = usePromoDetail(id, { code, authed });
  const join = useJoinPromo();
  const voteTime = useVoteStartTime();
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);
  const [refCode, setRefCode] = useState(code ?? ""); // private tournament referral code
  const [showVote, setShowVote] = useState(false);
  const [slotPick, setSlotPick] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // Tick every second so the page flips from "starts in…" to "Enter the game" exactly at start.
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(h);
  }, []);

  const isPrivate = t?.visibility === "PRIVATE";
  const hasTimeVote = (t?.timeOptions?.length ?? 0) > 0;
  const startMs = t?.startAt ? Date.parse(t.startAt) : null;
  const started = startMs != null && now >= startMs; // the game only opens once the GMT start passes

  // Preselect the user's existing vote (or the leading slot) when the survey opens.
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
      // Right after joining, invite the player to vote the GMT start time (survey popup).
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

  // A joined player can ENTER only once the tournament has started; before that they wait in the
  // lobby (see below). The game itself renders full-screen with the arcade theme (old nav hidden).
  if (t && playing && started) {
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
    <PageShell className="events-page">
      <main className="page-main event-detail">
        <button className="text-button" onClick={() => router.push("/events")} style={{ marginBottom: 14 }}>
          <ChevronLeft size={16} /> All tournaments
        </button>

        {isLoading && <div className="placeholder-card"><p>Loading…</p></div>}

        {(isError || (!isLoading && !t)) && (
          <div className="placeholder-card">
            <span className="placeholder-icon"><Lock size={30} /></span>
            <h1>Not available</h1>
            <p>This tournament is private or no longer open. If it&apos;s private, use its referral code from the Tournaments page.</p>
          </div>
        )}

        {t && (
          <div className="event-detail-card glass">
            <div className="edc-head">
              <span className="event-card-ico"><Trophy size={24} /></span>
              <div>
                <div className="tourn-title">
                  <h1>{t.title}</h1>
                  <span className={`vis-pill ${t.visibility.toLowerCase()}`}>
                    {t.visibility === "PRIVATE" ? <Lock size={11} /> : <Unlock size={11} />} {t.visibility}
                  </span>
                </div>
                {t.sponsor && <p className="edc-sponsor">Sponsored by {t.sponsor.name}</p>}
              </div>
            </div>

            <p className="edc-desc">{t.description || "A brand-new tournament."}</p>

            <div className="edc-facts">
              <div><Gift size={16} /><span>Prize</span><b>{t.prizePool || "—"}</b></div>
              <div><Trophy size={16} /><span>Winners</span><b>{t.winnerCount}</b></div>
              <div><Users size={16} /><span>Joined</span><b>{t.entryCount}</b></div>
              <div><CalendarDays size={16} /><span>Date (GMT)</span><b>{fmtGmtDate(t.startDate)}</b></div>
            </div>

            {/* Start time: resolved from players' votes on the admin's GMT date. */}
            {hasTimeVote && (
              <div className="edc-timevote">
                <div className="etv-head">
                  <span><Clock size={15} /> Start time (GMT) — chosen by players</span>
                  <b>{t.startAt ? fmtGmt(t.startAt) : "Awaiting votes"}</b>
                </div>
                <div className="etv-bars">
                  {(t.timeVotes ?? t.timeOptions.map((slot) => ({ slot, votes: 0 }))).map((v) => {
                    const total = (t.timeVotes ?? []).reduce((a, x) => a + x.votes, 0) || 1;
                    const pct = Math.round((v.votes / total) * 100);
                    const mine = t.myTimeVote === v.slot;
                    return (
                      <div className={`etv-bar ${mine ? "mine" : ""}`} key={v.slot}>
                        <span className="etv-slot">{v.slot}{mine && <em> · your pick</em>}</span>
                        <span className="etv-track"><i style={{ width: `${pct}%` }} /></span>
                        <span className="etv-count">{v.votes}</span>
                      </div>
                    );
                  })}
                </div>
                {t.joined && (
                  <button className="secondary full" onClick={() => setShowVote(true)}>
                    <Vote size={15} /> {t.myTimeVote ? "Change your time vote" : "Vote for the start time"}
                  </button>
                )}
              </div>
            )}

            {t.joined ? (
              <>
                <div className="edc-joined">
                  <CheckCircle2 size={18} /> You&apos;re in — knockout: last one standing wins.
                </div>
                {started ? (
                  <button className="primary full xl" onClick={() => setPlaying(true)}>
                    <Trophy size={18} /> Enter the game
                  </button>
                ) : (
                  <div className="edc-countdown">
                    <Clock size={16} />
                    {startMs != null ? (
                      <>Starts in <b>{fmtCountdown(startMs - now)}</b> <span>· {fmtGmt(t.startAt)}</span></>
                    ) : (
                      <>Start time not set yet{hasTimeVote ? " — vote for a time above" : ""}.</>
                    )}
                  </div>
                )}
              </>
            ) : started ? (
              <div className="edc-closed"><Lock size={16} /> Entry closed — this tournament has already started.</div>
            ) : (
              <>
                {isPrivate && authed && (
                  <label className="edc-teamcode">
                    <span>Tournament referral code (required for this private tournament)</span>
                    <input
                      value={refCode}
                      onChange={(e) => setRefCode(e.target.value)}
                      placeholder="e.g. JOIN-XXXXXXXX"
                      autoCapitalize="characters"
                    />
                  </label>
                )}
                <button className="primary full xl" onClick={onJoin} disabled={join.isPending}>
                  {join.isPending ? "Joining…" : authed ? "Join tournament" : "Sign up to join"}
                </button>
              </>
            )}
            {error && <div className="sponsor-auth-err" style={{ marginTop: 10 }}>{error}</div>}

            <p className="edc-note">Knockout Count Down 31 — every elimination shrinks the field until one winner remains. The game opens for everyone at the GMT start time.</p>
          </div>
        )}

        {/* Start-time survey popup (GMT). */}
        {showVote && t && (
          <div className="cd31-gate-overlay" onClick={() => setShowVote(false)}>
            <div className="cd31-gate glass vote-gate" onClick={(e) => e.stopPropagation()}>
              <span className="cd31-gate-ico"><Clock size={22} /></span>
              <h2>Pick a start time</h2>
              <p>
                On <b>{fmtGmtDate(t.startDate)}</b>. All times are <b>GMT</b> so there&apos;s no timezone confusion — the most-voted slot becomes the official start.
              </p>
              <div className="vote-options">
                {t.timeOptions.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    className={`vote-option ${slotPick === slot ? "on" : ""}`}
                    onClick={() => setSlotPick(slot)}
                  >
                    <Clock size={14} /> {slot} <small>GMT</small>
                  </button>
                ))}
              </div>
              <button className="primary full xl" onClick={submitVote} disabled={!slotPick || voteTime.isPending}>
                {voteTime.isPending ? "Saving…" : "Save my vote"}
              </button>
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
}
