"use client";

import { useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { AppShell } from "../../components/AppShell";
import { useDeposit, useTransactions, useWallet, useWithdraw } from "../../lib/hooks/useWallet";
import { creditsToMinorUnits, formatMinorUnits } from "../../lib/money";
import { ApiError } from "../../lib/api-client";

export default function WalletPage() {
  return (
    <AuthGuard>
      <AppShell>
        <WalletContent />
      </AppShell>
    </AuthGuard>
  );
}

function WalletContent() {
  const { data: wallet } = useWallet();
  const { data: transactions } = useTransactions();
  const deposit = useDeposit();
  const withdraw = useWithdraw();
  const [amount, setAmount] = useState("100");
  const [error, setError] = useState<string | null>(null);

  async function handleMovement(kind: "deposit" | "withdraw") {
    setError(null);
    try {
      const minorUnits = creditsToMinorUnits(amount);
      const idempotencyKey = crypto.randomUUID();
      if (kind === "deposit") {
        await deposit.mutateAsync({ amount: minorUnits, idempotencyKey });
      } else {
        await withdraw.mutateAsync({ amount: minorUnits, idempotencyKey });
      }
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-1 text-2xl font-semibold">Wallet</h1>
        <p className="text-[var(--color-text-dim)]">
          Demo credits only — nothing here is real money.{" "}
          {wallet && !wallet.reconciled && (
            <span className="text-[var(--color-danger)]">Balance is out of sync — contact support.</span>
          )}
        </p>
      </div>

      <div className="surface flex items-center justify-between rounded-lg p-6">
        <div>
          <p className="text-sm text-[var(--color-text-dim)]">Current balance</p>
          <p className="text-3xl font-semibold tabular-nums">
            {wallet ? formatMinorUnits(wallet.balance) : "—"}
          </p>
        </div>
      </div>

      <div className="surface rounded-lg p-6">
        <h2 className="mb-4 font-semibold">Deposit / withdraw</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="amount" className="mb-1 block text-sm text-[var(--color-text-dim)]">
              Amount (credits)
            </label>
            <input
              id="amount"
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-40 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <button
            onClick={() => handleMovement("deposit")}
            disabled={deposit.isPending}
            className="rounded-md bg-[var(--color-win)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
          >
            Deposit
          </button>
          <button
            onClick={() => handleMovement("withdraw")}
            disabled={withdraw.isPending}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Withdraw
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>}
      </div>

      <div className="surface rounded-lg p-6">
        <h2 className="mb-4 font-semibold">Recent transactions</h2>
        <div className="space-y-2">
          {transactions?.entries.length ? (
            transactions.entries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between border-b border-[var(--color-border)] py-2 text-sm last:border-0"
              >
                <div>
                  <span className="font-medium">{entry.type.replace("_", " ")}</span>
                  {entry.refType && (
                    <span className="ml-2 text-[var(--color-text-dim)]">{entry.refType}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[var(--color-text-dim)]">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                  <span
                    className={`tabular-nums ${
                      entry.amount.startsWith("-") ? "text-[var(--color-danger)]" : "text-[var(--color-win)]"
                    }`}
                  >
                    {formatMinorUnits(entry.amount)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[var(--color-text-dim)]">No transactions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
