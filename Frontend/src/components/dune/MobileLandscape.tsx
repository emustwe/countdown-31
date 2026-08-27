"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import { FlipText } from "./FlipText";

/**
 * Puts the game in landscape on phones. On devices that allow it (Android Chrome), it locks the
 * screen orientation to landscape automatically. Where the browser can't rotate on its own
 * (iOS Safari has no orientation-lock API), it shows a full-screen prompt asking the player to
 * turn the phone — this is far more reliable than CSS-rotating the whole game, which misplaced
 * the timer/leaderboard overlays and clipped the screen. Once the phone is landscape the prompt
 * disappears and the game renders normally. Renders nothing on desktop / already-landscape.
 */
export function MobileLandscape() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isMobileViewport = window.matchMedia("(max-width: 1180px)").matches;
    if (!isMobileViewport) return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;

    // Best-effort native lock (Android). Harmless where unsupported — it just rejects.
    const orientation = (
      window.screen as Screen & {
        orientation?: { lock?: (o: string) => Promise<void>; unlock?: () => void };
      }
    ).orientation;
    if (isTouch) orientation?.lock?.("landscape").catch(() => {});

    const portraitMq = window.matchMedia("(orientation: portrait)");
    const update = () => setShowPrompt(portraitMq.matches);
    update();
    portraitMq.addEventListener("change", update);
    return () => {
      portraitMq.removeEventListener("change", update);
      orientation?.unlock?.();
    };
  }, []);

  if (!showPrompt) return null;
  return (
    <div className="rotate-overlay" role="dialog" aria-label="Rotate your device">
      <RotateCw className="rotate-icon" size={56} strokeWidth={1.6} />
      <h2>
        <FlipText intervalMs={4000} items={[<>Rotate your device</>, <>기기를 회전하세요</>]} />
      </h2>
      <p>
        <FlipText
          intervalMs={4200}
          items={[
            <>Turn your phone sideways to play in landscape.</>,
            <>가로 모드로 플레이하려면 휴대폰을 옆으로 돌리세요.</>,
          ]}
        />
      </p>
    </div>
  );
}
