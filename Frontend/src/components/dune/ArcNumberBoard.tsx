"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";

import type { NumberBoardProps } from "./NumberBoard";

/**
 * ArcNumberBoard — the number board as an arc that MIRRORS the player rail.
 *
 * The player rail bows LEFT with the active cow at its apex. This bows RIGHT, so the two face each
 * other across the running total: ( total )
 *
 * The board deliberately shows a WINDOW, not all 31 numbers — the three just spent, the running
 * total, and the three you may claim. That is the whole of what a player needs to decide a turn, and
 * it reads identically on a 390px phone and a 27" monitor, which a 31-tile grid never did. The full
 * ledger of what has gone is the arena list's job, not the board's.
 *
 * Colour discipline is inherited from the old board and unchanged: gold = progress and the running
 * total, cyan = claimable now, red = 31. A number's owner is never painted here.
 *
 * Geometry all derives from `arcPointAt`, so the constants below are the single source of truth.
 */

/* ---------------------------------------------------------------- geometry */
/** Circle centre. Sits LEFT of the apex, so the arc bulges right — the mirror of the player rail. */
export const NUM_CX = 470;
export const NUM_CY = 340; // = STAGE_H / 2
export const NUM_R = 360;
const STEP_DEG = 15;

/** Where the running total + submit bar live, in the bowl between the two arcs. */
export const TOTAL_CX = 628;

const rad = (d: number) => (d * Math.PI) / 180;
export const arcPointAt = (step: number) => {
  const a = rad(step * STEP_DEG);
  return { x: NUM_CX + NUM_R * Math.cos(a), y: NUM_CY + NUM_R * Math.sin(a) };
};

/** Every node is rendered at this size and scaled by transform; see the note in ArcNode. */
const BASE = 96;

/** Spent numbers ride smaller than claimable ones — the eye goes to what you can still take. */
const sizeAt = (step: number) => {
  if (step > -0.2 && step < 0.2) return 96;
  const a = Math.abs(step);
  if (step > 0) return a <= 1 ? 84 : a <= 2 ? 77 : 70;
  return a <= 1 ? 62 : a <= 2 ? 54 : 47;
};
const fadeAt = (step: number) => {
  const a = Math.abs(step);
  if (a > 3.3) return 0;
  const edge = a > 2.6 ? Math.max(0, 1 - (a - 2.6) / 0.75) : 1;
  return (step < 0 ? 0.52 : 1) * edge;
};

const GOAL = 31;
const C = {
  gold: "#F5A524",
  goldSoft: "#FFD98A",
  claim: "#35D6E8",
  claimSoft: "#B9F5DA",
  danger: "#F87171",
  bone: "#F6EFE2",
  mute: "#8A8071",
};

