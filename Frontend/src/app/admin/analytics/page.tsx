"use client";

import { useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminShell } from "../../../components/AdminShell";
import { useAnalytics } from "../../../lib/hooks/useAdmin";
import { formatMinorUnits } from "../../../lib/money";

export default function AdminAnalyticsPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <AnalyticsContent />
      </AdminShell>
    </AdminGuard>
  );
}

const WINDOW_OPTIONS = [1, 7, 30, 90];

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface rounded-lg p-5">
      <p className="text-sm text-[var(--color-text-dim)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--color-text-dim)]">{sub}</p>}
    </div>
  );
}

function AnalyticsContent() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useAnalytics(days);

  const maxWin = data?.topWins.reduce((max, w) => (BigInt(w.totalWin) > max ? BigInt(w.totalWin) : max), 0n) ?? 0n;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-semibold">Analytics</h1>
          <p className="text-[var(--color-text-dim)]">Observed performance over the selected window.</p>
        </div>
        <div className="flex gap-2">
          {WINDOW_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setDays(opt)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                days === opt
                  ? "bg-[var(--color-accent)] font-semibold text-black"
                  : "border border-[var(--color-border)] text-[var(--color-text-dim)]"
              }`}
            >
              {opt}d
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-[var(--color-text-dim)]">Loading…</p>
      ) : (
        <>
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Total spins" value={data.totalSpins.toLocaleString()} />
            <StatTile label="Active users" value={data.activeUsers.toLocaleString()} />
            <StatTile
              label="GGR (staked − returned)"
              value={formatMinorUnits(data.ggr)}
              sub={`staked ${formatMinorUnits(data.totalStaked)}`}
            />
            <StatTile label="Observed RTP" value={`${(data.observedRtp * 100).toFixed(2)}%`} />
          </div>

          <div className="surface rounded-lg p-6">
            <h2 className="mb-4 font-semibold">Top wins</h2>
            {data.topWins.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dim)]">No spins in this window yet.</p>
            ) : (
              <div className="space-y-2">
                {data.topWins.map((win) => {
                  const widthPct = maxWin > 0n ? Number((BigInt(win.totalWin) * 100n) / maxWin) : 0;
                  return (
                    <div key={win.roundId} className="flex items-center gap-3 text-sm">
                      <span className="w-40 shrink-0 truncate text-[var(--color-text-dim)]">{win.userEmail}</span>
                      <div className="h-5 flex-1 rounded bg-[var(--color-surface-2)]">
                        <div
                          className="h-5 rounded bg-[var(--color-accent-2)]"
                          style={{ width: `${Math.max(widthPct, 2)}%` }}
                          title={`${win.userEmail}: ${formatMinorUnits(win.totalWin)}`}
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right tabular-nums text-[var(--color-win)]">
                        {formatMinorUnits(win.totalWin)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
