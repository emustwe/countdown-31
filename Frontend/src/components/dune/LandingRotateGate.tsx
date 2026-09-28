"use client";

import { RotateCcw } from "lucide-react";

/**
 * "Turn your phone" gate for the LANDING page.
 *
 * The landing page is designed for landscape. In portrait it is rendered rotated (see the
 * forced-landscape rule in dune.css), which reads sideways until the phone is actually turned — so
 * this covers it completely until the device is in landscape.
 *
 * Visibility is pure CSS (`@media (orientation: portrait) and (pointer: coarse)`), exactly like the
 * arena's `.rotate-to-play`. No JS, no hydration flash, and it disappears the instant the phone is
 * turned without waiting on a listener.
 *
 * DELIBERATE: there is no dismiss. A visitor with iOS Rotation Lock on will stay on this screen until
 * they unlock rotation — that is the intent, confirmed by the product owner: the landscape layout is
 * the only one worth showing, so the gate asks them to unlock rather than degrading to a worse view.
 */
export function LandingRotateGate() {
  return (
    <div className="landing-rotate" role="dialog" aria-modal="true" aria-label="Rotate your phone to continue">
      <span className="rtp-phone" aria-hidden="true">
        <RotateCcw size={44} />
      </span>
      <h2 className="rtp-title">Turn your phone sideways</h2>
      <p className="rtp-sub">
        Vera 31 is built for landscape. Rotate your device to start playing.
      </p>
      <p className="landing-rotate-note">
        Nothing happening? Turn off <b>Portrait Orientation Lock</b> in Control Centre, then rotate.
      </p>
    </div>
  );
}
