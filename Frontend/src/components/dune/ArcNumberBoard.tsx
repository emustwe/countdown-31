"use client";

import React, { memo, useEffect, useMemo, useRef, useState } from "react";

import type { NumberBoardProps } from "./NumberBoard";

/**
 * ArcNumberBoard — the number board as an arc that MIRRORS the player rail.
 *
 * Same radius as the player rail (ARC_RADIUS 430), so the two arcs read as one pair of facing curves
 * and the numbers carry the same visual weight as the cows.
 *
 * The window, top to bottom, is always seven:
 *
 *     3 taken      grey    — already claimed, including the running total itself
 *     3 active     cyan    — the player takes 1, 2 or 3 of these, in order
 *     1 next       dim     — a preview of what follows, never clickable
 *
 * There is deliberately NO highlighted "current total" node. The total is already claimed, so
 * painting it gold both duplicated the readout in the middle and made a dead node look live. The
 * running total lives in exactly one place now: the text in the bowl.
 *
 * Colour: cyan = claimable, red = 31, grey = gone. Nothing else. A number's owner is never painted.
 */

/* ---------------------------------------------------------------- geometry */
/** Circle centre, LEFT of the apex so the arc bulges right — the mirror of the player rail. */
export const NUM_CX = 400;
export const NUM_CY = 340; // = STAGE_H / 2
/** Matches ARC_RADIUS in ClassicArcBoard — the two arcs are the same size, by design. */
export const NUM_R = 430;
/**
 * The angular step TIGHTENS toward the ends rather than staying constant.
 *
 * A constant step can't satisfy both halves of the brief: wide enough to separate the big claimable
 * numbers means the outermost node lands past the bottom of the 680-tall stage (at a constant 16° the
 * preview node centred at y 660 was visibly cut in half); narrow enough to fit makes the two largest
 * nodes overlap. Tightening the outer slots — where the nodes are small anyway — buys the room for a
 * full-size 130px number at the apex AND keeps all seven inside the stage.
 */
const RAMP = [0, 16, 30, 42];
const angleAt = (step: number) => {
  const sign = step < 0 ? -1 : 1;
  const a = Math.abs(step);
  const last = RAMP.length - 1;
  if (a >= last) return sign * (RAMP[last]! + (a - last) * 12);
  const i = Math.floor(a);
  return sign * (RAMP[i]! + (RAMP[i + 1]! - RAMP[i]!) * (a - i));
};

/** Where the running total + submit bar live, in the bowl between the two arcs. */
export const TOTAL_CX = 628;

const rad = (d: number) => (d * Math.PI) / 180;
export const arcPointAt = (step: number) => {
  const a = rad(angleAt(step));
  return { x: NUM_CX + NUM_R * Math.cos(a), y: NUM_CY + NUM_R * Math.sin(a) };
};

type NodeState = "taken" | "active" | "next";

/** Largest node; every node renders at this size and is scaled by transform. See ArcNode. */
const BASE = 130;

/** The three you can take lead the eye; what is gone, and what is merely coming, recede. */
const sizeAt = (state: NodeState, step: number) => {
  if (state === "active") return step < 0.5 ? 130 : step < 1.5 ? 108 : 92;
  if (state === "next") return 76;
  return step > -1.5 ? 72 : step > -2.5 ? 60 : 50;
};
const fadeAt = (state: NodeState, step: number) => {
  if (Math.abs(step) > 3.4) return 0;
  if (state === "active") return 1;
  if (state === "next") return 0.62;
  return step > -1.5 ? 0.6 : step > -2.5 ? 0.48 : 0.36;
};

const GOAL = 31;
const C = {
  gold: "#F5A524",
  goldSoft: "#FFD98A",
  claim: "#35D6E8",
  claimSoft: "#D3FBFF",
  danger: "#F87171",
  grey: "#6E6757",
  greyInk: "#8C8468",
  mute: "#8A8071",
};

