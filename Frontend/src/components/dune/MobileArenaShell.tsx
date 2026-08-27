"use client";

import type { ReactNode } from "react";

/**
 * Phone/tablet-only landscape arena. It deliberately accepts complete UI slots so game state
 * and commands remain owned by CountDown31 while the touch composition stays isolated.
 */
export function MobileArenaShell({
  board,
  action,
  battle,
  modeSwitch,
}: {
  board: ReactNode;
  action: ReactNode;
  battle: ReactNode;
  modeSwitch?: ReactNode;
}) {
  return (
    <main className="mobile-arena-shell" aria-label="Landscape mobile game arena">
      <section className="mobile-arena-board">{board}</section>
      <section className="mobile-arena-action">{action}</section>
      <section className="mobile-arena-players" aria-label="Players">
        {battle}
      </section>
      {modeSwitch && <section className="mobile-arena-modes">{modeSwitch}</section>}
    </main>
  );
}
