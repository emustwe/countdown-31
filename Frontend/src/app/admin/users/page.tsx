"use client";

import { Fragment, useState } from "react";
import { AdminGuard } from "../../../components/AdminGuard";
import { AdminShell } from "../../../components/AdminShell";
import { useAdminUsers, useUpdateUser } from "../../../lib/hooks/useAdmin";
import { creditsToMinorUnits, formatMinorUnits } from "../../../lib/money";
import { ApiError } from "../../../lib/api-client";
import type { AdminUser } from "../../../lib/api-types";

export default function AdminUsersPage() {
  return (
    <AdminGuard>
      <AdminShell>
        <UsersContent />
      </AdminShell>
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
      const minorUnits = creditsToMinorUnits(magnitude);
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
    <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap items-end gap-2 rounded-md bg-[var(--color-surface-2)] p-3">
      <div>
        <label htmlFor={`amount-${user.id}`} className="mb-1 block text-xs text-[var(--color-text-dim)]">
          Amount (± credits)
        </label>
        <input
          id={`amount-${user.id}`}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 50 or -25"
          className="w-32 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      </div>
      <div>
        <label htmlFor={`reason-${user.id}`} className="mb-1 block text-xs text-[var(--color-text-dim)]">
          Reason (audited)
        </label>
        <input
          id={`reason-${user.id}`}
          required
          minLength={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. bug compensation"
          className="w-56 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
        />
      </div>
      <button
        type="submit"
        disabled={updateUser.isPending}
        className="rounded-md bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-60"
      >
        Apply
      </button>
      <button type="button" onClick={onDone} className="text-sm text-[var(--color-text-dim)]">
        Cancel
      </button>
      {error && <p className="w-full text-sm text-[var(--color-danger)]">{error}</p>}
    </form>
  );
}

function UsersContent() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useAdminUsers(search || undefined);
  const updateUser = useUpdateUser();
  const [adjustingUserId, setAdjustingUserId] = useState<string | null>(null);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Users</h1>
      <p className="mb-6 text-[var(--color-text-dim)]">Search, ban/unban, and adjust demo balances.</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by email…"
        className="mb-4 w-full max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
      />

      <div className="surface overflow-hidden rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-dim)]">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Actions</th>
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
            {data?.users.map((user) => (
              <Fragment key={user.id}>
                <tr className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        user.status === "ACTIVE"
                          ? "bg-[var(--color-surface-2)] text-[var(--color-win)]"
                          : "bg-[var(--color-danger)]/20 text-[var(--color-danger)]"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatMinorUnits(user.balance)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          updateUser.mutate({
                            userId: user.id,
                            status: user.status === "ACTIVE" ? "BANNED" : "ACTIVE",
                          })
                        }
                        className="text-[var(--color-accent)]"
                      >
                        {user.status === "ACTIVE" ? "Ban" : "Unban"}
                      </button>
                      <button
                        onClick={() => setAdjustingUserId(adjustingUserId === user.id ? null : user.id)}
                        className="text-[var(--color-accent-2)]"
                      >
                        Adjust balance
                      </button>
                    </div>
                  </td>
                </tr>
                {adjustingUserId === user.id && (
                  <tr>
                    <td colSpan={5} className="px-4 pb-3">
                      <AdjustBalanceForm user={user} onDone={() => setAdjustingUserId(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
