"use client";

import { RELATIVE_BAR_COLLAPSE } from "./mobile-flags";

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

/** True while an on-screen keyboard is (almost certainly) open. */
export function keyboardOpen(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * How many pixels of browser chrome are on screen RIGHT NOW. 0 when none, or when unmeasurable.
 *
 * This is the one number the whole collapse mechanism turns on, so it is measured rather than
 * assumed — and it is wildly different between browsers on the same phone. Landscape, same iPhone:
 *
 *   Safari iOS     ~101px   (top tab bar + bottom toolbar)
 *   Chrome iOS       22px   (a thin omnibox; no bottom toolbar in landscape at all)
 *
 * Any constant tuned for one of those is wrong for the other by a factor of five, which is how both
 * iOS-Chrome bugs in this file's history happened.
 */
function probeViewportUnit(unit: "lvh" | "svh" | "dvh"): number {
  if (typeof document === "undefined") return 0;
  const probe = document.createElement("div");
  // `100vh` first as the fallback for anything without the v2 units — an unsupported unit leaves the
  // declaration dropped, and a probe with no height at all would read as "no chrome whatsoever".
  probe.style.cssText = `position:fixed;top:0;left:0;width:1px;height:100vh;height:100${unit};visibility:hidden;pointer-events:none`;
  document.body.appendChild(probe);
  const h = probe.getBoundingClientRect().height;
  probe.remove();
  return h;
}

export function chromeGapPx(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const barsHidden = probeViewportUnit("lvh");
  const visible = window.visualViewport?.height ?? window.innerHeight;
  if (!barsHidden || !visible) return 0;
  return Math.round(barsHidden - visible);
}

/**
 * 10px. MEASURED on an iPhone: Chrome for iOS in landscape reports 100lvh 372 against a visual
 * viewport of 350 — **22px of chrome** — with its omnibox plainly on screen. Safari shows ~101px in
 * the same state, which is where the old 24 came from, and 22 fell straight through it.
 *
 * That one number was the first iOS-Chrome bug. Reading 22 as "no chrome" meant the bars looked
 * already gone the moment the arena loaded, so the page latched collapsed and locked itself
 * (touch-action:none) at scroll 0 — nothing to scroll, and no arrow either, because the latch said
 * the job was done. A browser whose chrome is thinner than Safari's must not read as a browser with
 * no chrome at all.
 */
const CHROME_FLOOR_PX = 10;
/** Past this the reading is the KEYBOARD, not the chrome — Safari's ~101px is the widest known. */
const CHROME_PLAUSIBLE_MAX_PX = 140;
/** Shrunk to below this share of the bars-up baseline = collapsed. See RELATIVE_BAR_COLLAPSE. */
const COLLAPSED_SHARE = 0.5;

/**
 * The largest chrome seen since the last reset — i.e. what this browser's bars measure when they
 * are fully UP, learned from the device instead of written down here.
 *
 * It only ever grows, so the frames mid-collapse (each smaller than the last) cannot move it, and
 * it is reset by the two events that genuinely change what "bars up" means: a rotation (iOS Chrome
 * drops its bottom toolbar in landscape, so the portrait figure says nothing about landscape) and a
 * return from another app.
 */
let barsUpBaselinePx = 0;

/** Forget the learned chrome figures. Call when the chrome itself changes — rotation, app switch. */
export function resetChromeBaseline(): void {
  barsUpBaselinePx = 0;
}

/**
 * How much browser chrome can actually RETRACT — the one number the scroll gap must equal.
 *
 * THE GAP IS WHAT THE BROWSER SCROLLS TO RETRACT ITS BARS, and the retraction consumes exactly as
 * much scroll as there is chrome to retract. Any gap beyond that is left over as scroll, the page
 * sits that far down, and the board's bottom row is pushed off the screen. Measured on an iPhone 14
 * in Chrome, from the calibrator, with the bars down:
 *
 *   100lvh 372, 100svh 350  ->  22px retracts
 *   gap applied 34          ->  scrollY 12   <- the slice, 34 − 22
 *
 * `100lvh − 100svh` IS that number, and it is NOT a figure read off one handset: the spec defines
 * the large viewport as "assuming any dynamically retracted UA interfaces are retracted" and the
 * small one as "assuming they are expanded", so the difference is the browser stating what it can
 * retract. The same expression answers 22 on an iPhone 14, 19 on a 13 Pro Max, ~101 on Safari, and
 * whatever is right on a handset that does not exist yet. Asking the browser is the generalisation;
 * measuring a phone and writing the answer down is what it replaces.
 *
 * Returns 0 for "this browser will not say", which leaves the caller on its old generous sizing.
 */
export function retractableChromePx(): number {
  const lvh = probeViewportUnit("lvh");
  const svh = probeViewportUnit("svh");
  if (!lvh || !svh) return 0;
  const retractable = Math.round(lvh - svh);
  // Below the floor there is nothing worth retracting; above the plausible max the reading is the
  // keyboard or a broken unit, not browser chrome.
  return retractable >= CHROME_FLOOR_PX && retractable <= CHROME_PLAUSIBLE_MAX_PX ? retractable : 0;
}

/**
 * Are the browser's own bars currently on screen?
 *
 * MEASURED, not inferred from scroll position. `scrollY` is unusable for this on iOS: the bars
 * collapse DURING the swipe, the viewport grows, and Safari settles the scroll back to a smaller
 * value — so a "scrolled past the gap" test never fires on a real device even though it passes in an
 * emulator, where nothing collapses and a programmatic scroll stays put.
 *
 * RELATIVE, not absolute (see RELATIVE_BAR_COLLAPSE). "Collapsed" cannot mean a fixed number of
 * pixels, because what a collapsed browser leaves behind is different on every browser:
 *
 *   Safari iOS    ~101px up  →    0px collapsed
 *   Chrome iOS      ~70px up  →  22px collapsed   ← never reaches any fixed floor above 22
 *
 * Measuring against the largest chrome this browser has shown instead means both describe the same
 * event: the bars are down once they have shrunk to less than half of their full height. Safari is
 * unaffected — 0 is below half of 101 just as it was below 10 — while Chrome's 22 against a 70px
 * baseline finally reads as the collapse it is, so the arrow goes away and the page locks exactly
 * as it does on Safari.
 *
 * The half-share matters as much as the baseline: a swipe collapses the bars over several frames,
 * and a threshold set too close to the full height would fire mid-animation and lock the page with
 * the bars still half up.
 */
export function barsAreUp(): boolean {
  if (typeof window === "undefined") return false;
  const gap = chromeGapPx();
  // Learn the bars-up height — but never from a reading taken while a field is focused, and never
  // from an implausibly large one. Both are the KEYBOARD shrinking the visual viewport, and a
  // baseline poisoned to keyboard height would make the real bars-up state read as collapsed.
  if (!keyboardOpen() && gap <= CHROME_PLAUSIBLE_MAX_PX && gap > barsUpBaselinePx) {
    barsUpBaselinePx = gap;
  }
  // STRICTLY greater: a browser sitting at exactly half its bars-up height has collapsed as far as
  // it goes. Measured, this is the difference between covering a 44px toolbar and not — with `>=`,
  // 22 against a 44px baseline reads as bars still up and the arrow never leaves.
  const up =
    gap >= CHROME_FLOOR_PX &&
    (!RELATIVE_BAR_COLLAPSE || gap > Math.max(CHROME_FLOOR_PX, barsUpBaselinePx * COLLAPSED_SHARE));

  return up;
}
