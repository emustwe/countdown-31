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
import { playFeatureTrigger, playJackpot, playSpinStart, playWin } from "../../../game/sound";
import { RulesModal } from "../../../components/RulesModal";

const JACKPOT_TIER_NAMES: Record<3 | 4 | 5, string> = {
  3: "Mini Jackpot",
  4: "Major Jackpot",
  5: "Mega Jackpot",
};

export default function AuroraWaysPage() {
  return (
    <AuthGuard>
      <AppShell fullWidth>
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

  const { containerRef, rendererRef, ready } = useSlotRenderer(150);
  const { data: resumedRound } = useRound(activeRoundId ?? undefined);

  const [betCredits, setBetCredits] = useState("10");
  const [totalWinMinor, setTotalWinMinor] = useState<bigint>(0n);
  const [newBalance, setNewBalance] = useState<string | null>(null);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [featureBanner, setFeatureBanner] = useState<{ awarded: number } | null>(null);
  const [jackpotBanner, setJackpotBanner] = useState<{ tier: 3 | 4 | 5; pay: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [multiplier, setMultiplier] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
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
    setJackpotBanner(null);
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

      if (res.base.jackpot) {
        setJackpotBanner(res.base.jackpot);
        if (soundEnabled) playJackpot();
      }

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

      if (step.result.jackpot) {
        setJackpotBanner(step.result.jackpot);
        if (soundEnabled) playJackpot();
      }

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
      <h1 className="font-display mb-0.5 text-center text-xl font-bold tracking-wide text-[var(--color-accent)] sm:text-2xl">
        {(config?.displayName ?? "Aurora Ways").toUpperCase()}
      </h1>
      <p className="mb-3 text-center text-xs text-[var(--color-text-dim)] sm:text-sm">
        5×5 ways-to-win — wilds substitute for every paying symbol, 3+ scatters anywhere
        trigger free spins.
      </p>

      <div className="relative overflow-hidden rounded-3xl p-3 sm:p-5" style={CASINO_BACKGROUND_STYLE}>
        {/* Cosmic disco-floor backdrop: moon + aurora ribbons + two parallax mountain layers +
            glowing dance floor, all CSS — see the *_STYLE constants below. */}
        <div aria-hidden className="pointer-events-none absolute inset-0" style={MOON_STYLE} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={BACK_MOUNTAIN_STYLE} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={MOUNTAIN_SILHOUETTE_STYLE} />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-28 sm:h-36" style={DANCE_FLOOR_STYLE} />

        {/* Aurora-colored glow blobs — purely decorative, behind the board. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-[var(--color-neon-violet)] opacity-25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-10 -right-16 h-64 w-64 rounded-full bg-[var(--color-accent-2)] opacity-25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-[var(--color-neon-pink)] opacity-20 blur-3xl"
        />

        <div className="relative mx-auto max-w-[1500px]">
          <div className="relative mx-auto" style={{ maxWidth: 1200 }}>
            <div ref={containerRef} className="w-full" />
            {jackpotBanner ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/80">
                <div
                  className="flex flex-col items-center justify-center rounded-full p-10 text-center"
                  style={medallionStyle("var(--color-danger)", "var(--color-accent)")}
                >
                  <p className="font-display text-4xl font-extrabold tracking-wide bg-gradient-to-b from-[var(--color-accent)] via-[var(--color-danger)] to-[var(--color-accent)] bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(255,77,109,0.7)]">
                    JACKPOT!
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--color-accent)]">
                    {JACKPOT_TIER_NAMES[jackpotBanner.tier]}
                  </p>
                  <p className="mt-1 text-[var(--color-text-dim)]">+{formatMinorUnits(jackpotBanner.pay)}</p>
                  <button
                    onClick={() => setJackpotBanner(null)}
                    className="mt-4 rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-black"
                  >
                    Amazing!
                  </button>
                </div>
              </div>
            ) : (
              featureBanner && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/75">
                  <div
                    className="flex flex-col items-center justify-center rounded-full p-10 text-center"
                    style={medallionStyle("var(--color-accent-2)", "var(--color-neon-violet)")}
                  >
                    <p className="font-display text-3xl font-extrabold tracking-wide bg-gradient-to-b from-[var(--color-accent-2)] via-white to-[var(--color-neon-violet)] bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(46,230,196,0.6)]">
                      FREE SPINS!
                    </p>
                    <p className="mt-1 text-[var(--color-text-dim)]">{featureBanner.awarded} spins awarded</p>
                    <button
                      onClick={() => setFeatureBanner(null)}
                      className="mt-4 rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-black"
                    >
                      Let&apos;s go
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          {/* Control deck: one horizontal strip below the reels — bet, spin, and the
              score readouts all in a single row, like a physical cabinet's button panel. */}
          <div className="surface mt-3 rounded-2xl border border-[var(--color-accent)]/30 px-6 py-3 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
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

              <div className="flex items-center gap-3">
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
                <button
                  onClick={() => setShowRules(true)}
                  aria-label="Game rules"
                  title="How to play"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-sm font-bold text-[var(--color-text-dim)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                >
                  ?
                </button>
              </div>

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

      {showRules && config && <RulesModal model={config} onClose={() => setShowRules(false)} />}
    </div>
  );
}

// A glowing circular "medallion" behind win/feature banner text — echoes the reference's
// BIG WIN/SUPER WIN badge treatment: a radial glow, a bright ring, a darker core so the
// gradient text stays legible on top.
function medallionStyle(ringColor: string, glowColor: string): CSSProperties {
  return {
    width: 300,
    height: 300,
    background: `radial-gradient(circle, rgba(10,10,26,0.6) 0%, rgba(10,10,26,0.92) 60%, rgba(10,10,26,0.98) 100%)`,
    border: `3px solid ${ringColor}`,
    boxShadow: `0 0 40px ${glowColor}, 0 0 90px ${glowColor}, inset 0 0 30px rgba(0,0,0,0.5)`,
  };
}

// A "cosmic space-disco" backdrop: diagonal aurora-ribbon color bands over a near-black
// night sky, a scatter of star sparkles, a distant mountain-range silhouette, and a glowing
// dance-floor strip along the bottom. Entirely CSS (Pixi's canvas stays transparent) so it's
// cheap and needs no image assets — same technique as before, richer layering + new palette.
const CASINO_BACKGROUND_STYLE: CSSProperties = {
  backgroundImage: [
    // Diagonal aurora ribbons sweeping the sky.
    "linear-gradient(115deg, transparent 8%, rgba(46,230,196,0.20) 22%, transparent 38%, rgba(168,85,247,0.18) 52%, transparent 68%, rgba(255,62,200,0.14) 82%, transparent 96%)",
    "linear-gradient(70deg, transparent 60%, rgba(255,210,63,0.08) 75%, transparent 90%)",
    // Star sparkles.
    "radial-gradient(1.5px 1.5px at 10% 15%, rgba(255,255,255,0.6) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 85% 12%, rgba(255,255,255,0.5) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 60% 25%, rgba(255,255,255,0.45) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 25% 30%, rgba(255,255,255,0.4) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 45% 18%, rgba(255,255,255,0.45) 1.5px, transparent 1.5px)",
    "radial-gradient(1.5px 1.5px at 92% 35%, rgba(255,255,255,0.35) 1.5px, transparent 1.5px)",
    "radial-gradient(2px 2px at 15% 45%, rgba(255,255,255,0.3) 2px, transparent 2px)",
    "radial-gradient(2px 2px at 75% 42%, rgba(255,255,255,0.3) 2px, transparent 2px)",
    // Base night-sky gradient.
    "linear-gradient(180deg, #171340 0%, #10102c 45%, #0a0b18 75%, #05050e 100%)",
  ].join(", "),
  backgroundSize:
    "auto, auto, 160px 160px, 190px 190px, 170px 170px, 200px 200px, 150px 150px, 210px 210px, 240px 240px, 260px 260px, auto",
};

// A soft glowing moon low in the sky — a focal point the aurora bands alone didn't give the
// scene. Pure CSS radial glow, no image asset.
const MOON_STYLE: CSSProperties = {
  backgroundImage: [
    "radial-gradient(circle at 78% 16%, rgba(255,247,214,0.95) 0%, rgba(255,247,214,0.95) 4%, rgba(255,230,150,0.35) 8%, transparent 16%)",
    "radial-gradient(circle at 78% 16%, rgba(255,230,150,0.25) 0%, transparent 24%)",
  ].join(", "),
};

// A second, further-back mountain layer (larger, lower-contrast, offset peaks) sitting
// behind the main silhouette for a cheap sense of depth/parallax.
const BACK_MOUNTAIN_STYLE: CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 320' preserveAspectRatio='none'>" +
      "<polygon points='0,320 0,220 140,150 260,205 420,110 560,190 700,100 860,200 " +
      "1000,130 1100,195 1200,160 1200,320' fill='#171346' opacity='0.55'/>" +
      "</svg>",
  )}")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "bottom",
  backgroundSize: "100% 48%",
};

