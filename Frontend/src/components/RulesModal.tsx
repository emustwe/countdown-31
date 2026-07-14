"use client";

import { SYMBOL_VISUALS } from "../game/symbols";
import type { PublicMathModel } from "../lib/api-types";

const SYMBOL_NAMES: Record<string, string> = {
  H1: "Diamond",
  H2: "Crown",
  H3: "Star",
  L1: "Ace",
  L2: "King",
  L3: "Queen",
  L4: "Jack",
};

const PAYING_SYMBOL_ORDER = ["H1", "H2", "H3", "L1", "L2", "L3", "L4"] as const;

export function RulesModal({ model, onClose }: { model: PublicMathModel; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Game rules"
    >
      <div
        className="surface max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--color-accent)]/30 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-[var(--color-accent)]">
            How to Play — {model.displayName}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-lg text-[var(--color-text-dim)] hover:text-white"
          >
            ✕
          </button>
        </div>

        <section className="mb-5">
          <h3 className="mb-1 font-semibold">Ways to win</h3>
          <p className="text-sm text-[var(--color-text-dim)]">
            Matching symbols pay when they land on consecutive reels starting from reel 1
            (the leftmost), in any row. The more reels in a row that match, and the more
            copies of that symbol on each of those reels, the bigger the win.
          </p>
        </section>

        <section className="mb-5">
          <h3 className="mb-2 font-semibold">Paytable</h3>
          <p className="mb-2 text-xs text-[var(--color-text-dim)]">Win = multiplier × ways × bet</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[var(--color-text-dim)]">
                  <th className="pb-2 font-normal">Symbol</th>
                  <th className="pb-2 text-right font-normal">3 of a kind</th>
                  <th className="pb-2 text-right font-normal">4 of a kind</th>
                  <th className="pb-2 text-right font-normal">5 of a kind</th>
                </tr>
              </thead>
              <tbody>
                {PAYING_SYMBOL_ORDER.map((id) => {
                  const visual = SYMBOL_VISUALS[id];
                  const row = model.paytable[id] ?? [0, 0, 0, 0];
                  return (
                    <tr key={id} className="border-t border-[var(--color-border)]">
                      <td className="py-2">
                        <span className="mr-2 text-lg">{visual.glyph}</span>
                        {SYMBOL_NAMES[id]}
                      </td>
                      <td className="py-2 text-right tabular-nums">×{row[1] ?? 0}</td>
                      <td className="py-2 text-right tabular-nums">×{row[2] ?? 0}</td>
                      <td className="py-2 text-right tabular-nums">×{row[3] ?? 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-5">
          <h3 className="mb-1 font-semibold">
            <span className="mr-1">{SYMBOL_VISUALS.W.glyph}</span> Wild
          </h3>
          <p className="text-sm text-[var(--color-text-dim)]">
            Substitutes for any paying symbol (not the scatter) to help complete a way. A
            way made up entirely of wilds doesn&apos;t pay — at least one real copy of the
            symbol is still needed.
          </p>
        </section>

        <section>
          <h3 className="mb-1 font-semibold">
            <span className="mr-1">{SYMBOL_VISUALS.S.glyph}</span> Scatter &amp; free spins
          </h3>
          <p className="text-sm text-[var(--color-text-dim)]">
            3, 4, or 5 scatters anywhere on the grid award {model.freeSpins.award[3]},{" "}
            {model.freeSpins.award[4]}, or {model.freeSpins.award[5]} free spins. A win
            multiplier starts at ×{model.freeSpins.startMultiplier} and rises by{" "}
            {model.freeSpins.multiplierStep} each free spin, up to ×
            {model.freeSpins.maxMultiplier}.
            {model.freeSpins.retrigger &&
              " Landing 3+ scatters again during free spins adds more spins."}
          </p>
        </section>
      </div>
    </div>
  );
}
