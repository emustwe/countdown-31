"use client";

import { useState } from "react";
import { Sparkles, Trophy, Users } from "lucide-react";
import { PageShell, OrbIcon } from "../../components/dune/Shell";
import { CountDown31 } from "../../components/dune/CountDown31";

// The home screen is the live practice game (Count Down 31). It now offers two practice modes,
// mirroring the two tournament types on the admin side: "Regular" (the standard knockout, live now)
// and "Skilled" (a skill-based mode — placeholder for now; the actual mode is built out later).
type PracticeMode = "regular" | "skilled";

export default function HomePage() {
  const [mode, setMode] = useState<PracticeMode>("regular");

  return (
    <PageShell className="practice-page">
      <main className="page-main cd31-page">
        <div className="tourn-sections practice-modes">
          <button className={`tourn-section-tab ${mode === "regular" ? "on" : ""}`} onClick={() => setMode("regular")}>
            <span className="tst-ico"><Trophy size={20} /></span>
            <span className="tst-body">
              <b>Regular</b>
              <small>The standard Count Down 31 knockout — last player standing wins.</small>
            </span>
          </button>
          <button className={`tourn-section-tab ${mode === "skilled" ? "on" : ""}`} onClick={() => setMode("skilled")}>
            <span className="tst-ico"><Users size={20} /></span>
            <span className="tst-body">
              <b>Skilled</b>
              <small>A skill-based mode — coming soon.</small>
            </span>
          </button>
        </div>

        {mode === "regular" ? (
          <CountDown31 />
        ) : (
          <div className="coming-soon-panel glass">
            <OrbIcon><Sparkles size={26} /></OrbIcon>
            <h1>Skilled mode</h1>
            <p>A skill-based practice mode is on the way. It&apos;ll live right here — check back soon.</p>
          </div>
        )}
      </main>
    </PageShell>
  );
}
