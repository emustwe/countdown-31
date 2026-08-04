"use client";

import type { CardCosmetics } from "../../lib/hooks/useSponsors";
import { Avatar, type AvatarCosmetics, type ClothCosmetics, type ShoesCosmetics } from "./Avatar";

// A player's collectible card — a full-body avatar figure styled by their shop cosmetics, with their
// name. Used in the Shop (live preview), in Settings → Card, and it's the public face other players
// see. The card frame (colour / pattern / shape / border) comes from `card`; the figure standing on
// it comes from the avatar / cloth / shoes cosmetics.
export const CARD_COLORS = ["#f4b942", "#5aa8ff", "#c87bff", "#5adc8c", "#ff6b7f", "#26c6da", "#9b6bff", "#e0e0e0"];
export const CARD_PATTERNS = ["none", "stars", "waves", "circuit"] as const;
export const CARD_SHAPES = ["rounded", "sharp", "pill"] as const;
export const CARD_BORDERS = ["none", "gold", "neon"] as const;

export const DEFAULT_CARD: Required<CardCosmetics> = { color: "#5aa8ff", pattern: "stars", shape: "rounded", border: "gold" };

export function CardPreview({
  card,
  avatar,
  cloth,
  shoes,
  name,
  size = "md",
}: {
  card?: CardCosmetics;
  avatar?: AvatarCosmetics;
  cloth?: ClothCosmetics;
  shoes?: ShoesCosmetics;
  name: string;
  size?: "md" | "lg";
}) {
  const c = { ...DEFAULT_CARD, ...(card ?? {}) };
  const radius = c.shape === "sharp" ? "8px" : c.shape === "pill" ? "38px" : "20px";
  return (
    <div
      className={`player-card pc-${size} pc-pattern-${c.pattern} pc-border-${c.border}`}
      style={{ ["--pc-color" as string]: c.color, borderRadius: radius }}
    >
      <div className="pc-pattern-layer" aria-hidden="true" />
      <div className="pc-glow" aria-hidden="true" />
      <div className="pc-inner">
        <div className="pc-stage">
          <Avatar className="pc-figure" av={avatar} cloth={cloth} shoes={shoes} />
        </div>
        <div className="pc-plate">
          <div className="pc-name">{name}</div>
          <div className="pc-tag">WM TOURNAMENTS</div>
        </div>
      </div>
    </div>
  );
}
