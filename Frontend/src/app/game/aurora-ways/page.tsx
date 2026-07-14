"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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
      <h1 className="mb-1 text-center text-2xl font-semibold">{config?.displayName ?? "Aurora Ways"}</h1>
      <p className="mb-6 text-center text-sm text-[var(--color-text-dim)]">
        5×5 ways-to-win — wilds substitute for every paying symbol, 3+ scatters anywhere
        trigger free spins.
      </p>

      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-8" style={CASINO_BACKGROUND_STYLE}>
        {/* Soft aurora-colored glow blobs — purely decorative, behind everything. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[var(--color-accent-2)] opacity-25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-10 -right-16 h-64 w-64 rounded-full bg-[var(--color-win)] opacity-20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-[var(--color-accent)] opacity-20 blur-3xl"
        />

        <div className="relative mx-auto max-w-3xl">
          <div className="relative mx-auto" style={{ maxWidth: 760 }}>
            <div ref={containerRef} className="aspect-square w-full" />
            {featureBanner && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/75">
                <div className="text-center">
                  <p className="text-3xl font-bold text-[var(--color-accent)] drop-shadow-[0_0_12px_rgba(242,201,76,0.6)]">
                    FREE SPINS!
                  </p>
                  <p className="mt-1 text-[var(--color-text-dim)]">{featureBanner.awarded} spins awarded</p>
                  <button
                    onClick={() => setFeatureBanner(null)}
                    className="mt-4 rounded-md bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-black"
                  >
                    Let&apos;s go
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Control deck: one horizontal strip below the reels — bet, spin, and the
              score readouts all in a single row, like a physical cabinet's button panel. */}
          <div className="surface mt-6 rounded-2xl border border-[var(--color-accent)]/30 px-6 py-4 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-between">
              <div className="flex items-center gap-2">
                <label htmlFor="betCredits" className="text-sm text-[var(--color-text-dim)]">
                  Bet
                </label>
                <input
                  id="betCredits"
                  type="text"
                  value={betCredits}
                  disabled={showingFeature}
                  onChange={(e) => setBetCredits(e.target.value)}
                  className="w-24 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-center text-sm outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                />
              </div>

              {!showingFeature ? (
                <button
                  onClick={handleSpin}
                  disabled={busy || !ready}
                  className="rounded-full bg-[var(--color-accent)] px-10 py-3 text-base font-bold text-black shadow-[0_0_18px_rgba(242,201,76,0.5)] transition hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? "Spinning…" : "SPIN"}
                </button>
              ) : (
                <button
                  onClick={handleRevealNext}
                  disabled={busy || featureBanner !== null}
                  className="rounded-full bg-[var(--color-accent-2)] px-8 py-3 text-base font-bold text-white shadow-[0_0_18px_rgba(124,92,255,0.5)] transition hover:brightness-110 disabled:opacity-60"
                >
                  {busy ? "Spinning…" : `FREE SPIN (${freeSpinsRemaining})`}
                </button>
              )}

              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-xs text-[var(--color-text-dim)]">Win</p>
                  <p className="font-semibold text-[var(--color-win)] tabular-nums">
                    {formatMinorUnits(Math.round(displayedWin).toString())}
                  </p>
                </div>
                {multiplier !== null && (
                  <div className="text-center">
                    <p className="text-xs text-[var(--color-text-dim)]">Multiplier</p>
                    <p className="font-semibold text-[var(--color-accent)]">×{multiplier}</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-xs text-[var(--color-text-dim)]">Balance</p>
                  <p className="font-semibold tabular-nums">
                    {newBalance ? formatMinorUnits(newBalance) : "—"}
                  </p>
                </div>
              </div>
            </div>

            {error && <p className="mt-3 text-center text-sm text-[var(--color-danger)]">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// A dark, layered "casino floor at night" backdrop: a soft vignette plus a scatter of tiny
// star-like sparkle points, echoing the game's aurora-sky theme without needing an image
// asset. Kept as a plain CSS background (Pixi's canvas stays transparent) so it's cheap and
// theme-aware.
const CASINO_BACKGROUND_STYLE: CSSProperties = {
  backgroundImage: [
    "radial-gradient(circle at 25% 20%, rgba(124,92,255,0.16), transparent 45%)",
    "radial-gradient(circle at 80% 15%, rgba(52,211,153,0.10), transparent 40%)",
    "radial-gradient(circle at 70% 90%, rgba(242,201,76,0.10), transparent 45%)",
    "radial-gradient(1.5px 1.5px at 10% 20%, rgba(255,255,255,0.55) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 85% 25%, rgba(255,255,255,0.45) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 60% 75%, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 25% 85%, rgba(255,255,255,0.35) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 45% 40%, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 90% 60%, rgba(255,255,255,0.3) 1.5px, transparent 1.5px)",
    "linear-gradient(180deg, #131730 0%, #0a0d1a 60%, #060810 100%)",
  ].join(", "),
  backgroundSize: "auto, auto, auto, 160px 160px, 190px 190px, 170px 170px, 200px 200px, 150px 150px, 210px 210px, auto",
};
