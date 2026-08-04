"use client";

import { PageShell } from "../../components/dune/Shell";
import { CountDown31 } from "../../components/dune/CountDown31";

// The home screen is the live practice game (Count Down 31) — the landing "Enter" button lands
// players straight here. Everything else that used to be on the home page has been removed so the
// game is front and centre.
export default function HomePage() {
  return (
    <PageShell className="practice-page">
      <main className="page-main cd31-page">
        <CountDown31 />
      </main>
    </PageShell>
  );
}
