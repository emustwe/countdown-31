"use client";

import { useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";
import { AppShell } from "../../components/AppShell";
import { useRoundHistory } from "../../lib/hooks/useGame";
import { formatMinorUnits } from "../../lib/money";

export default function HistoryPage() {
  return (
    <AuthGuard>
      <AppShell>
        <HistoryContent />
      </AppShell>
    </AuthGuard>
  );
}

function HistoryContent() {
  const [cursors, setCursors] = useState<Array<string | undefined>>([undefined]);
  const currentCursor = cursors[cursors.length - 1];
  const { data, isLoading } = useRoundHistory(currentCursor);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">Spin history</h1>
      <p className="mb-8 text-[var(--color-text-dim)]">Every round you&apos;ve played, most recent first.</p>

      <div className="surface overflow-hidden rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-dim)]">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Bet</th>
              <th className="px-4 py-3">Win</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-dim)]">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && data?.rounds.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-[var(--color-text-dim)]">
                  No spins yet — head to the lobby to play.
                </td>
              </tr>
            )}
            {data?.rounds.map((round) => (
              <tr key={round.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3 text-[var(--color-text-dim)]">
                  {new Date(round.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 tabular-nums">{formatMinorUnits(round.totalBet)}</td>
                <td
                  className={`px-4 py-3 tabular-nums ${
                    round.totalWin !== "0" ? "text-[var(--color-win)]" : ""
                  }`}
                >
                  {formatMinorUnits(round.totalWin)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      round.state === "COMPLETE"
                        ? "bg-[var(--color-surface-2)] text-[var(--color-text-dim)]"
                        : "bg-[var(--color-accent-2)] text-white"
                    }`}
                  >
                    {round.state}
                  </span>
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
