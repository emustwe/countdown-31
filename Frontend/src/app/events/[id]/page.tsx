"use client";

import { Trophy } from "lucide-react";
import { PageShell } from "../../../components/dune/Shell";

// A specific tournament — coming soon for now (the actual tournament experience is built later).
export default function EventDetailPage() {
  return (
    <PageShell className="events-page">
      <main className="page-main placeholder-page">
        <div className="placeholder-card">
          <span className="placeholder-icon">
            <Trophy size={34} />
          </span>
          <h1>Tournament</h1>
          <p>Coming soon — this tournament will open here.</p>
        </div>
      </main>
    </PageShell>
  );
}
