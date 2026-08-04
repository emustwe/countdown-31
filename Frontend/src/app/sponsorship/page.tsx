"use client";

import { Handshake } from "lucide-react";
import { PageShell, OrbIcon } from "../../components/dune/Shell";

// Public "become a sponsor" hub — coming soon. Guests and players can both see it.
export default function SponsorshipPage() {
  return (
    <PageShell>
      <main className="page-main">
        <div className="coming-soon-panel glass">
          <OrbIcon>
            <Handshake size={26} />
          </OrbIcon>
          <h1>Sponsorship</h1>
          <p>Partner with WM Tournaments to run your own co-branded tournaments. Details coming soon.</p>
        </div>
      </main>
    </PageShell>
  );
}
