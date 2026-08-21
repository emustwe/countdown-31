"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Returns an index that advances 0→count-1→0 every `intervalMs`. Use it to drive a whole-
 * element flip (e.g. a card): key the element by this index so it re-mounts and replays the
 * flip animation, and pick EN/KO content by the index. Give each element a different
 * interval so they don't all flip at the same moment. */
export function useFlipIndex(intervalMs: number, count = 2): number {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, count]);
  return i;
}

/** Size-stable bilingual text driven by an external `showKo` flag (typically from
 * `useFlipIndex`). Both languages are stacked in one grid cell so the element always
 * reserves the widest one and only the active language shows — swapping never shifts
 * surrounding layout. Use this for inline stats/labels where a plain `ko ? … : …`
 * ternary would resize the box. */
export function BiStable({
  en,
  ko,
  showKo,
  className = "",
}: {
  en: ReactNode;
  ko: ReactNode;
  showKo: boolean;
  className?: string;
}) {
  return (
    <span className={`flip-stack ${className}`}>
      <span className={showKo ? "flip-ghost" : undefined} aria-hidden={showKo}>{en}</span>
      <span className={showKo ? undefined : "flip-ghost"} aria-hidden={!showKo}>{ko}</span>
    </span>
  );
}

/** Cycles through its `items` on a timer, replaying a smooth 3D flip each time it swaps.
 *
 * Size-stable: every item is stacked in the same grid cell, so the element always
 * reserves the width/height of the widest item and only the active one is visible.
 * Swapping languages animates in place and never resizes — so surrounding layout
 * (e.g. a nav row) stays put instead of compacting/expanding. Reusable for any
 * bilingual/rotating heading. */
export function FlipText({
  items,
  intervalMs = 2000,
  className = "",
}: {
  items: ReactNode[];
  intervalMs?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % items.length), intervalMs);
    return () => clearInterval(id);
  }, [items.length, intervalMs]);

  const active = i % items.length;
  return (
    <span className={`flip-stack ${className}`}>
      {items.map((item, idx) => (
        // Toggling the `.flip-text` class off→on restarts its flip animation without a
        // remount; ghosts stay in flow (visibility:hidden) to hold the stable size.
        <span key={idx} className={idx === active ? "flip-text" : "flip-ghost"} aria-hidden={idx !== active}>
          {item}
        </span>
      ))}
    </span>
  );
}
