"use client";

import { useEffect, useState } from "react";
import type { PublicMathModel } from "../lib/api-types";

const SYMBOL_NAMES: Record<string, string> = {
  H1: "Ten",
  H2: "Royal Crest",
  H3: "Nine",
  L1: "Ace",
  L2: "King",
  L3: "Queen",
  L4: "Jack",
};

// Mirrors SlotRenderer's symbol -> artwork mapping (Frontend/src/game/buildSymbolTextures.ts)
// so the Rules modal shows the exact same art the board does, not a separate CSS swatch.
// Scatter has no image entry — it's rendered as the same procedural sigil as the board
// (see drawScatterSigil in buildSymbolTextures.ts), drawn inline as an SVG below.
const SYMBOL_IMAGE: Record<string, string> = {
  H1: "/game/symbol-10.png",
  H2: "/game/symbol-H2-crest.png",
  H3: "/game/symbol-9.png",
  L1: "/game/symbol-A.png",
  L2: "/game/symbol-K.png",
  L3: "/game/symbol-Q.png",
  L4: "/game/symbol-J.png",
  W: "/game/symbol-W-wild.png",
  JP: "/game/symbol-JP-crystal.png",
};

function ScatterSigil() {
  const points = Array.from({ length: 8 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? 17 : 9;
    return `${16 + Math.cos(angle) * r},${16 + Math.sin(angle) * r}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 32 32" className="h-full w-full p-0.5">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="#d9b06a" strokeWidth="1.2" opacity="0.85" />
      <polygon points={points} fill="#a855f7" stroke="#e2c2ff" strokeWidth="0.8" opacity="0.9" />
      <circle cx="16" cy="16" r="4" fill="#ffe27a" stroke="#6a3f14" strokeWidth="0.8" />
    </svg>
  );
}

const PAYING_SYMBOL_ORDER = ["H1", "H2", "H3", "L1", "L2", "L3", "L4"] as const;

const JACKPOT_TIERS = [
  { count: 3 as const, label: "Mini Jackpot" },
  { count: 4 as const, label: "Major Jackpot" },
  { count: 5 as const, label: "Mega Jackpot" },
];

function Thumb({ id, size = "h-10 w-10" }: { id: string; size?: string }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#6b4a1a80]`}
      style={{ background: "radial-gradient(circle, #2a1416 0%, #180a0c 100%)" }}
    >
      {id === "S" ? (
        <ScatterSigil />
      ) : (
        <img src={SYMBOL_IMAGE[id]} alt="" className="h-full w-full object-contain p-0.5" />
      )}
    </div>
  );
}

