"use client";

import { useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminNav } from "../../../components/dune/AdminNav";
import { useAdminTransactions } from "../../../lib/hooks/useAdmin";
import { formatUsdt } from "../../../lib/money";

export default function AdminTransactionsPage() {
  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <TransactionsContent />
      </div>
    </AdminGuard>
  );
}

const TYPES = ["", "DEPOSIT", "WITHDRAWAL", "BET_STAKE", "BET_WIN", "ADJUSTMENT"];

function TransactionsContent() {
  const [userId, setUserId] = useState("");
  const [type, setType] = useState("");
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const currentCursor = cursors[cursors.length - 1];

  const { data, isLoading } = useAdminTransactions({
    userId: userId || undefined,
    type: type || undefined,
    cursor: currentCursor,
  });

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">LEDGER</p>
          <h1>Transactions</h1>
          <p>Every ledger entry across all wallets.</p>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <input
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setCursors([undefined]);
          }}
          placeholder="Filter by user id…"
          className="admin-input"
          style={{ width: 260 }}
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setCursors([undefined]);
          }}
          className="admin-input"
          style={{ width: 200 }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "" ? "All types" : t}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-card glass" style={{ overflowX: "auto" }}>
        <table className="admin-data">
          <thead>
            <tr>
              <th>User</th>
              <th>Type</th>
              <th>Ref</th>
              <th>Date</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="admin-empty">Loading…</td>
              </tr>
            )}
            {!isLoading && (data?.entries.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">No transactions found.</td>
              </tr>
            )}
            {data?.entries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.userEmail}</td>
                <td>{entry.type}</td>
                <td style={{ color: "var(--muted)" }}>{entry.refType ?? "—"}</td>
                <td style={{ color: "var(--muted)" }}>{new Date(entry.createdAt).toLocaleString()}</td>
                <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: entry.amount.startsWith("-") ? "var(--danger)" : "var(--green)" }}>
                  {formatUsdt(entry.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
        <button className="secondary" disabled={cursors.length <= 1} onClick={() => setCursors((c) => c.slice(0, -1))} style={{ padding: "7px 14px", fontSize: 13 }}>
          Previous
        </button>
        <button className="secondary" disabled={!data?.nextCursor} onClick={() => setCursors((c) => [...c, data?.nextCursor ?? undefined])} style={{ padding: "7px 14px", fontSize: 13 }}>
          Next
        </button>
      </div>
    </main>
  );
}
