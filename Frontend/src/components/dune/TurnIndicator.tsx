"use client";

import { useEffect, useRef, useState } from "react";
import { soundManager } from "@/lib/soundManager";

/**
 * TurnIndicator — the "whose turn is it" system (see TURN-BRIEF.md / turn-indicator.html).
 *
 * THE CONTRACT: cyan (#35D6E8) = YOU. Nothing else on screen is ever cyan. Every other player's
 * turn is warm white (#D8E6DB). A player learns this in one round and never reads a word again.
 *
 * Our arena layout differs from the reference mockup (a curved arc rail instead of a vertical
 * rail), so this component owns the LAYOUT-INDEPENDENT signals that ring the whole viewport:
 *   1. The frame breathes  — a cyan inner glow pulses around the arena on your turn; flips to a
 *      red panic beat when your own clock drops under ~22%.
 *   2. The announcement sweep — your turn opens with a cyan band that wipes across with a big
 *      "YOUR TURN"; everyone else's turn gets a deliberately quiet small warm caption. The
 *      asymmetry is the point — if every turn shouted, none would mean anything.
 *   3. Sound + haptic + tab title fire the instant it becomes your turn, so a player with the tab
 *      backgrounded still gets pulled back in.
 *
 * Rendered inside the arena viewport (position:relative) so `inset:0` rings the game, not the
 * whole document. Fully pointer-events:none — it never blocks the board underneath.
 */
interface TurnIndicatorProps {
  /** A turn is actively in progress (status playing, arena not frozen by a dance/spin). */
  active: boolean;
  /** It is the local player's turn to act. */
  myTurn: boolean;
  /** Display name of whoever's turn it currently is. */
  currentName: string;
  secondsLeft: number;
  turnSeconds: number;
  /** Changes whenever the turn passes to a new seat — drives the announcement sweep. */
  turnKey: string | number | null;
  soundOn: boolean;
}

export default function TurnIndicator({
  active,
  myTurn,
  currentName,
  secondsLeft,
  turnSeconds,
  turnKey,
  soundOn,
}: TurnIndicatorProps) {
  const [fire, setFire] = useState(false);
  const [fireMine, setFireMine] = useState(false);
  const [label, setLabel] = useState("Your turn");
  const prevKey = useRef<string | number | null>(null);
  const fireTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasMine = useRef(false);
  const prevTitle = useRef("");

  // Panic only ever fires on your OWN clock — under ~22% of the turn (min 2s).
  const panic = myTurn && active && turnSeconds > 0 && secondsLeft <= Math.max(2, Math.round(turnSeconds * 0.22));

  // ── The announcement sweep — fires on every turn change (loud for you, quiet for them) ──
  useEffect(() => {
    if (!active || turnKey == null) {
      prevKey.current = turnKey;
      return;
    }
    if (prevKey.current === turnKey) return;
    const first = prevKey.current === null;
    prevKey.current = turnKey;
    // Don't flash an opponent announcement the instant we mount into an in-progress game; still
    // announce if the very first turn we see is our own.
    if (first && !myTurn) return;

    setFireMine(myTurn);
    setLabel(myTurn ? "Your turn" : `${currentName || "Player"}'s turn`);
    setFire(false);
    // Restart the CSS animation on the next frame.
    requestAnimationFrame(() => requestAnimationFrame(() => setFire(true)));
    if (fireTimer.current) clearTimeout(fireTimer.current);
    fireTimer.current = setTimeout(() => setFire(false), myTurn ? 1350 : 1250);
    // currentName intentionally excluded — the sweep is keyed to the turn change, not name churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnKey, active, myTurn]);

  // ── Sound + haptic + tab title on the rising edge of YOUR turn ──
  useEffect(() => {
    const mine = myTurn && active;
    if (mine && !wasMine.current) {
      if (soundOn) {
        try {
          soundManager.playConfirm();
        } catch {
          /* audio not ready */
        }
        try {
          navigator.vibrate?.(40);
        } catch {
          /* haptics unsupported */
        }
      }
      if (typeof document !== "undefined") {
        if (!prevTitle.current) prevTitle.current = document.title;
        document.title = "(Your turn) 31 — Arena";
      }
    } else if (!mine && wasMine.current) {
      if (typeof document !== "undefined" && prevTitle.current) {
        document.title = prevTitle.current;
        prevTitle.current = "";
      }
    }
    wasMine.current = mine;
  }, [myTurn, active, soundOn]);

  // Always restore the tab title when this leaves the tree (e.g. game over / navigation).
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined" && prevTitle.current) {
        document.title = prevTitle.current;
        prevTitle.current = "";
      }
      if (fireTimer.current) clearTimeout(fireTimer.current);
    };
  }, []);

  const rootClass = [
    "ti-root",
    myTurn && active ? "mine" : "theirs",
    panic ? "panic" : "",
    fire ? (fireMine ? "fire fire-mine" : "fire fire-them") : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} aria-hidden>
      {/* frame breathes cyan on your turn, red when your time is nearly out */}
      <div className="ti-edge" />
      {/* the announcement sweep */}
      <div className="ti-sweep">
        <span className="ti-bar" />
        <span className="ti-bolt l" />
        <span className="ti-bolt r" />
        <b>{label}</b>
      </div>
    </div>
  );
}