/* -------------------------------------------------------------------- rail */
function ArcRail({ progress }: { progress: number }) {
  const { d, len } = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const p = arcPointAt(-3.35 + (6.7 * i) / 120);
      pts.push(`${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    // Chord length is a close enough dash basis for a shallow arc; the exact value is set from the
    // DOM below once the path exists.
    return { d: pts.join(" "), len: 2 * NUM_R * rad(3.35 * STEP_DEG) };
  }, []);
  const runRef = useRef<SVGPathElement | null>(null);
  const [total, setTotal] = useState(len);
  useEffect(() => {
    if (runRef.current) setTotal(runRef.current.getTotalLength());
  }, []);

  return (
    /* NO viewBox, and an explicit px size: the parent stage is already in these units and is scaled
       as a whole by a transform, so 1 SVG unit must equal 1 stage unit. A viewBox whose width differs
       from the layer's own width silently rescales the rail out from under the nodes. */
    <svg width={1240} height={680} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
      <defs>
        <linearGradient id="anb-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9B45A" />
          <stop offset="45%" stopColor="#C6862B" />
          <stop offset="100%" stopColor="#7A4E12" />
        </linearGradient>
        <filter id="anb-glow" x="-60%" y="-20%" width="220%" height="140%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={d} fill="none" stroke={C.gold} strokeWidth="24" opacity="0.09" filter="url(#anb-glow)" />
      <path d={d} fill="none" stroke="url(#anb-brass)" strokeWidth="14" strokeLinecap="round" />
      {/* Progress toward 31, drawn along the rail itself — the board's only chart. */}
      <path
        ref={runRef}
        d={d}
        fill="none"
        stroke={C.goldSoft}
        strokeWidth="4"
        strokeLinecap="round"
        opacity="0.9"
        style={{
          strokeDasharray: total,
          strokeDashoffset: total * (1 - Math.max(0, Math.min(1, progress))),
          transition: "stroke-dashoffset .55s cubic-bezier(.22,.9,.24,1)",
        }}
      />
    </svg>
  );
}

/* -------------------------------------------------------------------- node */
function ArcNode({
  value,
  step,
  state,
  selected,
  onSelect,
}: {
  value: number;
  step: number;
  state: "spent" | "current" | "claim";
  selected: boolean;
  onSelect?: (n: number) => void;
}) {
  const p = arcPointAt(step);
  const size = sizeAt(step);
  const opacity = fadeAt(step);
  if (opacity <= 0) return null;

  const isDanger = value === GOAL && state === "claim";
  const clickable = state === "claim" && !!onSelect;

  const ring = selected
    ? C.claim
    : isDanger
      ? C.danger
      : state === "current"
        ? "#FFF3C4"
        : state === "claim"
          ? C.claim
          : "rgba(245,165,36,.3)";

  const bg = selected
    ? `radial-gradient(circle at 35% 30%, ${C.claimSoft}, ${C.claim} 62%, #0E7F90)`
    : state === "current"
      ? "radial-gradient(circle at 35% 30%,#FDE68A,#F59E0B 60%,#B45309)"
      : "rgba(14,16,12,.88)";

  const fg = selected ? "#04222A" : state === "current" ? "#3B2203" : isDanger ? "#FECACA" : state === "claim" ? C.claimSoft : "#8C8468";

  const glow = selected
    ? `0 0 26px ${C.claim}b0`
    : state === "current"
      ? "0 0 28px rgba(245,165,36,.72)"
      : isDanger
        ? `0 0 18px ${C.danger}88`
        : state === "claim"
          ? `0 0 16px ${C.claim}66`
          : "0 4px 12px rgba(0,0,0,.45)";

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={
        state === "current"
          ? `Running total ${value}`
          : state === "claim"
            ? `Claim ${value}${isDanger ? " — this is 31, it knocks you out" : ""}${selected ? ", selected" : ""}`
            : `${value}, already taken`
      }
      aria-pressed={clickable ? selected : undefined}
      onClick={clickable ? () => onSelect?.(value) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(value);
              }
            }
          : undefined
      }
      className={`anb-node${clickable ? " is-live" : ""}`}
      /* Every node is BASE px and is moved/resized purely by `transform`. Animating left/top/width/
         height here would put a layout pass in the middle of the turn animation on exactly the low-end
         phones this arena was just optimised for; translate + scale stays on the compositor. */
      style={{
        left: NUM_CX,
        top: NUM_CY,
        width: BASE,
        height: BASE,
        transform: `translate(${(p.x - NUM_CX).toFixed(1)}px,${(p.y - NUM_CY).toFixed(1)}px) translate(-50%,-50%) scale(${(size / BASE).toFixed(3)})`,
        opacity,
        background: bg,
        border: `2.5px solid ${ring}`,
        color: fg,
        boxShadow: glow,
        fontSize: BASE * (value >= 10 ? 0.4 : 0.46),
        zIndex: state === "current" ? 30 : 20 - Math.round(Math.abs(step)),
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {value}
    </div>
  );
}

/* ------------------------------------------------------------------- board */
function ArcNumberBoardImpl({ total, taken, picks, highlight, onSelect, myTurn, ticker, brand }: NumberBoardProps) {
  // The visible window: three spent, the total, three claimable.
  const nodes = useMemo(() => {
    const out: { value: number; step: number; state: "spent" | "current" | "claim" }[] = [];
    for (let k = 3; k >= 1; k--) {
      const v = total - k;
      if (v >= 1) out.push({ value: v, step: -k, state: "spent" });
    }
    if (total > 0) out.push({ value: total, step: 0, state: "current" });
    for (let k = 1; k <= 3; k++) {
      const v = total + k;
      if (v <= GOAL) out.push({ value: v, step: k, state: "claim" });
    }
    return out;
  }, [total]);

  const claimable = useMemo(() => new Set(picks), [picks]);
  const selected = useMemo(() => new Set(highlight), [highlight]);
  const left = GOAL - total;
  const wm = brand?.watermark !== false && brand?.logoUrl;

  return (
    <div className="anb-layer" aria-label="Number board">
      {/* Sponsor watermark, ghosted into the bowl behind the total — the same ad surface the old
          board carried, in the one place nothing else occupies. */}
      {wm && (
        <img
          src={brand.logoUrl}
          alt=""
          aria-hidden="true"
          className="anb-watermark"
          style={{ left: TOTAL_CX, opacity: brand?.watermarkOpacity ?? 0.12 }}
        />
      )}

      <ArcRail progress={total / GOAL} />

      {nodes.map((n) => (
        <ArcNode
          key={n.value}
          value={n.value}
          step={n.step}
          state={n.state}
          selected={selected.has(n.value)}
          onSelect={myTurn && n.state === "claim" && claimable.has(n.value) ? onSelect : undefined}
        />
      ))}

      {/* Running total, in the bowl the two arcs make. */}
      <div className="anb-total" style={{ left: TOTAL_CX }}>
        <div className="anb-cap">Running total</div>
        {total > 0 ? (
          <>
            <div className="anb-big">
              {total}
              <small>/{GOAL}</small>
            </div>
            <div className="anb-sub" style={{ color: left <= 3 ? C.danger : C.mute }}>
              {total >= GOAL ? "Round over" : `${left} to go`}
            </div>
          </>
        ) : (
          <>
            <div className="anb-start">START</div>
            <div className="anb-sub">Claim 1, 2 or 3</div>
          </>
        )}
        {ticker && <div className="anb-ticker">{ticker}</div>}
      </div>
    </div>
  );
}

export const ArcNumberBoard = memo(ArcNumberBoardImpl);
ArcNumberBoard.displayName = "ArcNumberBoard";
