"use client";

/**
 * Has the browser chrome been collapsed this page-life?
 *
 * A LATCH, deliberately — not a live reading. The previous version re-measured the viewport on every
 * change, so the keyboard opening, the keyboard animating, and focus moving between the name field
 * and the country picker each re-ran the check and flipped the state. That flipping was the page
 * visibly zooming in and out, and it is what wrecked the name prompt a second after it appeared.
 *
 * Measured once, when the bars actually go. After that nothing looks again, so nothing can flip.
 * Reset only by a reload (fresh module state) or a return from another app — the two moments the
 * bars genuinely come back.
 */
let collapsed = false;
const listeners = new Set<() => void>();

export function isCollapsed(): boolean {
  return collapsed;
}

export function setCollapsed(next: boolean): void {
  if (collapsed === next) return;
  collapsed = next;
  listeners.forEach((fn) => fn());
}

export function onCollapseChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
