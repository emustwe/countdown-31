"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { AuthGuard } from "../../../components/AuthGuard";
import { AppShell } from "../../../components/AppShell";
import { useGameConfig, usePlayNextFreeSpin, useRound, useSpin } from "../../../lib/hooks/useGame";
import { creditsToMinorUnits, formatMinorUnits } from "../../../lib/money";
import { ApiError } from "../../../lib/api-client";
import { useSlotRenderer } from "../../../game/useSlotRenderer";
import { useSettingsStore } from "../../../stores/settings-store";
import { useGameSessionStore } from "../../../stores/game-session-store";
import { playFeatureTrigger, playSpinStart, playWin } from "../../../game/sound";

export default function AuroraWaysPage() {
  return (
    <AuthGuard>
      <AppShell>
        <GameContent />
      </AppShell>
    </AuthGuard>
  );
}

function useCountUp(target: number, durationSec = 0.8) {
  const [value, setValue] = useState(target);
  const state = useRef({ value: target });

  useEffect(() => {
    const tween = gsap.to(state.current, {
      value: target,
      duration: durationSec,
      ease: "power1.out",
      onUpdate: () => setValue(state.current.value),
    });
    return () => {
      tween.kill();
    };
  }, [target, durationSec]);

  return value;
}

function GameContent() {
  const { data: config } = useGameConfig();
  const spin = useSpin();
  const playNextFreeSpin = usePlayNextFreeSpin();
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const animationsEnabled = useSettingsStore((s) => s.animationsEnabled);
  const activeRoundId = useGameSessionStore((s) => s.activeRoundId);
  const setActiveRound = useGameSessionStore((s) => s.setActiveRound);

  const { containerRef, rendererRef, ready } = useSlotRenderer();
  const { data: resumedRound } = useRound(activeRoundId ?? undefined);

  const [betCredits, setBetCredits] = useState("10");
  const [totalWinMinor, setTotalWinMinor] = useState<bigint>(0n);
  const [newBalance, setNewBalance] = useState<string | null>(null);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [featureBanner, setFeatureBanner] = useState<{ awarded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const resumeHandled = useRef(false);

  useEffect(() => {
    rendererRef.current?.setSettings({ soundEnabled, animationsEnabled });
  }, [soundEnabled, animationsEnabled, rendererRef]);

  // Resume: if a feature round was left mid-reveal (reload/disconnect), show its last
  // known grid at rest rather than a blank board.
  useEffect(() => {
    if (!ready || resumeHandled.current || !resumedRound) return;
    resumeHandled.current = true;
    if (resumedRound.state === "FEATURE" && resumedRound.freeSpinsRemaining > 0) {
      const lastSpin = resumedRound.spins[resumedRound.spins.length - 1];
      if (lastSpin) rendererRef.current?.showGrid(lastSpin.grid);
      setCurrentRoundId(resumedRound.id);
      setFreeSpinsRemaining(resumedRound.freeSpinsRemaining);
    } else {
      setActiveRound(null);
    }
  }, [ready, resumedRound, rendererRef, setActiveRound]);

  const displayedWin = useCountUp(Number(totalWinMinor));

  async function handleSpin() {
    if (freeSpinsRemaining > 0) return;
    setError(null);
    setFeatureBanner(null);
    setBusy(true);
    try {
      if (soundEnabled) playSpinStart();
      const totalBet = creditsToMinorUnits(betCredits);
      const res = await spin.mutateAsync({ totalBet, idempotencyKey: crypto.randomUUID() });

      rendererRef.current?.clearHighlights();
      await rendererRef.current?.spinTo(res.base.grid);
      rendererRef.current?.highlightWins(res.base.lines, res.base.grid);

      setTotalWinMinor(BigInt(res.totalWin));
      setNewBalance(res.newBalance);
      setCurrentRoundId(res.roundId);
      setFreeSpinsRemaining(res.freeSpinsRemaining);
      setMultiplier(null);

      if (res.base.lines.length > 0 && soundEnabled) playWin();

      if (res.feature) {
        setFeatureBanner({ awarded: res.feature.awarded });
        setActiveRound(res.roundId);
        if (soundEnabled) playFeatureTrigger();
      } else {
        setActiveRound(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevealNext() {
    if (!currentRoundId) return;
    setError(null);
    setBusy(true);
    try {
      const step = await playNextFreeSpin.mutateAsync({ roundId: currentRoundId });

      rendererRef.current?.clearHighlights();
      await rendererRef.current?.spinTo(step.grid);
      rendererRef.current?.highlightWins(step.result.lines, step.grid);

      setTotalWinMinor((prev) => prev + BigInt(step.win));
      setFreeSpinsRemaining(step.freeSpinsRemaining);
      setMultiplier(step.result.multiplier);
      if (BigInt(step.win) > 0n && soundEnabled) playWin();

      if (step.state === "COMPLETE") {
        setActiveRound(null);
        setFeatureBanner(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? String(err.message) : err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const showingFeature = freeSpinsRemaining > 0;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold">{config?.displayName ?? "Aurora Ways"}</h1>
      <p className="mb-6 text-sm text-[var(--color-text-dim)]">
        5×5 ways-to-win — wilds substitute for every paying symbol, 3+ scatters anywhere
        trigger free spins.
      </p>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <div className="relative">
          <div
            ref={containerRef}
            className="surface aspect-square w-full max-w-[520px] rounded-lg"
            style={{ minHeight: 320 }}
          />
          {featureBanner && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70">
              <div className="text-center">
                <p className="text-2xl font-bold text-[var(--color-accent)]">FREE SPINS!</p>
                <p className="text-[var(--color-text-dim)]">{featureBanner.awarded} spins awarded</p>
                <button
                  onClick={() => setFeatureBanner(null)}
                  className="mt-4 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black"
                >
                  Let&apos;s go
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="surface rounded-lg p-6">
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="betCredits" className="mb-1 block text-sm text-[var(--color-text-dim)]">
                Bet (credits)
              </label>
              <input
                id="betCredits"
                type="text"
                value={betCredits}
                disabled={showingFeature}
                onChange={(e) => setBetCredits(e.target.value)}
                className="w-32 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
              />
            </div>

            {!showingFeature ? (
              <button
                onClick={handleSpin}
                disabled={busy || !ready}
                className="rounded-md bg-[var(--color-accent)] px-6 py-2 text-sm font-semibold text-black disabled:opacity-60"
              >
                {busy ? "Spinning…" : "Spin"}
              </button>
            ) : (
              <button
                onClick={handleRevealNext}
                disabled={busy || featureBanner !== null}
                className="rounded-md bg-[var(--color-accent-2)] px-6 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy ? "Spinning…" : `Free spin (${freeSpinsRemaining} left)`}
              </button>
            )}
          </div>

          {error && <p className="mb-2 text-sm text-[var(--color-danger)]">{error}</p>}

          <div className="space-y-1 text-sm">
            <p>
              Total win:{" "}
              <span className="text-lg font-semibold text-[var(--color-win)] tabular-nums">
                {formatMinorUnits(Math.round(displayedWin).toString())}
              </span>
            </p>
            {multiplier !== null && (
              <p className="text-[var(--color-accent)]">Current multiplier: ×{multiplier}</p>
            )}
            {newBalance && <p className="text-[var(--color-text-dim)]">Balance: {formatMinorUnits(newBalance)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