// A jagged dark mountain/crystal-spire skyline anchored to the bottom of the scene, sitting
// between the sky and the dance floor — built as an inline SVG data URI (no image asset).
const MOUNTAIN_SILHOUETTE_STYLE: CSSProperties = {
  backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 300' preserveAspectRatio='none'>" +
      "<polygon points='0,300 0,190 90,120 180,175 280,80 360,150 460,55 540,140 640,70 730,160 " +
      "830,90 900,155 1000,60 1080,145 1160,95 1200,150 1200,300' fill='#0d0c22' opacity='0.85'/>" +
      "</svg>",
  )}")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "bottom",
  backgroundSize: "100% 42%",
};

// The glowing checkerboard-ish dance floor along the very bottom of the scene — alternating
// translucent aurora-colored stripes fading upward into the sky, plus a bright reflective
// strip along the floor's leading edge.
const DANCE_FLOOR_STYLE: CSSProperties = {
  backgroundImage: [
    "linear-gradient(180deg, transparent 0%, rgba(5,5,14,0.4) 30%, rgba(5,5,14,0.85) 100%)",
    "repeating-linear-gradient(100deg, rgba(46,230,196,0.16) 0 40px, rgba(168,85,247,0.14) 40px 80px, rgba(255,62,200,0.12) 80px 120px, rgba(255,210,63,0.10) 120px 160px)",
    "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 12%)",
  ].join(", "),
};
