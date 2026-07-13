"use client";

import { useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminShell } from "../../../components/AdminShell";
import { useAdminTransactions } from "../../../lib/hooks/useAdmin";
import { formatMinorUnits } from "../../../lib/money";

export default function AdminTransactionsPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <TransactionsContent />
      </AdminShell>
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
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Transactions</h1>
      <p className="mb-6 text-[var(--color-text-dim)]">Every ledger entry across all wallets.</p>

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={userId}
          onChange={(e) => {
            setUserId(e.target.value);
            setCursors([undefined]);
          }}
          placeholder="Filter by user id…"
          className="w-64 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        />
        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setCursors([undefined]);
          }}
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "" ? "All types" : t}
            </option>
          ))}
        </select>
      </div>

      <div className="surface overflow-hidden rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-dim)]">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Ref</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-text-dim)]">
                  Loading…
                </td>
              </tr>
            )}
            {data?.entries.map((entry) => (
              <tr key={entry.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3">{entry.userEmail}</td>
                <td className="px-4 py-3">{entry.type}</td>
                <td className="px-4 py-3 text-[var(--color-text-dim)]">{entry.refType ?? "—"}</td>
                <td className="px-4 py-3 text-[var(--color-text-dim)]">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td
                  className={`px-4 py-3 text-right tabular-nums ${
                    entry.amount.startsWith("-") ? "text-[var(--color-danger)]" : "text-[var(--color-win)]"
                  }`}
                >
                  {formatMinorUnits(entry.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          disabled={cursors.length <= 1}
          onClick={() => setCursors((c) => c.slice(0, -1))}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Previous
        </button>
        <button
          disabled={!data?.nextCursor}
          onClick={() => setCursors((c) => [...c, data?.nextCursor ?? undefined])}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
