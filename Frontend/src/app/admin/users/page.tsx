"use client";

import { Fragment, useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminNav } from "../../../components/dune/AdminNav";
import { useAdminUsers, useUpdateUser } from "../../../lib/hooks/useAdmin";
import { parseUsdt, formatUsdt } from "../../../lib/money";
import { ApiError } from "../../../lib/api-client";
import type { AdminUser } from "../../../lib/api-types";

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <div className="admin-shell">
        <AdminNav />
        <UsersContent />
      </div>
    </AdminGuard>
  );
}

function AdjustBalanceForm({ user, onDone }: { user: AdminUser; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const updateUser = useUpdateUser();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const negative = amount.trim().startsWith("-");
      const magnitude = negative ? amount.trim().slice(1) : amount.trim();
      const minorUnits = parseUsdt(magnitude);
      await updateUser.mutateAsync({
        userId: user.id,
        balanceAdjustment: { amount: negative ? `-${minorUnits}` : minorUnits, reason },
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 10, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.04)", marginTop: 8 }}>
      <div>
        <label htmlFor={`amount-${user.id}`} style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          Amount (± credits)
        </label>
        <input id={`amount-${user.id}`} required value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50 or -25" className="admin-input" style={{ width: 140 }} />
      </div>
      <div>
        <label htmlFor={`reason-${user.id}`} style={{ display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
          Reason (audited)
        </label>
        <input id={`reason-${user.id}`} required minLength={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. bug compensation" className="admin-input" style={{ width: 240 }} />
      </div>
      <button type="submit" className="primary" disabled={updateUser.isPending} style={{ padding: "9px 16px", fontSize: 13 }}>
        Apply
      </button>
      <button type="button" onClick={onDone} className="link-btn" style={{ color: "var(--muted)", fontSize: 13 }}>
        Cancel
      </button>
      {error && <p style={{ width: "100%", color: "var(--danger)", fontSize: 13, margin: 0 }}>{error}</p>}
    </form>
  );
}

function UsersContent() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminUsers(search || undefined);
  const updateUser = useUpdateUser();
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);

  return (
    <main className="admin-main">
      <div className="admin-heading">
        <div>
          <p className="eyebrow">PLAYER MANAGEMENT</p>
          <h1>Users</h1>
          <p>Search, ban/unban, and adjust demo balances.</p>
        </div>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email…" className="admin-input" style={{ maxWidth: 360, marginBottom: 18 }} />

      <div className="admin-card glass" style={{ overflowX: "auto" }}>
        <table className="admin-data">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="admin-empty">Loading…</td>
              </tr>
            )}
            {!isLoading && (data?.users.length ?? 0) === 0 && (
              <tr>
                <td colSpan={5} className="admin-empty">No users found.</td>
              </tr>
            )}
            {data?.users.map((user) => (
              <Fragment key={user.id}>
                <tr>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <span className={`a-tag ${user.status === "ACTIVE" ? "ok" : "bad"}`}>{user.status}</span>
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{formatUsdt(user.balance)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 16 }}>
                      <button
                        onClick={() => updateUser.mutate({ userId: user.id, status: user.status === "ACTIVE" ? "BANNED" : "ACTIVE" })}
                        className="link-btn danger"
                      >
                        {user.status === "ACTIVE" ? "Ban" : "Unban"}
                      </button>
                      <button onClick={() => setAdjustingUserId(adjustingUserId === user.id ? null : user.id)} className="link-btn cyan">
                        Adjust balance
                      </button>
                    </div>
                  </td>
                </tr>
                {adjustingUserId === user.id && (
                  <tr>
                    <td colSpan={5} style={{ paddingTop: 0 }}>
                      <AdjustBalanceForm user={user} onDone={() => setAdjustingUserId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
