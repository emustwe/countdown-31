"use client";

import { useEffect, useState } from "react";
import { PageShell } from "../../components/dune/Shell";
import { CountDown31 } from "../../components/dune/CountDown31";
import { PastureAmbiance } from "../../components/dune/PastureAmbiance";
import { ArenaLoading } from "../../components/dune/ArenaLoading";
import { detectArenaV2 } from "../../lib/arena-skin";

/** v2 only: how long the arena takes to "prepare" before play. Deliberate theatre, not real work. */
const V2_ENTRY_MS = 3500;

// The home screen is the live practice game (Vera 31) with joyful cow pasture theme.
export default function HomePage() {
  // The arena mounts as soon as the client is hydrated. A fixed 2.5s timer used to live here and was
  // removed as dead time — the practice engine is ready the moment it mounts, so waiting only
  // delayed the PLAY button. One frame is all that is needed to avoid a hydration mismatch.
  //
  // v2 brings a hold back, ON PURPOSE: entering a match with no beat at all reads as a page load
  // rather than a game starting. 3.5s of the branded takeover, and only behind ?arena=v2 — the
  // default path stays as fast as it is now.
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (detectArenaV2()) {
      const t = setTimeout(() => setLoading(false), V2_ENTRY_MS);
      return () => clearTimeout(t);
    }
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
