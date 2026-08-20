"use client";

import { PageShell } from "../../components/dune/Shell";
import { CountDown31 } from "../../components/dune/CountDown31";
import { PastureAmbiance } from "../../components/dune/PastureAmbiance";

// The home screen is the live practice game (Count Down 31) with joyful cow pasture theme.
export default function HomePage() {
  return (
    <PageShell className="practice-page relative">
      <PastureAmbiance />
      <main className="page-main cd31-page relative z-10">
        <CountDown31 />
      </main>
    </PageShell>
  );
}
