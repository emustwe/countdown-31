"use client";

import { useEffect, useState } from "react";

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  ARENA PREVIEW SWITCH — a URL flag, so the new arena can be looked at on the
 *  real site without anyone else seeing it.
 * ════════════════════════════════════════════════════════════════════════════
 *
 *   /home?arena=v2   → the new arena (no floating card, wide list, avatar faces)
 *   /home?arena=v1   → back to today's arena, and forget the choice
 *   /home            → today's arena, exactly as it is now
 *
 * Why a flag and not a preview subdomain: preview.vera31.com has no DNS record,
 * so it would need one added at the registrar plus a TLS certificate; the droplet
 * is at 95% disk with 458 MiB of RAM, so a second build and service is a squeeze;
 * and a plain-HTTP preview on a port would have every API call blocked as mixed
 * content from an HTTPS origin, so the game would render but not play.
 *
 * The choice is kept in sessionStorage, NOT localStorage or a cookie: it has to
 * survive lobby → game navigation (the flag is only on the first URL), but it
 * must not outlive the tab, or a preview turns into a setting nobody remembers
 * turning on.
 */
const KEY = "vera31:arena-skin";

/** Read the flag. Safe on the server and in private mode, where storage throws. */
export function detectArenaV2(): boolean {
  if (typeof window === "undefined") return false;
  let q: string | null = null;
  try {
    q = new URLSearchParams(window.location.search).get("arena");
  } catch {
    q = null;
  }
  if (q === "v2") {
    try {
      sessionStorage.setItem(KEY, "v2");
    } catch {
      /* private mode — the flag still works for this page, just not across navigation */
    }
    return true;
  }
  if (q === "v1") {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* nothing to clear */
    }
    return false;
  }
  try {
    return sessionStorage.getItem(KEY) === "v2";
  } catch {
    return false;
  }
}

/**
 * Deliberately resolved in an effect rather than during render.
 *
 * The arena is a client component but Next still renders it on the SERVER, where there is no URL
 * bar and no sessionStorage. Reading the flag during render would make the server say "v1" and the
 * browser say "v2" for the same markup, which is a hydration mismatch. One frame of the old arena
 * before it switches is the cost, and on a preview flag that is nothing.
 */
export function useArenaV2(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(detectArenaV2());
  }, []);
  return on;
}
