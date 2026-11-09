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

/**
 * The smallest chrome seen once the bars were observed to go down — i.e. the sliver this browser
 * keeps even when fully collapsed. 0 on Safari, ~22px on Chrome for iOS.
 *
 * Only ever shrinks, so it converges on the true resting figure rather than on a frame caught
 * mid-animation, and `null` means "not learned yet" (which is not the same as "zero").
 */
let collapsedFloorPx: number | null = null;

/** Orientation-keyed: iOS Chrome drops its bottom toolbar in landscape, so the two differ. */
function floorStoreKey(): string {
  const landscape = typeof window !== "undefined" && window.innerWidth > window.innerHeight;
  return `vera31:chrome-floor:${landscape ? "landscape" : "portrait"}`;
}

/**
 * Remembered across reloads, because the sliver is a property of the BROWSER and does not change.
 * Without this it has to be re-learned by collapsing the bars once, and the one swipe that teaches
 * it is the one swipe that shows the strip — exactly the "sometimes" in the bug report.
 */
function storedFloor(): number | null {
  try {
    const raw = sessionStorage.getItem(floorStoreKey());
    if (raw === null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= CHROME_PLAUSIBLE_MAX_PX ? n : null;
  } catch {
    return null; // private mode / blocked storage — fall back to learning it live
  }
}

/** Forget the learned chrome figures. Call when the chrome itself changes — rotation, app switch. */
export function resetChromeBaseline(): void {
  barsUpBaselinePx = 0;
  collapsedFloorPx = null;
}

/**
 * How much chrome this browser can ACTUALLY retract, which is not the same as how much is on screen.
 *
 * THE SOURCE OF THE EMPTY STRIP. The scroll gap exists to give the browser something to scroll so it
 * will collapse its bars, and the collapse consumes the first N pixels of that scroll. Every pixel
 * after N genuinely scrolls the document, sliding the fixed page layer up and leaving empty space
 * below it. Sizing the gap to the chrome ON SCREEN assumes all of it can go — true on Safari, false
 * on Chrome for iOS, which keeps a thin omnibox whatever you do:
 *
 *   Safari iOS    101 on screen → 101 retracts → gap 113 → 12px of slide   (never noticed)
 *   Chrome iOS     70 on screen →  48 retracts → gap  82 → 34px of slide   ← the empty div
 *
 * Two independent answers, best first:
 *
 *  1. MEASURED on this device — the bars-up height minus the sliver left after a real collapse.
 *     Nothing to assume; it is what the browser actually did. Needs one collapse to learn, which is
 *     why it is remembered for the session.
 *  2. `100lvh − 100svh` — the spec's own "how much UA chrome is dynamically retractable", available
 *     with no collapse at all. Used until (1) exists, and a sanity check on nothing: a browser that
 *     mis-reports it is corrected by (1) the first time the bars move.
 *
 * Returns 0 for "unknown", which tells the caller to keep the old behaviour of sizing to the total.
 */
export function sheddableChromePx(): number {
  const floor = collapsedFloorPx ?? storedFloor();
  if (barsUpBaselinePx > 0 && floor !== null) {
    const measured = barsUpBaselinePx - floor;
    if (measured >= CHROME_FLOOR_PX) return measured;
  }
  const retractable = Math.round(probeViewportUnit("lvh") - probeViewportUnit("svh"));
  if (retractable >= CHROME_FLOOR_PX && retractable <= CHROME_PLAUSIBLE_MAX_PX) return retractable;
  return 0;
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

  // Learn the sliver this browser keeps when collapsed — the other half of sizing the scroll gap.
  // Only from a reading taken AFTER the bars have been seen up, so a cold load that happens to start
  // collapsed cannot teach a floor that the baseline knows nothing about.
  if (!up && !keyboardOpen() && barsUpBaselinePx > 0 && gap >= 0 && gap <= CHROME_PLAUSIBLE_MAX_PX) {
    if (collapsedFloorPx === null || gap < collapsedFloorPx) {
      collapsedFloorPx = gap;
      try {
        sessionStorage.setItem(floorStoreKey(), String(gap));
      } catch {
        /* private mode / blocked storage — the in-memory value still does the job this page-life */
      }
    }
  }

  return up;
}
