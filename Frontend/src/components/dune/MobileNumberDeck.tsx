"use client";

import { motion } from "framer-motion";
import { Check, Flame, Skull, Sparkles } from "lucide-react";
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
  const historyValues = [-2, -1, 0].map((offset) => wrapNumber(currentCount + offset));
  const playableValues = [1, 2, 3].map((offset) => wrapNumber(currentCount + offset));

  function renderCard(value: number, playable: boolean) {
    const selected = playable && selectedCards.includes(value);
    const wasPlayed = !playable && lastMove?.picks.includes(value);
    const bomb = value === TARGET;
    const danger = value >= 28 && value < TARGET;
    const canTap = myTurn && status === "playing" && playable;

    return (
      <motion.button
        type="button"
        key={`${playable ? "next" : "previous"}-${value}`}
        aria-label={`Number ${value}`}
        disabled={!canTap}
        initial={false}
        animate={{
          scale: selected ? 1.08 : 1,
          y: selected ? -4 : 0,
        }}
        whileTap={canTap ? { scale: 0.95 } : undefined}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        onClick={() => {
          soundManager.playClick();
          onToggleCard(value);
        }}
        className={`mobile-number-card ${playable ? "is-playable" : "is-previous"} ${wasPlayed ? "was-played" : ""} ${selected ? "is-selected" : ""} ${bomb ? "is-bomb" : ""}`}
      >
        <span className="mobile-number-badge">
          {wasPlayed ? (
            <Check size={13} strokeWidth={4} />
          ) : bomb ? (
            <Skull size={12} className="animate-pulse text-rose-400" />
          ) : danger ? (
            <Flame size={12} className="animate-pulse text-amber-400" />
          ) : playable ? (
            <Sparkles size={11} className={selected ? "text-emerald-300" : "text-amber-300"} />
          ) : null}
        </span>
        <strong>{value}</strong>
        {selected && <small className="animate-pulse">Picked</small>}
      </motion.button>
    );
  }

  return (
    <div className="mobile-number-deck-stack" aria-label="Number board">
      <div className="mobile-number-deck is-history" aria-label="Previous numbers">
        <div className="mobile-deck-rim" aria-hidden="true" />
        <div className="mobile-deck-cards">
          {historyValues.map((value) => renderCard(value, false))}
        </div>
        <div className="mobile-deck-rim is-bottom" aria-hidden="true" />
      </div>
      <div className="mobile-number-deck is-action" aria-label="Your next numbers">
        <div className="mobile-deck-rim" aria-hidden="true" />
        <div className="mobile-deck-cards">
          {playableValues.map((value) => renderCard(value, true))}
        </div>
        <div className="mobile-deck-rim is-bottom" aria-hidden="true" />
      </div>
    </div>
  );
}

