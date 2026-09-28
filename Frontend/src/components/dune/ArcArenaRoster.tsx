"use client";

import React, { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Users } from "lucide-react";
import { countryFlag, countryName } from "../../lib/countries";
import type { LivePlayer } from "../../lib/hooks/useCountdownLive";

/**
 * ArcArenaRoster — the arena list as a curved, scrolling column.
 *
 * Rows bend along a circle so the column reads as an arc rather than a flat list, echoing the player
 * rail and the number arc. It is built for a real tournament field: rows are absolutely placed and
 * only the handful on screen are ever transformed, so 100+ players cost the same as 10.
 *
 * Whoever is to move scrolls to the middle of the arc — but never while the player is scrolling by
 * hand (a 3s grace), because yanking a list out from under someone's thumb is the fastest way to make
 * a UI feel broken.
 *
 * Type weight here is deliberately NORMAL, not bold. A hundred bold rows is a wall; regular weight
 * with a colour shift for the active row carries the same hierarchy and stays legible at arena scale.
 */

const C = { gold: "#F5A524", goldSoft: "#FFD98A", cyan: "#2ED3E9", mute: "#8A8071" };

const ROW_H = 44;
const GAP = 6;
const PITCH = ROW_H + GAP;
/** Bigger radius = gentler bend. Tuned so the column curves visibly without eating usable width. */
const CURVE_R = 340;
const MAX_BULGE = 34;
/** Rows either side of the viewport centre that get a transform each frame. */
const OVERDRAW = 3;

function cowInitials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N}\s]/gu, "").trim().split(/\s+/).filter(Boolean);
  const a = parts[0];
  if (!a) return "?";
  const b = parts[1];
  if (!b) return a.slice(0, 2).toUpperCase();
  return ((a[0] ?? "") + (b[0] ?? "")).toUpperCase();
}