export function RulesModal({ model, onClose }: { model: PublicMathModel; onClose: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Game rules"
    >
      <div
        className={`surface flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-[var(--color-accent)]/30 shadow-[0_0_60px_rgba(0,0,0,0.55)] transition-all duration-200 ease-out ${
          visible ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-[var(--color-accent)]">🎰 How to Play</h2>
            <p className="text-xs text-[var(--color-text-dim)]">{model.displayName}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-dim)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-6">
          <section className="rounded-2xl border border-[var(--color-accent-2)]/30 bg-[var(--color-surface-2)] p-4">
            <h3 className="mb-1 flex items-center gap-2 font-semibold text-[var(--color-accent-2)]">
              <span className="text-lg">🛣️</span> Ways to Win
            </h3>
            <p className="text-sm text-[var(--color-text-dim)]">
              Matching symbols pay when they land on consecutive reels starting from reel 1
              (the leftmost), in any row. The more reels in a row that match — and the more
              copies of that symbol on each of those reels — the bigger the win.
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <span className="text-lg">💰</span> Paytable
              </h3>
              <p className="text-xs text-[var(--color-text-dim)]">win = multiplier × ways × bet</p>
            </div>
            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 p-2">
              <div className="grid grid-cols-[2.25rem_1fr_3.75rem_3.75rem_3.75rem] gap-x-1 px-1.5 pb-1.5 text-[9px] font-medium tracking-wide text-[var(--color-text-dim)] uppercase sm:grid-cols-[3rem_1fr_4rem_4rem_4rem] sm:gap-x-2 sm:text-[10px]">
                <span />
                <span />
                <span className="text-center">3×</span>
                <span className="text-center">4×</span>
                <span className="text-center">5×</span>
              </div>
              <div className="space-y-1">
                {PAYING_SYMBOL_ORDER.map((id) => {
                  const row = model.paytable[id] ?? [0, 0, 0, 0];
                  return (
                    <div
                      key={id}
                      className="grid grid-cols-[2.25rem_1fr_3.75rem_3.75rem_3.75rem] items-center gap-x-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-1.5 py-1.5 transition hover:border-[var(--color-accent)]/40 sm:grid-cols-[3rem_1fr_4rem_4rem_4rem] sm:gap-x-2 sm:px-2.5 sm:py-2"
                    >
                      <Thumb id={id} size="h-8 w-8 sm:h-10 sm:w-10" />
                      <span className="truncate text-xs font-medium sm:text-sm">{SYMBOL_NAMES[id]}</span>
                      <PayoutCell value={row[1] ?? 0} />
                      <PayoutCell value={row[2] ?? 0} />
                      <PayoutCell value={row[3] ?? 0} />
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <FeatureCard
              symbolId="W"
              accent="#7fd9ff"
              title="Wild"
              description="Substitutes for any paying symbol (not the scatter) to help complete a way. A way made up entirely of wilds doesn't pay — at least one real copy of the symbol is still needed."
            />
            <FeatureCard
              symbolId="S"
              accent="#c9a227"
              title="Scatter & Free Spins"
              description={`3, 4, or 5 scatters anywhere award ${model.freeSpins.award[3]}, ${model.freeSpins.award[4]}, or ${model.freeSpins.award[5]} free spins. Win multiplier starts at ×${model.freeSpins.startMultiplier} and rises by ${model.freeSpins.multiplierStep} each free spin, up to ×${model.freeSpins.maxMultiplier}.${model.freeSpins.retrigger ? " Landing 3+ scatters again during free spins adds more." : ""}`}
            />
          </section>

          {model.jackpot && (
            <section className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-surface-2)] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Thumb id="JP" size="h-9 w-9" />
                <h3 className="font-semibold text-[var(--color-accent)]">Jackpot</h3>
              </div>
              <p className="mb-3 text-sm text-[var(--color-text-dim)]">
                Land 3, 4, or 5 crystal reliquaries anywhere on the grid — no adjacency
                needed — to win a jackpot tier on top of any other wins from that spin.
              </p>
              <div className="space-y-1.5">
                {JACKPOT_TIERS.map(({ count, label }) => (
                  <div
                    key={count}
                    className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/60 px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      {count}× — {label}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-win)]">
                      ×{model.jackpot?.pays[count]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="border-t border-[var(--color-border)] p-4">
          <button
            onClick={onClose}
            className="w-full rounded-full bg-[var(--color-accent)] py-2.5 text-sm font-bold text-black transition hover:brightness-110"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function PayoutCell({ value }: { value: number }) {
  if (value <= 0) {
    return <p className="text-center text-xs text-[var(--color-text-dim)] sm:text-sm">—</p>;
  }
  return (
    <p className="text-center text-[11px] font-semibold whitespace-nowrap text-[var(--color-win)] sm:text-sm">
      ×{value}
    </p>
  );
}

function FeatureCard({
  symbolId,
  accent,
  title,
  description,
}: {
  symbolId: string;
  accent: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface-2)] p-4" style={{ borderColor: `${accent}4d` }}>
      <div className="mb-2 flex items-center gap-2">
        <Thumb id={symbolId} size="h-9 w-9" />
        <h3 className="font-semibold" style={{ color: accent }}>
          {title}
        </h3>
      </div>
      <p className="text-sm text-[var(--color-text-dim)]">{description}</p>
    </div>
  );
}