/* -------------------------------------------------------------------- rail */
function ArcRail({ progress }: { progress: number }) {
  const d = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 120; i++) {
      const p = arcPointAt(-3.4 + (6.8 * i) / 120);
      pts.push(`${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return pts.join(" ");
  }, []);
  const runRef = useRef<SVGPathElement | null>(null);
  const [len, setLen] = useState(1);
  useEffect(() => {
    if (runRef.current) setLen(runRef.current.getTotalLength());
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
          strokeDasharray: len,
          strokeDashoffset: len * (1 - Math.max(0, Math.min(1, progress))),
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
  state: NodeState;
  selected: boolean;
  onSelect?: (n: number) => void;
}) {
  const p = arcPointAt(step);
  const size = sizeAt(state, step);
  const opacity = fadeAt(state, step);
  if (opacity <= 0) return null;

  const isDanger = value === GOAL && state === "active";
  const clickable = state === "active" && !!onSelect;

  const ring = selected ? C.claim : isDanger ? C.danger : state === "active" ? C.claim : state === "next" ? "rgba(245,165,36,.22)" : C.grey;

  const bg = selected
    ? `radial-gradient(circle at 35% 30%, ${C.claimSoft}, ${C.claim} 62%, #0E7F90)`
    : "rgba(14,16,12,.88)";

  const fg = selected ? "#04222A" : isDanger ? "#FECACA" : state === "active" ? C.claimSoft : C.greyInk;

  const glow = selected
    ? `0 0 30px ${C.claim}b0`
    : isDanger
      ? `0 0 20px ${C.danger}88`
      : state === "active"
        ? `0 0 18px ${C.claim}55`
        : "0 4px 12px rgba(0,0,0,.45)";

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={
        state === "active"
          ? `Claim ${value}${isDanger ? " — this is 31, it knocks you out" : ""}${selected ? ", selected" : ""}`
          : state === "next"
            ? `${value}, next after this turn`
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
        border: `${state === "active" ? 3 : 2}px solid ${ring}`,
        color: fg,
        boxShadow: glow,
        fontSize: BASE * (value >= 10 ? 0.4 : 0.46),
        zIndex: state === "active" ? 30 - Math.round(step) : 10,
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {value}
    </div>
  );
}

/* ------------------------------------------------------------------- board */
function ArcNumberBoardImpl({ total, taken, picks, highlight, onSelect, myTurn, ticker, brand }: NumberBoardProps) {
  /**
   * The seven-node window. Steps run -3…+3 with the FIRST claimable number at the apex (step 0),
   * where it is biggest and easiest to hit — it is the number a player reaches for most.
   */
  const nodes = useMemo(() => {
    const out: { value: number; step: number; state: NodeState }[] = [];
    // Above: the three most recently claimed, the running total among them. Grey — they are gone.
    for (let k = 3; k >= 1; k--) {
      const v = total - k + 1;
      if (v >= 1) out.push({ value: v, step: -k, state: "taken" });
    }
    // The three that can be claimed this turn.
    for (let k = 1; k <= 3; k++) {
      const v = total + k;
      if (v <= GOAL) out.push({ value: v, step: k - 1, state: "active" });
    }
    // One step of lookahead, so the shape of the next turn is visible. Never clickable.
    const nxt = total + 4;
    if (nxt <= GOAL) out.push({ value: nxt, step: 3, state: "next" });
    return out;
  }, [total]);

  const claimable = useMemo(() => new Set(picks), [picks]);
  const selected = useMemo(() => new Set(highlight), [highlight]);
  const left = GOAL - total;
  const wm = brand?.watermark !== false && brand?.logoUrl;

  return (
    <div className="anb-layer" aria-label="Number board">
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
          onSelect={myTurn && n.state === "active" && claimable.has(n.value) ? onSelect : undefined}
        />
      ))}

      {/* The running total — now the ONLY place it appears. */}
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
