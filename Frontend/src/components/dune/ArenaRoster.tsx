"use client";

import React from "react";
import { Users } from "lucide-react";
import type { LivePlayer } from "../../lib/hooks/useCountdownLive";

const C = { gold: "#F5A524", goldSoft: "#FFD98A", cyan: "#2ED3E9", mute: "#8A8071" };

/* Two-letter initials for the roster avatar (strips emoji/symbols): "Daisy Cow 🌸" → "DC". */
function cowInitials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0];
  if (!a) return "?";
  const b = parts[1];
  if (!b) return a.slice(0, 2).toUpperCase();
  return ((a[0] ?? "") + (b[0] ?? "")).toUpperCase();
}

/**
 * The ARENA player list — a tall card column (seat · colour avatar · name + role · status dot). It is
 * rendered by the arena as a VIEWPORT-anchored overlay pinned to the far-right edge, scaled by the
 * board's own scale factor so it hugs the screen edge yet never overlaps the board on any size.
 * Uses the global `.cab-panel` / `.cab-roster-list` styles injected by ClassicArcBoard.
 */
export function ArenaRoster({
  players,
  currentId,
  myId,
  status,
  style,
  sponsor,
  rosterStyle = "default",
}: {
  players: LivePlayer[];
  currentId: string | null;
  myId: string | null;
  status: "waiting" | "playing" | "over";
  style?: React.CSSProperties;
  /** AD SURFACE (optional) — a sponsor banner docked at the foot of the arena list. `bannerImage`
   *  lets the sponsor supply custom artwork instead of the logo/name.
   *  Omitted → the roster renders exactly as before. */
  sponsor?: { logoUrl?: string; name?: string; color?: string; bannerImage?: string } | null;
  /** Look of the arena-list panel (sponsor-selectable). Omitted → the default cabinet panel. */
  rosterStyle?: "default" | "glass" | "solid" | "brand";
}) {
  const alive = players.filter((p) => !p.eliminated).length;
  return (
    <div
      className="cab-panel"
      style={{
        padding: "16px 15px 14px",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
        // Sponsor-selectable panel look. "default" leaves the cabinet styling untouched.
        ...(rosterStyle === "glass"
          ? { background: "rgba(255,255,255,.06)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.14)" }
          : rosterStyle === "solid"
            ? { background: "#080d0a", border: "1px solid rgba(255,255,255,.10)" }
            : rosterStyle === "brand"
              ? {
                  background: `linear-gradient(180deg, ${(sponsor?.color ?? C.gold)}1f, rgba(6,11,8,.96))`,
                  border: `1px solid ${(sponsor?.color ?? C.gold)}55`,
                }
              : {}),
        ...style,
      }}
    >
      {/* Header: ARENA · N/M ALIVE */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flex: "none" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: 900, color: "#c8b790" }}>
          <Users size={13} style={{ color: C.gold }} /> Arena
        </span>
        <span style={{ fontSize: 11, letterSpacing: ".08em", fontWeight: 800, textTransform: "uppercase", color: C.goldSoft }}>
          {alive} <span style={{ color: C.mute }}>/ {players.length} alive</span>
        </span>
      </div>

      {/* Player rows */}
      <div className="cab-roster-list" style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, minHeight: 0, paddingRight: 4, paddingLeft: 28 }}>
        {players.map((pl, i) => {
          const isCur = pl.id === currentId && !pl.eliminated;
          const isMe = pl.id === myId;
          // Turn pointer: an arrow that sits in the left gutter of whoever's turn it is (so it "moves"
          // to the active player as turns pass). Cyan = YOU, gold = another player (the cyan=YOU rule).
          const showArrow = isCur && status === "playing";
          const arrowColor = isMe ? C.cyan : C.gold;
          const arrowTip = isMe ? "#B7F5FF" : C.goldSoft;
          const seat = i + 1;
          const role = pl.eliminated ? "Knocked out" : isCur && status === "playing" && !isMe ? "Choosing…" : ((pl.card?.title as string) || "Countdown Cow");
          const dot = pl.eliminated ? "#4b5563" : isCur ? C.gold : "#34d399";
          return (
            <div
              key={pl.id}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 11px",
                borderRadius: 16,
                background: isCur
                  ? "linear-gradient(100deg, rgba(245,165,36,.22), rgba(245,165,36,.05))"
                  : "rgba(255,255,255,.035)",
                border: `1.5px solid ${isCur ? "rgba(245,165,36,.7)" : "rgba(255,255,255,.06)"}`,
                boxShadow: isCur ? "0 0 20px rgba(245,165,36,.22)" : "none",
                opacity: pl.eliminated ? 0.5 : 1,
                flex: "none",
              }}
            >
              {/* Turn pointer — a bold gradient arrowhead in the left gutter of the active player's row
                  (cyan=you, gold=other), gently nudging toward the row. */}
              {showArrow && (
                <span aria-hidden style={{ position: "absolute", left: -24, top: 0, bottom: 0, display: "flex", alignItems: "center", pointerEvents: "none" }}>
                  <svg
                    width="22"
                    height="30"
                    viewBox="0 0 22 30"
                    style={{ filter: `drop-shadow(0 0 7px ${arrowColor}) drop-shadow(0 2px 3px rgba(0,0,0,.5))`, animation: "cab-turn-arrow 1.05s ease-in-out infinite", overflow: "visible" }}
                  >
                    <defs>
                      <linearGradient id={`ta-${pl.id}`} x1="0" y1="0" x2="1" y2="0.35">
                        <stop offset="0" stopColor={arrowColor} />
                        <stop offset="1" stopColor={arrowTip} />
                      </linearGradient>
                    </defs>
                    <path
                      d="M3 4.2 Q3 2 5 3.1 L18.6 13.3 Q20.4 15 18.6 16.7 L5 26.9 Q3 28 3 25.8 Z"
                      fill={`url(#ta-${pl.id})`}
                      stroke="rgba(0,0,0,.35)"
                      strokeWidth="1"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              )}
              {/* Seat number */}
              <span style={{ minWidth: 21, height: 21, display: "grid", placeItems: "center", borderRadius: 7, fontFamily: "ui-monospace,Menlo,monospace", fontWeight: 800, fontSize: 11, flex: "none", color: isCur ? "#1b1206" : C.goldSoft, background: isCur ? C.gold : "rgba(8,7,5,.75)", border: `1px solid ${isCur ? C.goldSoft : "rgba(245,165,36,.28)"}` }}>
                {seat}
              </span>
              {/* Colour avatar with initials */}
              <span style={{ width: 38, height: 38, borderRadius: 999, display: "grid", placeItems: "center", flex: "none", background: `linear-gradient(160deg, ${pl.color}, ${pl.color}cc)`, border: "2px solid rgba(255,255,255,.82)", boxShadow: `0 3px 10px ${pl.color}55`, color: "#0b0906", fontWeight: 900, fontSize: 13, letterSpacing: ".01em", filter: pl.eliminated ? "grayscale(.6)" : "none" }}>
                {cowInitials(pl.name)}
              </span>
              {/* Name + role */}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: pl.eliminated ? C.mute : "#fff", textDecoration: pl.eliminated ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pl.name}
                  {isMe && <span style={{ color: C.cyan, fontWeight: 900 }}> · you</span>}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: isCur ? C.goldSoft : C.mute, fontStyle: isCur && !isMe ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {role}
                </span>
              </span>
              {/* Status dot */}
              <span style={{ width: 9, height: 9, borderRadius: 999, flex: "none", background: dot, boxShadow: pl.eliminated ? "none" : `0 0 7px ${dot}aa` }} />
            </div>
          );
        })}
      </div>

    </div>
  );
}
