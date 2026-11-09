"use client";

import { useEffect } from "react";
import { ONE_WAY_COLLAPSE } from "../../lib/mobile-flags";
import {
  barsAreUp,
  canFullscreen,
  chromeGapPx,
  keyboardOpen,
  resetChromeBaseline,
  sheddableChromePx,
} from "../../lib/fullscreen";
import { isCollapsed, setCollapsed } from "../../lib/collapse-latch";

/**
 * THE GAP IS MEASURED, NOT A CONSTANT. This used to be a flat 112px and that was the whole bug.
 *
 * The gap exists to give the browser something to scroll so it will collapse its bars. A swipe
 * spends its first pixels doing exactly that — and every pixel AFTER that genuinely scrolls the
 * document, sliding the fixed page layer up and exposing the empty gap beneath it. That is the
 * black panel that slides out from under the arena instead of a zoom.
 *
 *   Safari iOS    chrome ~101  →  112 gap  →  ~11px of slide   (never noticed — this is why it worked)
 *   Chrome iOS    chrome   22  →  112 gap  →   90px of slide   ← the panel
 *
 * 90px of a 372px viewport is a quarter of the screen. Note the gap is NOT consumed by the
 * collapse: `calc(100% + Npx)` resolves against the current viewport, so it stays fully scrollable
 * in either bar state — measured on the device as `scrollH − clientH: 112` with the bars already
 * down.
 *
 * SIZED TO WHAT RETRACTS, NOT TO WHAT IS ON SCREEN — which is the same bug one level down, and the
 * strip that was still appearing "sometimes" after the measured gap landed. The collapse only
 * consumes as much scroll as there is chrome that can actually GO, and on Chrome for iOS a thin
 * omnibox stays put however far you swipe:
 *
 *   Safari iOS    101 on screen → 101 retracts → gap 113 → 12px of slide
 *   Chrome iOS     70 on screen →  48 retracts → gap  82 → 34px of slide   ← the empty div
 *                                                gap  60 →  12px, i.e. Safari's own residual
 *
 * See sheddableChromePx() for where that second figure comes from.
 */
const GAP_SLACK_PX = 12;
/**
 * 2px, and it is INSURANCE, not slack — see remeasureGap(). The settled slide is `gap − retractable`,
 * so every pixel of gap past the retractable chrome is a pixel of the page pushed off the bottom of
 * the screen. Two is enough to absorb the ±1px rounding in `chromeGapPx()` and is invisible; if the
 * bars ever stop collapsing all the way, this is the number to raise.
 */
const EXACT_GAP_INSURANCE_PX = 2;
/**
 * Below this a thumb flick may not register as a scroll at all, so the bars never collapse.
 *
 * ONLY FOR THE UNKNOWN CASE now. As a floor on every gap it was itself a bug: Chrome for iOS
 * retracts 19px (a 70px toolbar collapsing to a 51px one), so a 34px floor guaranteed 15px of slide
 * no matter what else was right — which is the board's bottom row sliced off, measured off the
 * device at 12px.
 */
const MIN_GAP_PX = 34;
/** Safari's ~101px is the widest chrome known; past this the measurement is wrong, not the browser. */
const MAX_GAP_PX = 140;

/**
 * Gives a full-bleed page the scroll room Safari needs to collapse its bars — on iOS ONLY.
 *
 * The gap is the only way to reclaim the browser chrome on iPhone: Apple exposes no Fullscreen API
 * for page content. It is also what produced the strip that used to cover the game, so it is now
 * confined to the one platform that has no alternative, and nothing scrolls the page on its behalf —
 * the fullscreen control no longer scrolls, which is what used to drag that strip into view.
 *
 * ANDROID GETS NO GAP AT ALL. It has real fullscreen, so there is nothing to scroll and nothing that
 * can slide over the board.
 *
 * Applied as an INLINE STYLE rather than via a selector: `html:has(...)` and `html[data-fullbleed]`
 * were both tried and both silently stopped matching after a client-side route change, leaving the
 * lobby with no gap while a direct load had one. An inline style has no selector to re-evaluate.
 */
/**
 * The gap currently applied, in px. MODULE scope, not per-mount: the component remounts on every
 * route change, and a fresh local reset this to the minimum — so tapping Play while collapsed
 * shrank the document from 82px to 34px underneath a page parked at the bottom of it, which is the
 * one thing the comment on remeasureGap() says must never happen. Surviving the navigation is what
 * makes "a collapsed page keeps the gap it collapsed with" actually true.
 *
 * Never read back out of the DOM, because the style it is written to is the very thing being
 * measured against.
 */
let gapPx = MIN_GAP_PX;

