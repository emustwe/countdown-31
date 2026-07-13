"use client";

import { useState } from "react";
import { AuthGuard } from "../../../components/AuthGuard";
import { AppShell } from "../../../components/AppShell";
import { useGameConfig, usePlayNextFreeSpin, useSpin } from "../../../lib/hooks/useGame";
import { creditsToMinorUnits, formatMinorUnits } from "../../../lib/money";
import { ApiError } from "../../../lib/api-client";
import type { Grid, SpinApiResponse } from "../../../lib/api-types";

export default function AuroraWaysPage() {
  return (
    <AuthGuard>
      <AppShell>
        <GameContent />
      </AppShell>
    </AuthGuard>
  );
}

function GridView({ grid }: { grid: Grid }) {
  // grid[reel][row] — transpose for a natural row-by-row display.
  const rows = grid[0]?.map((_, rowIndex) => grid.map((reel) => reel[rowIndex])) ?? [];
  return (
    <div className="inline-grid gap-1 rounded-md bg-black/30 p-3">
      {rows.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.map((symbol, c) => (
            <div
              key={c}
              className="flex h-12 w-12 items-center justify-center rounded bg-[var(--color-surface-2)] text-sm font-semibold"
            >
              {symbol}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function GameContent() {
  const { data: config } = useGameConfig();
  const spin = useSpin();
  const playNextFreeSpin = usePlayNextFreeSpin();
  const [betCredits, setBetCredits] = useState("10");
  const [result, setResult] = useState<SpinApiResponse | null>(null);
  const [revealedGrid, setRevealedGrid] = useState<Grid | null>(null);
  const [freeSpinsLeft, setFreeSpinsLeft] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleSpin() {
    setError(null);
    try {
      const totalBet = creditsToMinorUnits(betCredits);
      const res = await spin.mutateAsync({ totalBet, idempotencyKey: crypto.randomUUID() });
      setResult(res);
      setRevealedGrid(res.base.grid);
      setFreeSpinsLeft(res.freeSpinsRemaining);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : err instanceof Error ? err.message : "Failed");
    }
  }

  async function handleRevealNext() {
    if (!result) return;
    const step = await playNextFreeSpin.mutateAsync({ roundId: result.roundId });
    setRevealedGrid(step.grid);
    setFreeSpinsLeft(step.freeSpinsRemaining);
  }

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">{config?.displayName ?? "Aurora Ways"}</h1>
      <p className="mb-8 text-sm text-[var(--color-text-dim)]">
        Placeholder grid view — the full PixiJS reel renderer + animations land in the next
        milestone. This already talks to the real, server-authoritative spin endpoint.
      </p>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div>{revealedGrid && <GridView grid={revealedGrid} />}</div>

        <div className="surface rounded-lg p-6">
          <div className="mb-4 flex items-end gap-3">
            <div>
              <label className="mb-1 block text-sm text-[var(--color-text-dim)]">Bet (credits)</label>
              <input
                type="text"
                value={betCredits}
                onChange={(e) => setBetCredits(e.target.value)}
                className="w-32 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
              />
            </div>
            <button
              onClick={handleSpin}
              disabled={spin.isPending || freeSpinsLeft > 0}
              className="rounded-md bg-[var(--color-accent)] px-6 py-2 text-sm font-semibold text-black disabled:opacity-60"
            >
              {spin.isPending ? "Spinning…" : "Spin"}
            </button>
            {freeSpinsLeft > 0 && (
              <button
                onClick={handleRevealNext}
                disabled={playNextFreeSpin.isPending}
                className="rounded-md bg-[var(--color-accent-2)] px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                Reveal free spin ({freeSpinsLeft} left)
              </button>
            )}
          </div>

          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

          {result && (
            <div className="space-y-1 text-sm">
              <p>
                Total win: <span className="font-semibold text-[var(--color-win)]">{formatMinorUnits(result.totalWin)}</span>
              </p>
              <p className="text-[var(--color-text-dim)]">New balance: {formatMinorUnits(result.newBalance)}</p>
              {result.feature && (
                <p className="text-[var(--color-accent-2)]">
                  Free spins triggered: {result.feature.awarded} (retriggers: {result.feature.retriggers})
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
