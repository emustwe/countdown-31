"use client";

import { ChevronRight } from "lucide-react";
import { requestFullscreen } from "../../lib/fullscreen";
import { WholeImageBackdrop } from "./WholeImageBackdrop";

/**
 * The first screen a visitor meets: one button.
 *
 * PORTRAIT-NATIVE, on purpose. Everything after this — the landing page and the whole game — is
 * landscape and gated behind a "turn your phone" screen, but meeting that wall before you have even
 * seen the product is a poor first impression. So this screen is comfortable the way a phone is
 * normally held, and the rotate prompt only starts once the player is through it.
 *
 * It also earns its keep technically: a browser grants fullscreen ONLY in response to a real tap, so
 * this tap is the one chance to put Android into true fullscreen. That is why the screen shows every
 * visit rather than being remembered — a returning player who skipped it would silently get a worse
 * screen than a first-timer, with nothing to explain why. On iPhone the call is a no-op (Apple does
 * not implement the Fullscreen API for page content), and the arena's swipe-up handles it there.
 */
export function EntryGate({ onNext }: { onNext: () => void }) {
  return (
    <div className="entry-gate">
      {/* The pasture, WHOLE. This screen is portrait-native, which is the worst case for a 16:9
          photograph — see WholeImageBackdrop.

          The tint is the one .entry-gate used to carry in its own `background` shorthand, at roughly
          half the alpha. It was .78 → .96 because it had to hold legible text over a bright, sharp,
          screen-filling crop; the backdrop now dims its own surround, so keeping those values simply
          crushed the picture to near-black. The text still has a dark ground under it. */}
      <WholeImageBackdrop
        src="/assets/barnaby/barnaby-field.jpg"
        tint="linear-gradient(180deg, rgba(8, 18, 12, 0.4) 0%, rgba(10, 24, 16, 0.5) 45%, rgba(6, 12, 8, 0.72) 100%)"
      />
      <div className="entry-gate-mark" aria-hidden="true">
        31
      </div>
      <h1 className="entry-gate-title">Vera 31</h1>
      <p className="entry-gate-sub">Count together. Don&apos;t land on 31!</p>

      <button
        type="button"
        className="entry-gate-next"
        onClick={() => {
          // Synchronous, inside the gesture — see lib/fullscreen.ts.
          requestFullscreen(document.documentElement);
          onNext();
        }}
      >
        Next
        <ChevronRight size={22} />
      </button>
    </div>
  );
}
