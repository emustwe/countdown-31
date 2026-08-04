"use client";

import { useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminNav } from "../../../components/dune/AdminNav";
import { useAnalytics } from "../../../lib/hooks/useAdmin";
import { formatUsdt } from "../../../lib/money";

export default function AdminAnalyticsPage() {
  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <AnalyticsContent />
      </div>
    </AdminGuard>
  );
}

const WINDOW_OPTIONS = [1, 7, 30, 90];

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="admin-card glass">
      <p className="muted" style={{ fontSize: 13, margin: 0 }}>{label}</p>
      <p style={{ marginTop: 4, fontSize: 26, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{value}</p>
      {sub && <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>{sub}</p>}
    </div>
  );
}

function AnalyticsContent() {
  const [days, setDays] = useState(7);
  const { data, isLoading } = useAnalytics(days);

  const maxWin = data?.topWins.reduce((max, w) => (BigInt(w.totalWin) > max ? BigInt(w.totalWin) : max), 0n) ?? 0n;

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">INSIGHTS</p>
          <h1>Analytics</h1>
          <p>Observed performance over the selected window.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {WINDOW_OPTIONS.map((opt) => (
            <button key={opt} onClick={() => setDays(opt)} className={days === opt ? "primary" : "secondary"} style={{ padding: "7px 13px", fontSize: 13 }}>
              {opt}d
            </button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <p className="muted" style={{ padding: 8 }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
            <StatTile label="Total spins" value={data.totalSpins.toLocaleString()} />
            <StatTile label="Active users" value={data.activeUsers.toLocaleString()} />
            <StatTile label="GGR (staked − returned)" value={formatUsdt(data.ggr)} sub={`staked ${formatUsdt(data.totalStaked)}`} />
            <StatTile label="Observed RTP" value={`${(data.observedRtp * 100).toFixed(2)}%`} />
          </div>

          <div className="admin-card glass">
            <h2 style={{ marginTop: 0, marginBottom: 16 }}>Top wins</h2>
            {data.topWins.length === 0 ? (
              <p className="muted" style={{ fontSize: 13 }}>No spins in this window yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {data.topWins.map((win) => {
                  const widthPct = maxWin > 0n ? Number((BigInt(win.totalWin) * 100n) / maxWin) : 0;
                  return (
                    <div key={win.roundId} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 13 }}>
                      <span style={{ width: 160, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--muted)" }}>{win.userEmail}</span>
                      <div style={{ height: 20, flex: 1, borderRadius: 6, background: "rgba(255,255,255,0.06)" }}>
                        <div style={{ height: 20, borderRadius: 6, background: "var(--cyan)", width: `${Math.max(widthPct, 2)}%` }} title={`${win.userEmail}: ${formatUsdt(win.totalWin)}`} />
                      </div>
                      <span style={{ width: 112, flexShrink: 0, textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--green)" }}>
                        {formatUsdt(win.totalWin)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
