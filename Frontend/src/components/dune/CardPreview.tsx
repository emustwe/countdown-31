"use client";

import type { CardCosmetics } from "../../lib/hooks/useSponsors";

// A player's collectible card — username + avatar, styled by their shop cosmetics. Used in the Shop
// (live preview) and in Settings → Card. Other players see this card too, so it's the public face
// of a user's customisation.
export const CARD_COLORS = ["#f4b942", "#5aa8ff", "#c87bff", "#5adc8c", "#ff6b7f", "#26c6da", "#9b6bff", "#e0e0e0"];
export const CARD_PATTERNS = ["none", "stars", "waves", "circuit"] as const;
export const CARD_SHAPES = ["rounded", "sharp", "pill"] as const;
export const CARD_BORDERS = ["none", "gold", "neon"] as const;

export const DEFAULT_CARD: Required<CardCosmetics> = { color: "#f4b942", pattern: "stars", shape: "rounded", border: "gold" };

function initials(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
}

export function CardPreview({ card, name, size = "md" }: { card?: CardCosmetics; name: string; size?: "md" | "lg" }) {
  const c = { ...DEFAULT_CARD, ...(card ?? {}) };
  const radius = c.shape === "sharp" ? "6px" : c.shape === "pill" ? "34px" : "18px";
  return (
    <div
      className={`player-card pc-${size} pc-pattern-${c.pattern} pc-border-${c.border}`}
      style={{ ["--pc-color" as string]: c.color, borderRadius: radius }}
    >
      <div className="pc-pattern-layer" aria-hidden="true" />
      <div className="pc-inner">
        <div className="pc-avatar" style={{ borderRadius: c.shape === "sharp" ? "8px" : "50%" }}>{initials(name)}</div>
        <div className="pc-name">{name}</div>
        <div className="pc-tag">WM TOURNAMENTS</div>
      </div>
    </div>
  );
}
