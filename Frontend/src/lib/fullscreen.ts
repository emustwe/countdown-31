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

/**
 * Are the browser's own bars currently on screen?
 *
 * MEASURED, not inferred from scroll position. `scrollY` is unusable for this on iOS: the bars
 * collapse DURING the swipe, the viewport grows, and Safari settles the scroll back to a smaller
 * value — so a "scrolled past the gap" test never fires on a real device even though it passes in an
 * emulator, where nothing collapses and a programmatic scroll stays put.
 *
 * 100lvh is the viewport AS IF no chrome were present (on iOS it never shrinks); visualViewport.height
 * is what is genuinely visible right now. The difference between them IS the chrome.
 */
/** True while an on-screen keyboard is (almost certainly) open. */
export function keyboardOpen(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function barsAreUp(): boolean {
  if (typeof window === "undefined") return false;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const barsHidden = probe.getBoundingClientRect().height;
  probe.remove();
  const visible = window.visualViewport?.height ?? window.innerHeight;
  if (!barsHidden || !visible) return false;
  return barsHidden - visible >= 24;
}