function ArcArenaRosterImpl({
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
  sponsor?: { logoUrl?: string; name?: string; color?: string; bannerImage?: string } | null;
  rosterStyle?: "default" | "glass" | "solid" | "brand";
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const userScrollAt = useRef(0);
  const rafRef = useRef<number | null>(null);

  const alive = players.filter((p) => !p.eliminated).length;

  /** Bend the rows that are currently on screen. */
  const bend = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    const pad = list.clientHeight / 2 - ROW_H / 2;
    // The spacer divs are sized from the SAME measurement the maths below uses, so the two can never
    // drift apart (a mismatch here shows up as the active row settling off-centre).
    list.style.setProperty("--aar-pad", `${Math.max(0, pad)}px`);
    const mid = list.scrollTop + list.clientHeight / 2;
    const first = Math.max(0, Math.floor((list.scrollTop - pad) / PITCH) - OVERDRAW);
    const last = Math.min(rowRefs.current.length - 1, first + Math.ceil(list.clientHeight / PITCH) + OVERDRAW * 2);
    for (let i = first; i <= last; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const dy = pad + i * PITCH + ROW_H / 2 - mid;
      const off = CURVE_R - Math.sqrt(Math.max(0, CURVE_R * CURVE_R - dy * dy));
      el.style.transform = `translateX(${(MAX_BULGE - Math.min(off, MAX_BULGE)).toFixed(1)}px)`;
    }
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      bend();
    });
  }, [bend]);

  useLayoutEffect(() => {
    bend();
    const list = listRef.current;
    if (!list) return;
    const ro = new ResizeObserver(() => bend());
    ro.observe(list);
    return () => {
      ro.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [bend, players.length]);

  // Scroll whoever is to move into the middle of the arc — unless the player is scrolling by hand.
  useEffect(() => {
    const list = listRef.current;
    if (!list || !currentId) return;
    if (Date.now() - userScrollAt.current < 3000) return;
    const i = players.findIndex((p) => p.id === currentId);
    if (i < 0) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ top: i * PITCH, behavior: reduce ? "auto" : "smooth" });
  }, [currentId, players]);

  const markUserScroll = useCallback(() => {
    userScrollAt.current = Date.now();
  }, []);

  const panelSkin =
    rosterStyle === "glass"
      ? { background: "rgba(255,255,255,.06)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,.14)" }
      : rosterStyle === "solid"
        ? { background: "#080d0a", border: "1px solid rgba(255,255,255,.10)" }
        : rosterStyle === "brand"
          ? {
              background: `linear-gradient(180deg, ${sponsor?.color ?? C.gold}1f, rgba(6,11,8,.96))`,
              border: `1px solid ${sponsor?.color ?? C.gold}55`,
            }
          : {};

  const innerH = Math.max(0, players.length * PITCH - GAP);

  return (
    <div
      className="cab-panel aar-panel"
      style={{ padding: "14px 12px 12px", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden", ...panelSkin, ...style }}
    >
      <div className="aar-head">
        <span className="aar-title">
          <Users size={13} style={{ color: C.gold }} /> Arena
        </span>
        <span className="aar-count">
          {alive} <span style={{ color: C.mute }}>/ {players.length} alive</span>
        </span>
      </div>

      <div
        ref={listRef}
        className="aar-list"
        onScroll={onScroll}
        onWheel={markUserScroll}
        onTouchStart={markUserScroll}
        onPointerDown={markUserScroll}
      >
        {/* Half a viewport of padding top and bottom, so the first and last rows can reach the middle
            of the arc like every other row. */}
        <div className="aar-pad" />
        <div className="aar-inner" style={{ height: innerH }}>
          {players.map((pl, i) => {
            const isCur = pl.id === currentId && !pl.eliminated;
            const isMe = pl.id === myId;
            const showArrow = isCur && status === "playing";
            const arrowColor = isMe ? C.cyan : C.gold;
            const role = pl.eliminated
              ? "Knocked out"
              : isCur && status === "playing" && !isMe
                ? "Choosing…"
                : (pl.card?.title as string) || "Countdown Cow";
            const dot = pl.eliminated ? "#4b5563" : isCur ? C.gold : "#34d399";
            return (
              <div
                key={pl.id}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                className={`aar-row${isCur ? " is-cur" : ""}${pl.eliminated ? " is-out" : ""}`}
                style={{ top: i * PITCH }}
              >
                {showArrow && (
                  <span aria-hidden className="aar-arrow" style={{ color: arrowColor }}>
                    <svg width="15" height="20" viewBox="0 0 22 30" style={{ filter: `drop-shadow(0 0 6px ${arrowColor})`, overflow: "visible" }}>
                      <path d="M3 4.2 Q3 2 5 3.1 L18.6 13.3 Q20.4 15 18.6 16.7 L5 26.9 Q3 28 3 25.8 Z" fill="currentColor" />
                    </svg>
                  </span>
                )}
                <span className="aar-seat">{i + 1}</span>
                <span
                  className="aar-ava"
                  style={{
                    background: `linear-gradient(160deg, ${pl.color}, ${pl.color}cc)`,
                    boxShadow: `0 2px 8px ${pl.color}55`,
                    filter: pl.eliminated ? "grayscale(.6)" : "none",
                  }}
                >
                  {cowInitials(pl.name)}
                </span>
                <span className="aar-tx">
                  <span className="aar-name">
                    {countryFlag(pl.country) && (
                      <span className="player-flag" title={countryName(pl.country)} style={{ marginRight: 5 }}>
                        {countryFlag(pl.country)}
                      </span>
                    )}
                    {pl.name}
                    {isMe && <span className="aar-you"> · you</span>}
                  </span>
                  <span className="aar-role">{role}</span>
                </span>
                <span className="aar-dot" style={{ background: dot, boxShadow: pl.eliminated ? "none" : `0 0 6px ${dot}aa` }} />
              </div>
            );
          })}
        </div>
        <div className="aar-pad" />
      </div>

      {sponsor && (sponsor.bannerImage || sponsor.logoUrl || sponsor.name) && (
        <div className="aar-sponsor">
          {sponsor.bannerImage ? (
            <img src={sponsor.bannerImage} alt={sponsor.name ?? "Sponsor"} />
          ) : sponsor.logoUrl ? (
            <img src={sponsor.logoUrl} alt={sponsor.name ?? "Sponsor"} />
          ) : (
            <span>{sponsor.name}</span>
          )}
        </div>
      )}
    </div>
  );
}

export const ArcArenaRoster = memo(ArcArenaRosterImpl);
ArcArenaRoster.displayName = "ArcArenaRoster";