export function FullBleedPage() {
  useEffect(() => {
    const el = document.documentElement;
    const body = document.body;

    const applies = () =>
      // Android is excluded here, by design. This now asks what DEVICE this is, not what the
      // engine exposes — Chrome/Firefox/Edge on iOS are WebKit under another shell, and the old
      // API probe classified them as Android, so they got no gap and no way to clear the bars.
      !canFullscreen() &&
      window.matchMedia("(pointer: coarse)").matches &&
      window.matchMedia("(orientation: landscape)").matches &&
      !window.matchMedia("(display-mode: standalone)").matches &&
      (navigator as Navigator & { standalone?: boolean }).standalone !== true;

    const clear = () => {
      el.style.removeProperty("min-height");
      el.style.removeProperty("overflow-y");
      body.style.removeProperty("overflow-y");
    };

    /* The gap currently applied lives at MODULE scope — see the declaration above the component. */

    /**
     * Re-measure the chrome and resize the gap to match it.
     *
     * ONLY while the bars are actually up. Once they are down the chrome measures 0, which would
     * shrink the gap to the minimum — and shrinking the document under a page that is parked at the
     * bottom of it forces scrollY back toward 0, which is one of the things that makes iOS put its
     * bars back. The fix would trigger exactly what it prevents, so a collapsed page keeps the gap
     * it collapsed with until something (a rotation, a reload, an app switch) says otherwise.
     */
    const remeasureGap = () => {
      if (isCollapsed()) return;
      // A focused field means the viewport is short because of the KEYBOARD, not the chrome. Taking
      // that reading would size the gap to the keyboard and leave a gap that size behind once it
      // closed — the same dead-space bug, from the other direction.
      if (keyboardOpen()) return;
      const chrome = chromeGapPx();
      if (chrome < 10) return; // bars already down, or unmeasurable — keep what we have
      /**
       * `chrome` is what is ON SCREEN; `shed` is how much of it can actually GO. The difference is
       * the empty strip — the collapse stops consuming scroll once the retractable part is gone, and
       * the rest of the gap slides the page. Never more than is on screen (you cannot retract chrome
       * that is not there), and `0` means not-yet-known, which keeps the old total-chrome behaviour.
       */
      const shed = sheddableChromePx();
      if (shed > 0) {
        // EXACTLY what retracts — no slack, and no minimum. The slide a player is left looking at is
        // `gap − retractable`, confirmed twice from the device:
        //
        //   Safari  gap 113, retracts 101  →  12px   (this file's own "~11px of slide")
        //   Chrome  gap  34, retracts  19  →  15px   (measured off the screenshot at ~12px)
        //
        // So the gap must MATCH the retractable chrome, not exceed it. Clamped to what is actually
        // on screen, because chrome that is not there cannot retract.
        gapPx = Math.min(MAX_GAP_PX, Math.min(shed, chrome) + EXACT_GAP_INSURANCE_PX);
        return;
      }
      // Not learned yet and the browser gives no usable svh: keep the old sizing, which errs towards
      // definitely collapsing. One swipe teaches the real figure and this never runs again.
      gapPx = Math.min(MAX_GAP_PX, Math.max(MIN_GAP_PX, chrome + GAP_SLACK_PX));
    };

    const sync = () => {
      if (!applies()) return clear();
      remeasureGap();
      el.style.setProperty("min-height", `calc(100% + ${gapPx}px)`);
      el.style.setProperty("overflow-y", "auto", "important");
      body.style.setProperty("overflow-y", "auto", "important");
    };

    /**
     * ONE-WAY COLLAPSE (gated by ONE_WAY_COLLAPSE — see lib/mobile-flags.ts).
     *
     * Once the bars are gone, lock the page so they cannot be scrolled back. The gap is deliberately
     * LEFT in place and the scroll position untouched: removing the gap would force scrollY to 0, and
     * landing on 0 is one of the things that makes Safari restore the bars — the fix would trigger
     * exactly what it prevents. Blocking the gesture instead leaves the page sitting at the bottom of
     * the gap with nothing able to move it.
     *
     * Unlocked on a reload (fresh page) or on return from another app, which is when the bars come
     * back anyway and the swipe is needed a second time.
     *
     * NOT complete, and cannot be: tapping the top of the screen is an OS gesture no page can block.
     */
    /** The element the finger actually lands on — html/body are never touched directly. */
    const surface = () =>
      document.querySelector<HTMLElement>(".arena-viewport, .landing-playground");

    const lock = () => {
      if (!ONE_WAY_COLLAPSE) return;
      el.style.setProperty("touch-action", "none");
      body.style.setProperty("touch-action", "none");
      // THE ONE THAT MATTERS. The page is a fixed layer covering the viewport, so every touch lands
      // on IT, and its own touch-action governs the gesture — setting html/body alone did nothing,
      // which is why the bars could still be scrolled back.
      surface()?.style.setProperty("touch-action", "none");
    };
    const unlock = () => {
      el.style.removeProperty("touch-action");
      body.style.removeProperty("touch-action");
      surface()?.style.removeProperty("touch-action");
    };
    // Lock when the bars are actually GONE, measured from the viewport. Keying this off scrollY did
    // not work on a real device: the collapse happens mid-swipe and Safari settles the scroll back,
    // so the threshold never fired even though it passed in an emulator.
    /**
     * Follow the bars BOTH ways, so whatever brings them back — a reload, an app switch, arriving
     * from another page, Safari deciding on its own — puts the arrow back and lets the player
     * collapse them again. The user cannot cause it themselves: while collapsed the page is locked,
     * so scrolling down is not available to them in the first place.
     *
     * Two guards stop this flipping the way an earlier live version did:
     *  - a focused text field means the shrink is the KEYBOARD, not the chrome, so nothing is
     *    re-evaluated at all until it is dismissed;
     *  - everything is debounced, so the frames mid-animation cannot each flip the state.
     */
    let settle: ReturnType<typeof setTimeout> | null = null;
    /**
     * The latch may only fire on an OBSERVED up → down transition, never on a cold reading.
     *
     * A single measurement is not evidence that anything collapsed: any browser whose chrome is
     * thinner than the threshold reads as "already gone" from the very first frame, and the page
     * then locks itself (touch-action:none) before the player has touched it — unable to scroll,
     * with no arrow, because the latch claims the job is done. That is precisely what Chrome for
     * iOS did. Requiring the bars to have been seen UP first makes the state machine describe a
     * transition that actually happened.
     *
     * Deliberately NOT keyed off scrollY: on iOS the collapse happens mid-swipe and the scroll
     * settles back afterwards, so the scroll position is not a reliable witness to it.
     */
    let sawBarsUp = false;
    const evaluate = () => {
      if (keyboardOpen()) return;
      if (settle) clearTimeout(settle);
      settle = setTimeout(() => {
        if (barsAreUp()) {
          sawBarsUp = true;
          if (isCollapsed()) {
            setCollapsed(false);
            unlock();
          }
        } else if (!isCollapsed()) {
          onScroll();
        }
      }, 260);
    };

    const onScroll = () => {
      if (isCollapsed()) return;
      if (barsAreUp()) {
        sawBarsUp = true;
      } else if (sawBarsUp) {
        setCollapsed(true);
        // Only lock a page that has nothing of its own to scroll. On a content page — the shop, the
        // avatar list — freezing the scroll would make it unusable, so those keep their scrolling
        // and simply get the arrow back when the bars return.
        const d = document.documentElement;
        const ownContent = d.scrollHeight - d.clientHeight > gapPx + 40;
        if (!ownContent) lock();
      }
    };
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      unlock();
      // The bars come back on return, so what "bars up" measures starts over with them.
      resetChromeBaseline();
      // Safari brings its bars back when you return to the tab, but the page is still sitting at the
      // bottom of the gap — so there is nothing left to scroll and the swipe is unavailable exactly
      // when it is needed again. Returning to 0 restores the gap, and the arrow with it.
      setCollapsed(false);
      window.scrollTo(0, 0);
    };
    const onRotate = () => {
      setCollapsed(false);
      unlock();
      // Rotating changes the chrome itself — iOS Chrome drops its bottom toolbar in landscape — so
      // what was observed in the old orientation says nothing about the new one. Start again: both
      // the transition we were waiting for AND the bars-up height it is measured against.
      sawBarsUp = false;
      resetChromeBaseline();
      sync();
    };

    sync();
    // If the bars are ALREADY down when this page mounts — i.e. the player collapsed them on the
    // previous page and navigated here — lock straight away so they stay down. Otherwise this is
    // just the first reading, and `sawBarsUp` is what decides whether it can conclude anything.
    if (isCollapsed()) lock();
    else onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.visualViewport?.addEventListener("resize", evaluate);
    window.visualViewport?.addEventListener("scroll", evaluate);
    window.addEventListener("focus", evaluate);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", onRotate);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      if (settle) clearTimeout(settle);
      window.removeEventListener("scroll", onScroll);
      window.visualViewport?.removeEventListener("resize", evaluate);
      window.visualViewport?.removeEventListener("scroll", evaluate);
      window.removeEventListener("focus", evaluate);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", onRotate);
      document.removeEventListener("visibilitychange", onReturn);
      // Deliberately NOT clearing the gap or the lock here. Both full-bleed pages want them, and
      // removing the gap on unmount shrank the document mid-navigation — which clamped scrollY to 0
      // and handed Safari its bars back the instant you tapped Play. The next page re-applies what
      // it needs on mount; a page that does not want them never mounts this at all.
    };
  }, []);

  return null;
}
