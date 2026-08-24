"use client";

import { Flame, Skull, Sparkles } from "lucide-react";
import type { LastMoveInfo } from "../../lib/hooks/useCountdownLive";
import { soundManager } from "../../lib/soundManager";

const TARGET = 31;

function wrapNumber(value: number) {
  return (((value - 1) % TARGET) + TARGET) % TARGET + 1;
}

export function MobileNumberDeck({
  currentCount,
  myTurn,
  selectedCards,
  onToggleCard,
  status,
  lastMove,
}: {
  currentCount: number;
  myTurn: boolean;
  selectedCards: number[];
  onToggleCard: (value: number) => void;
  status: "waiting" | "playing" | "over";
  lastMove?: LastMoveInfo | null;
}) {
  const offsets = [-1, 0, 1, 2, 3];

  return (
    <div className="mobile-number-deck" aria-label="Number board">
      <div className="mobile-deck-rim" aria-hidden="true" />
      <div className="mobile-deck-cards">
        {offsets.map((offset) => {
          const value = wrapNumber(currentCount + 1 + offset);
          const playable = offset >= 0 && offset <= 2;
          const selected = selectedCards.includes(value);
          const previous = lastMove?.picks.includes(value) || offset === -1;
          const bomb = value === TARGET;
          const danger = value >= 28 && value < TARGET;
          const canTap = myTurn && status === "playing" && playable;

          return (
            <button
              type="button"
              key={`${offset}-${value}`}
              aria-label={`Number ${value}`}
              disabled={!canTap}
              onClick={() => {
                soundManager.playClick();
                onToggleCard(value);
              }}
              className={`mobile-number-card ${playable ? "is-playable" : ""} ${previous ? "is-previous" : ""} ${selected ? "is-selected" : ""} ${bomb ? "is-bomb" : ""}`}
            >
              <span className="mobile-number-badge">
                {bomb ? <Skull size={11} /> : danger ? <Flame size={11} /> : playable ? <Sparkles size={10} /> : null}
              </span>
              <strong>{value}</strong>
              {selected && <small>Picked</small>}
            </button>
          );
        })}
      </div>
      <div className="mobile-deck-rim is-bottom" aria-hidden="true" />
    </div>
  );
}
