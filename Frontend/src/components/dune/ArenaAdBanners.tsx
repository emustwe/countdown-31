"use client";

import React from "react";
import type { ThemeAds } from "../../lib/game-config";

/**
 * Extra sponsor ad slots along the top of the arena: the marquee (logo / brand name) occupies ONE of
 * left / centre / right, and these fill the two slots it isn't using — a centre banner and a banner
 * on the side opposite the marquee. Purely decorative and `pointer-events: none`, so they can never
 * block gameplay. Sized in `em` off a `--ad-scale` font-size so the same markup works on the desktop
 * arena and the letterboxed mobile-landscape arena.
 */
export function ArenaAdBanners({ ads, compact = false }: { ads: ThemeAds | null; compact?: boolean }) {
  if (!ads) return null;
  const { placement, bannerCenterImage, bannerOppositeImage } = ads;
  // The side opposite the marquee: marquee left → banner right, and vice-versa. With the marquee
  // centred, the "opposite" banner goes right (the centre slot is taken).
  const oppositeSide = placement === "topRight" ? "left" : "right";
  const showCenter = !!bannerCenterImage && placement !== "topCenter";
  const showOpposite = !!bannerOppositeImage;
  if (!showCenter && !showOpposite) return null;

  const box: React.CSSProperties = {
    position: "absolute",
    top: compact ? "0.4em" : "0.75em",
    zIndex: 18,
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.25em 0.5em",
    borderRadius: "0.9em",
    background: "rgba(4,9,6,.62)",
    border: "1px solid rgba(255,255,255,.12)",
    backdropFilter: "blur(3px)",
    maxHeight: compact ? "2.6em" : "3.4em",
    overflow: "hidden",
  };
  const img: React.CSSProperties = { maxHeight: compact ? "2em" : "2.7em", maxWidth: compact ? "9em" : "13em", objectFit: "contain", display: "block" };

  return (
    <>
      {showCenter && (
        <div style={{ ...box, left: "50%", transform: "translateX(-50%)" }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerCenterImage} alt="" style={img} />
        </div>
      )}
      {showOpposite && (
        <div style={{ ...box, [oppositeSide]: compact ? "0.5em" : "0.9em" }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bannerOppositeImage} alt="" style={img} />
        </div>
      )}
    </>
  );
}
