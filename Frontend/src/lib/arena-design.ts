"use client";

import { useEffect, useState } from "react";

/**
 * Which arena design is live — the ONE switch for the whole redesign.
 *
 * `true`  → MIRROR ARC: the number board is an arc facing the player rail, and the arena roster is a
 *           curved scrolling list. Both the practice game and real tournaments use it.
 * `false` → the previous design: the 31-tile serpentine track board + the flat roster column.
 *
 * ── TO REVERT ──────────────────────────────────────────────────────────────
 * Flip the constant below to `false`, rebuild, restart. Nothing else to undo — the old components are
 * untouched and still imported, so this is a real switch, not a deletion.
 *
 * To look at either design WITHOUT a rebuild (useful for a side-by-side on a phone):
 *   https://vera31.com/home?arc=0   → force the old board
 *   https://vera31.com/home?arc=1   → force the new board
 * The choice sticks in localStorage for that browser until it is set the other way.
 */
export const ARC_DESIGN_DEFAULT = true;

const KEY = "vera31-arc-design";

/** Resolve the override. Returns the default when there is no stored/URL preference. */
function resolveOverride(): boolean {
  if (typeof window === "undefined") return ARC_DESIGN_DEFAULT;
  try {
    const q = new URLSearchParams(window.location.search).get("arc");
    if (q === "0" || q === "1") {
      const v = q === "1";
      localStorage.setItem(KEY, v ? "1" : "0");
      return v;
    }
    const stored = localStorage.getItem(KEY);
    if (stored === "0" || stored === "1") return stored === "1";
  } catch {
    /* private mode / blocked storage — fall through to the default */
  }
  return ARC_DESIGN_DEFAULT;
}

/**
 * The first render always returns ARC_DESIGN_DEFAULT so the server and client agree; any override is
 * applied on the next frame. That one-frame settle only affects the manual `?arc=` preview — the real
 * revert path is the constant, which has no flash at all.
 */
export function useArcDesign(): boolean {
  const [on, setOn] = useState(ARC_DESIGN_DEFAULT);
  useEffect(() => {
    const v = resolveOverride();
    if (v !== ARC_DESIGN_DEFAULT) setOn(v);
  }, []);
  return on;
}
