"use client";

/**
 * Ask the browser for true fullscreen.
 *
 * MUST be called synchronously from a real user gesture (a click/tap handler). Browsers reject the
 * request otherwise — deliberately, or any page could seize the screen on load. That constraint is
 * why the entry screen's Next button exists as the place this is called from.
 *
 * Android Chrome supports this for any element. iOS Safari does NOT implement it for anything but
 * <video> and never has, so this is a no-op on iPhone and iPad — there, the only way to reclaim the
 * browser chrome is Safari's own collapse-on-scroll, which the arena handles separately.
 *
 * Returns true only if a request was actually issued.
 */
export function requestFullscreen(target?: Element | null): boolean {
  if (typeof document === "undefined") return false;
  const el = (target ?? document.documentElement) as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  const fn = el.requestFullscreen ?? el.webkitRequestFullscreen;
  if (typeof fn !== "function") return false; // iOS lands here
  try {
    const r = fn.call(el);
    if (r && typeof (r as Promise<void>).catch === "function") {
      (r as Promise<void>).catch(() => {
        /* user denied, or the gesture had already expired — nothing to do */
      });
    }
    return true;
  } catch {
    return false;
  }
}

/** True when the page is currently in browser fullscreen. */
export function inFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  const d = document as Document & { webkitFullscreenElement?: Element | null };
  return !!(document.fullscreenElement || d.webkitFullscreenElement);
}
