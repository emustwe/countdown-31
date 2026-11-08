"use client";

import React from "react";
import { Users } from "lucide-react";
import { countryFlag, countryName } from "../../lib/countries";
import { MasterAvatar } from "./MasterAvatar";
import type { AvatarConfig } from "../../stores/avatar-customization-store";
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

  const listRef = React.useRef<HTMLDivElement | null>(null);
  const dragY = React.useRef<number | null>(null);
  const onDragStart = (e: React.TouchEvent) => {
    dragY.current = e.touches[0]?.clientY ?? null;
  };
  const onDragMove = (e: React.TouchEvent) => {
    const el = listRef.current;
    const y = e.touches[0]?.clientY;
    if (!el || y == null || dragY.current == null) return;
    el.scrollTop += dragY.current - y;
    dragY.current = y;
  };
  const onDragEnd = () => {
    dragY.current = null;
  };

  /** True seat numbers, so a row shows a player's real position, not its index in this order. */
  const seatOf = new Map(players.map((p, i) => [p.id, i + 1] as const));

  /**
   * v2 ORDER: the active player first, then whoever is up after them, wrapping round the table;
   * knocked-out players last.
   *
   * Turn order rather than seat order, because mid-game the question is "who is going, and who is
   * coming" — a seat list answers neither once the turn has moved past row one.
   *
   * EVERYONE IS RENDERED. This used to be a window of four with a "+N more in the ring" line under
   * it, which meant the fifth player existed only as a number — and the line itself was the first
   * thing clipped when the list ran out of room. The list scrolls instead, so the whole ring is
   * reachable and nothing is hidden behind a count.
   */
  const rows = (() => {
    if (!v2) return players;
    const pool = players.filter((p) => !p.eliminated);
    const out = players.filter((p) => p.eliminated);
    if (!pool.length) return players;
    const start = Math.max(0, pool.findIndex((p) => p.id === currentId));
    return [...Array.from({ length: pool.length }, (_, k) => pool[(start + k) % pool.length]!), ...out];
  })();
  const W = plainText
    ? { hdr: 400, cnt: 400, seat: 400, ava: 500, name: 400, you: 500, role: 400 }
    : { hdr: 900, cnt: 800, seat: 800, ava: 900, name: 800, you: 900, role: 600 };
  return (
    <div
      className="cab-panel"
      style={{
        padding: v2 ? "18px 20px 16px" : "16px 15px 14px",
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: v2 ? 14 : 12, flex: "none" }}>
        <span style={{ display: "flex", alignItems: "center", gap: v2 ? 10 : 7, fontSize: v2 ? 18 : 12, letterSpacing: ".22em", textTransform: "uppercase", fontWeight: W.hdr, color: "#c8b790" }}>
          <Users size={v2 ? 19 : 13} style={{ color: C.gold }} /> Arena
        </span>
        <span style={{ fontSize: v2 ? 16 : 11, letterSpacing: ".08em", fontWeight: W.cnt, textTransform: "uppercase", color: C.goldSoft }}>
          {alive} <span style={{ color: C.mute }}>/ {players.length} alive</span>
        </span>
      </div>

      {/* Player rows */}
      <div
        className="cab-roster-list"
        ref={listRef}
        {...(v2 ? { onTouchStart: onDragStart, onTouchMove: onDragMove, onTouchEnd: onDragEnd, onTouchCancel: onDragEnd } : {})}
        style={{ display: "flex", flexDirection: "column", gap: v2 ? 12 : 8, overflowY: "auto", flex: 1, minHeight: 0, paddingRight: v2 ? 7 : 4, paddingLeft: v2 ? 0 : 28, touchAction: v2 ? "pan-y" : undefined, overscrollBehavior: "contain" }}
      >
        {rows.map((pl, i) => {
          const isCur = pl.id === currentId && !pl.eliminated;
          const isMe = pl.id === myId;
          /** v2's top row replaces the floating detail card, so it is taller and carries its content. */
          const hero = v2 && i === 0;
          /** v2 portraits are big rectangles, not small discs — the row is mostly picture. */
          const avaSize = hero ? 118 : v2 ? 84 : 38;
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
                gap: v2 ? 16 : 11,
                padding: hero ? "16px 18px" : v2 ? "12px 16px" : "9px 11px",
                borderRadius: v2 ? 20 : 16,
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
              {showArrow && !v2 && (
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
              <span style={{ minWidth: v2 ? 32 : 21, height: v2 ? 32 : 21, display: "grid", placeItems: "center", borderRadius: v2 ? 11 : 7, fontFamily: "ui-monospace,Menlo,monospace", fontWeight: W.seat, fontSize: v2 ? 17 : 11, flex: "none", color: isCur ? "#1b1206" : C.goldSoft, background: isCur ? C.gold : "rgba(8,7,5,.75)", border: `1px solid ${isCur ? C.goldSoft : "rgba(245,165,36,.28)"}` }}>
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
                    borderRadius: hero ? 18 : 14,
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
                  <span style={{ alignSelf: "flex-start", marginBottom: 6, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", padding: "3px 9px", borderRadius: 999, color: isMe ? C.cyan : C.goldSoft, border: `1px solid ${isMe ? C.cyan : C.gold}55`, background: `${isMe ? C.cyan : C.gold}14` }}>
                    {isMe ? "⚡ Your turn" : "⚡ Active turn"}
                  </span>
                )}
                <span style={{ fontSize: hero ? 40 : v2 ? 24 : 14,
                  // BOLD on the active row whatever the board's text weight is: `plainText` drops the
                  // roster to regular so a long list is not a wall, but the row whose turn it is
                  // has to win that trade.
                  fontWeight: hero ? 900 : W.name, color: pl.eliminated ? C.mute : "#fff", textDecoration: pl.eliminated ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                {/* NAME ONLY in v2. The cow title, the "Choosing…" line and the CPU label are all
                    gone from the row by request — the badge above already says whose turn it is,
                    and dropping the rest is what lets the name be this size. The default arena
                    keeps its subtitle exactly as it was. */}
                {!v2 && (
                  <span style={{ fontSize: 11, fontWeight: W.role, color: isCur ? C.goldSoft : C.mute, fontStyle: isCur && !isMe ? "italic" : "normal", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {role}
                  </span>
                )}
              </span>
              {/* Status dot */}
              <span style={{ width: v2 ? 13 : 9, height: v2 ? 13 : 9, borderRadius: 999, flex: "none", background: dot, boxShadow: pl.eliminated ? "none" : `0 0 7px ${dot}aa` }} />
            </div>
          );
        })}
      </div>

    </div>
  );
}
