"use client";

/**
 * Is a full-screen loading takeover on screen right now?
 *
 * Exists for one reason: the swipe-up arrow must NOT be offered while the arena is still being
 * prepared. The arrow is mounted in the root layout, so it survives every route change and was
 * therefore on screen during the entry takeover — inviting exactly the one gesture the page cannot
 * survive at that moment.
 *
 * Why the swipe is harmful THERE and nowhere else: the loading screen mounts none of the machinery
 * that makes a swipe safe. `MobileLandscape` (which keeps `--app-vh` honest) and `FullBleedPage`
 * (which watches the bars and latches the collapse) both live inside the arena, which by definition
 * has not mounted yet. The scroll gap the lobby left behind, however, IS still there — deliberately,
 * so the collapsed bars carry across the navigation. So a swipe during the takeover moves a page
 * with nobody watching: the bars change state unobserved, and the arena mounts into whatever
 * position that left, which is how the board ended up sitting low with its bottom row off screen.
 *
 * A latch rather than a DOM query because the arrow has to react the instant the takeover appears.
 * Its own polling loop runs at 800ms, and 800ms is long enough to tap.
 *
 * A COUNT, not a boolean: React mounts the next screen before unmounting the previous one in some
 * transitions, and in development StrictMode mounts every effect twice. Either one would have a
 * stray cleanup clear a latch another takeover still needs.
 */
let depth = 0;
const listeners = new Set<() => void>();

export function isEntering(): boolean {
  return depth > 0;
}

/** Called by the takeover itself, on mount (`true`) and again from its cleanup (`false`). */
export function setEntering(on: boolean): void {
  const was = depth > 0;
  depth = Math.max(0, depth + (on ? 1 : -1));
  if (was !== depth > 0) listeners.forEach((fn) => fn());
}

export function onEnteringChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
