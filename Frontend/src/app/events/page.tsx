"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, ChevronRight, CircleUserRound, Gift, KeyRound, Lock, Trophy, UserPlus, Users, X } from "lucide-react";
import { PageShell } from "../../components/dune/Shell";
import { usePublicPromoTournaments } from "../../lib/hooks/useSponsors";
import { useAuthStore } from "../../stores/auth-store";

function fmtStart(iso: string | null): string {
  if (!iso) return "Open now";
  const d = new Date(iso);
  return d.getTime() <= Date.now() ? "Started" : d.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
// A tournament's schedule label: resolved start once voted, else the admin's GMT date pending a vote.
function fmtSchedule(startAt: string | null, startDate: string | null): string {
  if (startAt) return fmtStart(startAt);
  if (startDate) return new Date(startDate).toLocaleDateString([], { dateStyle: "medium", timeZone: "UTC" }) + " · time TBD";
  return "Open now";
}

// User Tournaments page — public and private tournaments as cards. Private ones show a "Private"
// badge and require a referral code at join time. "Enter" sends signed-in users to the detail page;
// guests get a sign-up / log-in gate.
export default function TournamentsHubPage() {
  const router = useRouter();
  const { data: tournaments } = usePublicPromoTournaments();
  const user = useAuthStore((s) => s.user); // gate on persisted user (token is memory-only, #4)
  const [gate, setGate] = useState(false);

  function onEnter(id: string) {
    if (user) router.push(`/events/${id}`);
    else setGate(true);
  }

  const list = tournaments ?? [];

  return (
    <PageShell className="events-page">
      <main className="page-main events-main">
        <section className="page-banner">
          <div>
            <h1>Tournaments</h1>
            <p>Join a tournament. Private ones need a referral code to enter.</p>
          </div>
        </section>

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
                <span className="event-card-ico">{t.type === "INFLUENCER" ? <Users size={22} /> : <Trophy size={22} />}</span>
                <div className="event-badges">
                  <span className={`event-type-badge ${t.type === "INFLUENCER" ? "influencer" : "regular"}`}>
                    {t.type === "INFLUENCER" ? <><Users size={11} /> Team battle</> : <><Trophy size={11} /> Knockout</>}
                  </span>
                  {t.visibility === "PRIVATE" && (
                    <span className="event-type-badge private"><Lock size={11} /> Private</span>
                  )}
                  {t.seekingSponsor && !t.sponsor && (
                    <span className="event-type-badge seeking"><Building2 size={11} /> Needs sponsor</span>
                  )}
                </div>
                {t.sponsor && <span className="event-sponsor">{t.sponsor.name}</span>}
                <h3>{t.title}</h3>
                <p>{t.description || "A brand-new tournament — enter to play."}</p>
                <div className="event-facts">
                  {t.prizePool && <span><Gift size={13} /> {t.prizePool}{t.type !== "INFLUENCER" && t.winnerCount > 1 ? ` · top ${t.winnerCount}` : ""}</span>}
                  <span><CalendarDays size={13} /> {fmtSchedule(t.startAt, t.startDate)}</span>
                  {t.visibility === "PRIVATE" && <span><KeyRound size={13} /> Referral code required to enter</span>}
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
