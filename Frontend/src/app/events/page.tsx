"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleUserRound, Trophy, UserPlus, X } from "lucide-react";
import { PageShell } from "../../components/dune/Shell";
import { usePublicPromoTournaments } from "../../lib/hooks/useSponsors";
import { useAuthStore } from "../../stores/auth-store";

// User Tournaments page — cards for the approved sponsor/promo tournaments. The "Enter" button on a
// card: signed-in users go to the tournament (coming soon for now); guests get a sign-up / log-in
// prompt first.
export default function TournamentsHubPage() {
  const router = useRouter();
  const { data: tournaments } = usePublicPromoTournaments();
  const accessToken = useAuthStore((s) => s.accessToken);
  const [gate, setGate] = useState(false);

  function onEnter(id: string) {
    if (accessToken) router.push(`/events/${id}`);
    else setGate(true);
  }

  const list = tournaments ?? [];

  return (
    <PageShell className="events-page">
      <main className="page-main events-main">
        <section className="page-banner">
          <div>
            <h1>Tournaments</h1>
            <p>Join a live event. Pick one and enter the arena.</p>
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
                <span className="event-card-ico"><Trophy size={22} /></span>
                {t.sponsor && <span className="event-sponsor">{t.sponsor.name}</span>}
                <h3>{t.title}</h3>
                <p>{t.description || "A brand-new tournament — enter to play."}</p>
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
