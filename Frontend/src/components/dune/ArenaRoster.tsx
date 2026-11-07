"use client";

import React from "react";
import { Users } from "lucide-react";
import { countryFlag, countryName } from "../../lib/countries";
import { MasterAvatar } from "./MasterAvatar";
import type { AvatarConfig } from "../../stores/avatar-customization-store";
import type { LivePlayer } from "../../lib/hooks/useCountdownLive";

/** v2 only: how many players the list shows at once — the active one plus the next few up. */
const V2_ROWS = 4;

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
  plainText = false,
  v2 = false,
  avatarFor,
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
  /** Normal-weight type instead of the heavy default. A hundred bold rows is a wall; regular weight
   *  with a colour shift for the active row carries the same hierarchy and stays legible at arena
   *  scale. Opt-in so the legacy board keeps exactly the look it always had. */
  plainText?: boolean;
  /** v2 arena (preview flag `?arena=v2`): the floating detail card is gone and its content lives in
   *  this list's top row; the list shows only the next few players and draws real avatar faces. */
  v2?: boolean;
  /** Supplied by the board, which already builds these for the curved rail. Passing it in rather
   *  than importing the builder keeps the roster free of a circular import back into the board. */
  avatarFor?: (p: LivePlayer) => AvatarConfig;
}) {
  const alive = players.filter((p) => !p.eliminated).length;

  /** True seat numbers, so a windowed list still shows a player's real position, not its row index. */
  const seatOf = new Map(players.map((p, i) => [p.id, i + 1] as const));

  /**
   * v2 WINDOW: the active player, then whoever is up after them, wrapping round the table.
   *
   * Turn order rather than seat order, because mid-game the question a player is asking is "who is
   * going, and who is coming" — a fixed seat list answers neither once the turn has moved past row
   * one. Eliminated players are dropped: they take no turns, so they cannot be "next".
   */
  const rows = (() => {
    if (!v2) return players;
    const pool = players.filter((p) => !p.eliminated);
    if (!pool.length) return players.slice(0, V2_ROWS);
    const start = Math.max(0, pool.findIndex((p) => p.id === currentId));
    return Array.from({ length: Math.min(V2_ROWS, pool.length) }, (_, k) => pool[(start + k) % pool.length]!);
  })();
  const hidden = v2 ? Math.max(0, alive - rows.length) : 0;
  const W = plainText
    ? { hdr: 400, cnt: 400, seat: 400, ava: 500, name: 400, you: 500, role: 400 }
    : { hdr: 900, cnt: 800, seat: 800, ava: 900, name: 800, you: 900, role: 600 };
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
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: W.hdr, color: "#c8b790" }}>
          <Users size={13} style={{ color: C.gold }} /> Arena
        </span>
        <span style={{ fontSize: 11, letterSpacing: ".08em", fontWeight: W.cnt, textTransform: "uppercase", color: C.goldSoft }}>
          {alive} <span style={{ color: C.mute }}>/ {players.length} alive</span>
        </span>
      </div>

      {/* Player rows */}
      <div className="cab-roster-list" style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", flex: 1, minHeight: 0, paddingRight: 4, paddingLeft: 28 }}>
        {rows.map((pl, i) => {
          const isCur = pl.id === currentId && !pl.eliminated;
          const isMe = pl.id === myId;
          /** v2's top row replaces the floating detail card, so it is taller and carries its content. */
          const hero = v2 && i === 0;
          const avaSize = hero ? 62 : v2 ? 46 : 38;
          // Turn pointer: an arrow that sits in the left gutter of whoever's turn it is (so it "moves"
          // to the active player as turns pass). Cyan = YOU, gold = another player (the cyan=YOU rule).
          const showArrow = isCur && status === "playing";
          const arrowColor = isMe ? C.cyan : C.gold;
          const arrowTip = isMe ? "#B7F5FF" : C.goldSoft;
          const seat = seatOf.get(pl.id) ?? i + 1;
          const role = pl.eliminated ? "Knocked out" : isCur && status === "playing" && !isMe ? "Choosing…" : ((pl.card?.title as string) || "Countdown Cow");
          const dot = pl.eliminated ? "#4b5563" : isCur ? C.gold : "#34d399";
          return (
            <div
              key={pl.id}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: v2 ? 13 : 11,
                padding: hero ? "13px 14px" : v2 ? "10px 13px" : "9px 11px",
                borderRadius: 16,
                background: isCur
                  ? "linear-gradient(100deg, rgba(245,165,36,.22), rgba(245,165,36,.05))"
                  : "rgba(255,255,255,.035)",
                border: `${hero ? 2 : 1.5}px solid ${isCur ? "rgba(245,165,36,.7)" : "rgba(255,255,255,.06)"}`,
                boxShadow: isCur ? (hero ? "0 0 28px rgba(245,165,36,.3)" : "0 0 20px rgba(245,165,36,.22)") : "none",
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
              <span style={{ minWidth: 21, height: 21, display: "grid", placeItems: "center", borderRadius: 7, fontFamily: "ui-monospace,Menlo,monospace", fontWeight: W.seat, fontSize: 11, flex: "none", color: isCur ? "#1b1206" : C.goldSoft, background: isCur ? C.gold : "rgba(8,7,5,.75)", border: `1px solid ${isCur ? C.goldSoft : "rgba(245,165,36,.28)"}` }}>
                {seat}
              </span>
              {/* The player's FACE, not their initials — v2 only.
                  The same config the curved rail builds, handed in by the board, so the face here
                  and the face on the rail are the same cow by construction rather than by two
                  lists agreeing. Falls back to the initials disc if no builder was passed (the
                  admin Game Studio preview renders the roster on its own). */}
              {v2 && avatarFor ? (
                <span
                  style={{
                    width: avaSize,
                    height: avaSize,
                    borderRadius: hero ? 16 : 13,
                    overflow: "hidden",
                    flex: "none",
                    background: "rgba(8,7,5,.6)",
                    border: `2px solid ${isCur ? "rgba(245,165,36,.85)" : "rgba(255,255,255,.22)"}`,
                    boxShadow: isCur ? `0 4px 14px rgba(245,165,36,.35)` : "0 3px 10px rgba(0,0,0,.45)",
                    filter: pl.eliminated ? "grayscale(.75)" : "none",
                  }}
                >
                  <MasterAvatar config={avatarFor(pl)} className="w-full h-full" />
                </span>
              ) : (
                <span style={{ width: avaSize, height: avaSize, borderRadius: 999, display: "grid", placeItems: "center", flex: "none", background: `linear-gradient(160deg, ${pl.color}, ${pl.color}cc)`, border: "2px solid rgba(255,255,255,.82)", boxShadow: `0 3px 10px ${pl.color}55`, color: "#0b0906", fontWeight: W.ava, fontSize: 13, letterSpacing: ".01em", filter: pl.eliminated ? "grayscale(.6)" : "none" }}>
                  {cowInitials(pl.name)}
                </span>
              )}
              {/* Name + role */}
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
                {/* v2's top row leads with the badge the floating card used to carry. */}
                {hero && isCur && status === "playing" && (
                  <span style={{ alignSelf: "flex-start", marginBottom: 3, fontSize: 9.5, fontWeight: 800, letterSpacing: ".18em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 999, color: isMe ? C.cyan : C.goldSoft, border: `1px solid ${isMe ? C.cyan : C.gold}55`, background: `${isMe ? C.cyan : C.gold}14` }}>
                    {isMe ? "⚡ Your turn" : "⚡ Active turn"}
                  </span>
                )}
                <span style={{ fontSize: hero ? 19 : v2 ? 15 : 14, fontWeight: W.name, color: pl.eliminated ? C.mute : "#fff", textDecoration: pl.eliminated ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {/* Country flag, ahead of the name. Absent for CPU cows and for players who joined
                      before the country picker existed — the row simply has no flag then. */}
                  {countryFlag(pl.country) && (
                    <span className="player-flag" title={countryName(pl.country)} style={{ marginRight: 5, fontSize: 13 }}>
                      {countryFlag(pl.country)}
                    </span>
                  )}
                  {pl.name}
                  {isMe && <span style={{ color: C.cyan, fontWeight: W.you }}> · you</span>}
                </span>
                <span style={{ fontSize: hero ? 12.5 : 11, fontWeight: W.role, color: isCur ? C.goldSoft : C.mute, fontStyle: isCur && !isMe ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hero ? `✦ ${role}` : role}
                </span>
                {/* The card also said whether this was a CPU cow. Kept, on the top row only. */}
                {hero && pl.cpu && (
                  <span style={{ fontSize: 10, fontWeight: W.role, color: C.mute, letterSpacing: ".04em" }}>CPU cow</span>
                )}
              </span>
              {/* Status dot */}
              <span style={{ width: 9, height: 9, borderRadius: 999, flex: "none", background: dot, boxShadow: pl.eliminated ? "none" : `0 0 7px ${dot}aa` }} />
            </div>
          );
        })}

        {/* The list is a WINDOW in v2, so say how many players it is not showing. Without this the
            arena silently looks like a 4-player game once the table is bigger than the window. */}
        {hidden > 0 && (
          <div style={{ flex: "none", textAlign: "center", padding: "4px 0 2px", fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", fontWeight: W.role, color: C.mute }}>
            + {hidden} more in the ring
          </div>
        )}
      </div>

    </div>
  );
}
