"use client";

import type { ReactNode } from "react";

/**
 * Phone/tablet-only arena composition. It deliberately accepts complete UI slots so the
 * game state and commands remain owned by CountDown31 while mobile layout stays isolated.
 */
export function MobileArenaShell({
  board,
  action,
  player,
  opponent,
  modeSwitch,
}: {
  board: ReactNode;
  action: ReactNode;
  player: ReactNode;
  opponent: ReactNode;
  modeSwitch?: ReactNode;
}) {
  return (
    <main className="mobile-arena-shell" aria-label="Mobile game arena">
      <section className="mobile-arena-board">{board}</section>
      <section className="mobile-arena-action">{action}</section>
      <section className="mobile-arena-players" aria-label="Players">
        {player}
        {opponent}
      </section>
      {modeSwitch && <section className="mobile-arena-modes">{modeSwitch}</section>}
    </main>
  );
}
