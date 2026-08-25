"use client";

import { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronLeft, Gift, Lock, Trophy, Unlock, Users } from "lucide-react";
import { PageShell } from "../../../components/dune/Shell";
import { CountDown31 } from "../../../components/dune/CountDown31";
import { usePromoDetail, useJoinPromo } from "../../../lib/hooks/useSponsors";
import { useAuthStore } from "../../../stores/auth-store";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const search = useSearchParams();
  const code = search.get("code") ?? undefined;
  const accessToken = useAuthStore((s) => s.accessToken);
  const authed = !!accessToken;

  const { data: t, isLoading, isError } = usePromoDetail(id, { code, authed });
  const join = useJoinPromo();
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(false);

  const started = !!t?.startAt && new Date(t.startAt).getTime() <= Date.now();

  async function onJoin() {
    setError("");
    if (!authed) {
      router.push("/register");
      return;
    }
    try {
      await join.mutateAsync({ id, joinCode: code });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join");
    }
  }

  // When a joined player enters the game, show the knockout Count Down 31 for this tournament's room.
  if (t && playing) {
    return (
      <div className="practice-page tournament-game-page">
        <button className="tournament-game-back text-button" onClick={() => setPlaying(false)}>
          <ChevronLeft size={16} /> Tournament details
        </button>
        <CountDown31 roomId={`tour:${id}`} />
      </div>
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
            <p>This tournament is private or no longer open. If it&apos;s private, enter your referral code on the Tournaments page.</p>
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
              <div><CheckCircle2 size={16} /><span>Starts</span><b>{fmt(t.startAt)}</b></div>
            </div>

            {t.joined ? (
              <>
                <div className="edc-joined"><CheckCircle2 size={18} /> You&apos;re in — knockout: last one standing wins.</div>
                <button className="primary full xl" onClick={() => setPlaying(true)}><Trophy size={18} /> Enter the game</button>
              </>
            ) : started ? (
              <div className="edc-closed"><Lock size={16} /> Entry closed — this tournament has already started.</div>
            ) : (
              <button className="primary full xl" onClick={onJoin} disabled={join.isPending}>
                {join.isPending ? "Joining…" : authed ? "Join tournament" : "Sign up to join"}
              </button>
            )}
            {error && <div className="sponsor-auth-err" style={{ marginTop: 10 }}>{error}</div>}

            <p className="edc-note">Knockout Count Down 31 — every elimination shrinks the field until one winner remains.</p>
          </div>
        )}
      </main>
    </PageShell>
  );
}
