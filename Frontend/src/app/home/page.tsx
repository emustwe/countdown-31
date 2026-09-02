"use client";

import { useEffect, useState } from "react";
import { PageShell } from "../../components/dune/Shell";
import { CountDown31 } from "../../components/dune/CountDown31";
import { PastureAmbiance } from "../../components/dune/PastureAmbiance";
import { ArenaLoading } from "../../components/dune/ArenaLoading";

// The home screen is the live practice game (Thirty One 31) with joyful cow pasture theme.
export default function HomePage() {
  // A short loading beat before the arena mounts, so the game is set up cleanly before play.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const h = setTimeout(() => setLoading(false), 2500);
    return () => clearTimeout(h);
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
