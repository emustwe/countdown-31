"use client";

/**
 * Is this an iOS device — ANY browser, not just Safari?
 *
 * This exists because the codebase used to decide "is this iPhone?" by probing for the Fullscreen
 * API: no API meant iOS, an API meant Android. That is a question about the JAVASCRIPT ENGINE, not
 * about the device, and it gets Chrome / Firefox / Edge on iOS wrong — Apple requires them all to
 * be WKWebView under a different shell, so what they expose is WebKit's, while the browser chrome
 * on screen is not Safari's. A device misread as Android gets no scroll gap, which is the only
 * mechanism iOS has for clearing the bars, plus a fullscreen button that cannot do anything. The
 * result is a player who can neither swipe nor tap their way to a full screen.
 *
 * Ask about the platform instead. iPadOS 13+ deliberately claims to be a Mac, so the touch points
 * are what give it away — a real Mac reports 0 (or 1 with a touch bar).
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1;
}

/**
 * Will a fullscreen request actually produce a full screen HERE?
 *
 * The single source of truth for "this browser can go fullscreen", so the arena and the scroll hint
 * can never disagree about which platform they are on. Deliberately NOT a bare API probe: WebKit
 * exposes `webkitRequestFullscreen` on iPad even though it does nothing for page content, so the
 * probe alone answers yes on a device where the answer is no.
 */
export function canFullscreen(): boolean {
  if (typeof document === "undefined") return false;
  if (isIOS()) return false; // whatever the API says — Apple allows it for <video> only
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown };
  return typeof el.requestFullscreen === "function" || typeof el.webkitRequestFullscreen === "function";
}

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
  if (!canFullscreen()) return false; // iOS lands here, whatever it exposes
  const el = (target ?? document.documentElement) as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  const fn = el.requestFullscreen ?? el.webkitRequestFullscreen;
  if (typeof fn !== "function") return false;
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
  /**
   * 10px, not 24. MEASURED on an iPhone: Chrome for iOS in landscape reports 100lvh 372 against a
   * visual viewport of 350 — **22px of chrome** — with its omnibox plainly on screen. Safari shows
   * ~101px in the same state, which is where 24 came from, and 22 fell straight through it.
   *
   * That one number was the whole iOS-Chrome bug. Reading 22 as "no chrome" meant the bars looked
   * already gone the moment the arena loaded, so the page latched collapsed and locked itself
   * (touch-action:none) at scroll 0 — nothing to scroll, and no arrow either, because the latch
   * said the job was done. A browser whose chrome is thinner than Safari's must not read as a
   * browser with no chrome at all.
   */
  return barsHidden - visible >= 10;
}
