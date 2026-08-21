"use client";

import { History as HistoryIcon } from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { PageShell, OrbIcon } from "../../components/dune/Shell";

// History is being rebuilt for the new tournament system. Placeholder for now.
export default function HistoryPage() {
  return (
    <AuthGuard>
      <PageShell>
        <main className="page-main">
          <div className="coming-soon-panel glass">
            <OrbIcon>
              <HistoryIcon size={26} />
            </OrbIcon>
            <h1>Your history</h1>
            <p>Your tournament and game history will appear here soon.</p>
          </div>
        </main>
      </PageShell>
    </AuthGuard>
  );
}
