"use client";

import { usePathname } from "next/navigation";
import { RotateCcw } from "lucide-react";

/** Landscape belongs to these; everything else is a portrait page. */
const LANDSCAPE = ["/lobby", "/home"];

/**
 * "Turn your phone upright" — the mirror of the lobby's rotate gate.
 *
 * iOS Safari has NO orientation lock API, so a page cannot rotate the phone or refuse landscape.
 * This is therefore a prompt, not a lock: a full-screen overlay shown by CSS while the device is in
 * landscape, covering the page until it is turned.
 *
 * DELIBERATE, matching the lobby gate: no dismiss. With iOS Rotation Lock on, orientation never
 * changes and this screen stays — so the copy names the Control Centre toggle, because this gate
 * also covers login and signup where a stranded visitor costs an account.
 */
export function PortraitGate() {
  const pathname = usePathname() ?? "/";
  if (pathname.startsWith("/admin") || pathname.startsWith("/events")) return null;
  if (LANDSCAPE.includes(pathname)) return null;

  return (
    <div className="portrait-gate" role="dialog" aria-modal="true" aria-label="Turn your phone upright">
      <span className="rtp-phone" aria-hidden="true">
        <RotateCcw size={44} />
      </span>
      <h2 className="rtp-title">Turn your phone upright</h2>
      <p className="rtp-sub">This page is designed for portrait. Rotate your device to continue.</p>
      <p className="landing-rotate-note">
        Nothing happening? Turn off <b>Portrait Orientation Lock</b> in Control Centre, then rotate.
      </p>
    </div>
  );
}
