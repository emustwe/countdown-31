"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Timer, Users, X } from "lucide-react";
import { PageShell, Pill } from "../../components/dune/Shell";
import { useGuestStore } from "../../stores/guest-store";
import { useAuthStore } from "../../stores/auth-store";

// The game page (reached directly from "Enter to the game"). It shows the upcoming game
// (Countdown 31 — coming soon) with a live view of the practice game people are playing, plus a
// button to jump into that same practice game. Countdown 31 itself is built later.
export default function PlayPage() {
  const router = useRouter();
  const guestName = useGuestStore((s) => s.username);
  const setGuestName = useGuestStore((s) => s.setUsername);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [ask, setAsk] = useState(false);
  const [name, setName] = useState("");

  function enterPractice() {
    // Always ask a guest for a display name first; only signed-in players skip it.
    if (accessToken) {
      router.push("/game/practice");
    } else {
      setName(guestName ?? "");
      setAsk(true);
    }
  }
  function submitName(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    setGuestName(n);
    router.push("/game/practice");
  }

  return (
    <PageShell className="play-page">
      <main className="page-main countdown-page">
        <header className="cd-head">
          <Pill tone="soon">COMING SOON</Pill>
          <h1>
            <Timer size={30} /> Countdown 31
          </h1>
          <p>A brand-new game is on its way. Meanwhile, watch the practice game live below — or jump in yourself.</p>
        </header>

        <section className="cd-live">
          <div className="cd-live-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/monster-carnival-home.png" alt="Practice game — live" />
            <span className="cd-live-badge">
              <i /> LIVE
            </span>
            <span className="cd-live-count">
              <Users size={14} /> practice in progress
            </span>
            <div className="cd-live-caption">People are playing the practice game right now</div>
          </div>
          <button className="primary xl cd-enter" onClick={enterPractice}>
            Enter the practice game <ChevronRight size={19} />
          </button>
        </section>
      </main>

      {ask && (
        <div className="name-overlay" onClick={() => setAsk(false)}>
          <form className="name-card" onClick={(e) => e.stopPropagation()} onSubmit={submitName}>
            <button type="button" className="modal-close" onClick={() => setAsk(false)} aria-label="Close">
              <X size={18} />
            </button>
            <h2>Choose a display name</h2>
            <p className="muted">Pick a name to play as. No account needed — you can sign up later.</p>
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={24} />
            <button type="submit" className="primary full xl" disabled={!name.trim()}>
              Enter the practice <ChevronRight size={18} />
            </button>
          </form>
        </div>
      )}
    </PageShell>
  );
}
