"use client";

import { useEffect, useState } from "react";
import { PageShell } from "../../components/dune/Shell";
import { CountDown31 } from "../../components/dune/CountDown31";
import { PastureAmbiance } from "../../components/dune/PastureAmbiance";
import { ArenaLoading } from "../../components/dune/ArenaLoading";

// The home screen is the live practice game (Vera 31) with joyful cow pasture theme.
export default function HomePage() {
  // The arena mounts as soon as the client is hydrated. This used to hold a fixed 2.5s timer, which
  // was pure dead time — the local practice engine is ready the moment it mounts, so the wait only
  // delayed the PLAY button appearing. One frame is enough to avoid a hydration mismatch.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const h = requestAnimationFrame(() => setLoading(false));
    return () => cancelAnimationFrame(h);
  }, []);

  if (loading) return <ArenaLoading title="Loading the pasture" subtitle="Warming up the arena…" />;

  return (
    <PageShell className="practice-page relative">
      <PastureAmbiance />
      <main className="page-main cd31-page relative z-10">
        <CountDown31 />
      </main>
    </PageShell>
  );
}
