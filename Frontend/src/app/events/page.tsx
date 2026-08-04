"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleUserRound, Gift, KeyRound, Lock, Trophy, UserPlus, X } from "lucide-react";
import { PageShell } from "../../components/dune/Shell";
import { usePublicPromoTournaments, useRedeemJoinCode } from "../../lib/hooks/useSponsors";
import { useAuthStore } from "../../stores/auth-store";

function fmtStart(iso: string | null): string {
  if (!iso) return "Open now";
  const d = new Date(iso);
  return d.getTime() <= Date.now() ? "Started" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

// User Tournaments page — public tournaments as cards, plus a private-code box to unlock a private
// tournament. "Enter" sends signed-in users to the detail page; guests get a sign-up / log-in gate.
export default function TournamentsHubPage() {
  const router = useRouter();
  const { data: tournaments } = usePublicPromoTournaments();
  const accessToken = useAuthStore((s) => s.accessToken);
  const redeem = useRedeemJoinCode();
  const [gate, setGate] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");

  function onEnter(id: string) {
    if (accessToken) router.push(`/events/${id}`);
    else setGate(true);
  }

  async function onRedeem(e: React.FormEvent) {
    e.preventDefault();
    setCodeError("");
    if (!code.trim()) return;
    try {
      const t = await redeem.mutateAsync(code.trim());
      router.push(`/events/${t.id}?code=${encodeURIComponent(code.trim().toUpperCase())}`);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Invalid code");
    }
  }

  const list = tournaments ?? [];

  return (
    <PageShell className="events-page">
      <main className="page-main events-main">
        <section className="page-banner">
          <div>
            <h1>Tournaments</h1>
            <p>Join a public tournament, or unlock a private one with your referral code.</p>
          </div>
        </section>

        {/* Private code redeemer */}
        <form className="redeem-bar glass" onSubmit={onRedeem}>
          <span className="redeem-ico"><KeyRound size={16} /></span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Have a private referral code? Enter it here"
            style={{ textTransform: "uppercase" }}
          />
          <button className="secondary" type="submit" disabled={redeem.isPending || !code.trim()}>
            <Lock size={14} /> Unlock
          </button>
          {codeError && <small className="redeem-err">{codeError}</small>}
        </form>

        {list.length === 0 ? (
          <div className="placeholder-card" style={{ margin: "40px auto" }}>
            <span className="placeholder-icon"><Trophy size={34} /></span>
            <h1>No tournaments yet</h1>
            <p>Check back soon — new events are on the way.</p>
          </div>
        ) : (
          <div className="events-grid">
            {list.map((t) => (
              <div className="event-card glass" key={t.id}>
                <span className="event-card-ico"><Trophy size={22} /></span>
                {t.sponsor && <span className="event-sponsor">{t.sponsor.name}</span>}
                <h3>{t.title}</h3>
                <p>{t.description || "A brand-new tournament — enter to play."}</p>
                <div className="event-facts">
                  {t.prizePool && <span><Gift size={13} /> {t.prizePool}{t.winnerCount > 1 ? ` · top ${t.winnerCount}` : ""}</span>}
                  <span><Trophy size={13} /> {fmtStart(t.startAt)}</span>
                </div>
                <button className="primary full" onClick={() => onEnter(t.id)}>
                  Enter tournament <ChevronRight size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {gate && (
        <div className="name-overlay" onClick={() => setGate(false)}>
          <div className="name-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setGate(false)} aria-label="Close">
              <X size={18} />
            </button>
            <h2>Sign in to enter</h2>
            <p className="muted">Create an account or log in to join tournaments.</p>
            <div className="gate-actions">
              <button className="gate-login" onClick={() => router.push("/login")}>
                <CircleUserRound size={20} /> Log in
              </button>
              <button className="gate-signup" onClick={() => router.push("/register")}>
                <UserPlus size={20} /> Sign up
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
