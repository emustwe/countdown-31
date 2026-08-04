"use client";

import { PageShell } from "../../../components/dune/Shell";
import { CountDown31 } from "../../../components/dune/CountDown31";

// Practice game screen: Count Down 31 (Player vs Computer). Shown with the platform navbar.
// Tournament integration comes later.
export default function PracticeGamePage() {
  return (
    <PageShell className="practice-page">
      <main className="page-main cd31-page">
        <CountDown31 />
      </main>
    </PageShell>
  );
}
