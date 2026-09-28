"use client";

import React, { memo, useMemo } from "react";

import type { NumberBoardProps } from "./NumberBoard";

/**
 * ArcNumberBoard — the number board as an arc that MIRRORS the player rail.
 *
 * The rail is drawn with the SAME four-layer stack as the player rail (wide gold glow, brass
 * gradient, fine gold hairline, rivets) over the same ±63° sweep, so the two arcs are the same
 * object facing opposite ways rather than two different-looking curves.
 *
 * The window, top to bottom, is always seven:
 *
 *     3 taken      grey / BROWN  — already claimed; brown marks the previous player's own claim,
 *                                  so everyone can see whether they took 1, 2 or 3
 *     3 active     cyan          — the player takes 1, 2 or 3 of these, in order
 *     1 next       dim           — a preview of what follows, never clickable
 *
 * Colour: cyan = claimable, red = 31 (and ONLY 31), brown = the last claim, grey = older. There is
 * no running-total readout — the numbers themselves say where the round is.
 */

/* ---------------------------------------------------------------- geometry */
/** Circle centre, LEFT of the apex so the arc bulges right — the mirror of the player rail. */
export const NUM_CX = 580;
export const NUM_CY = 340; // = STAGE_H / 2
/** Matches ARC_RADIUS in ClassicArcBoard — the two arcs are the same size, by design. */
export const NUM_R = 430;

/**
 * The angular step TIGHTENS toward the ends rather than staying constant.
 *
 * A constant step cannot satisfy both halves of the brief: wide enough to separate the big claimable
 * numbers puts the outermost node past the bottom of the 680-tall stage; narrow enough to fit makes
 * the two largest nodes overlap. Tightening the outer slots — where the nodes are small anyway —
 * buys a full-size 130px number at the apex AND keeps all seven inside the stage.
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

const rad = (d: number) => (d * Math.PI) / 180;
/** A point on the arc from a raw ANGLE — the rail is swept by angle so it can match the player rail's
 *  ±63° reach independently of where the seven nodes happen to sit. */
const pointAtAngle = (deg: number) => ({ x: NUM_CX + NUM_R * Math.cos(rad(deg)), y: NUM_CY + NUM_R * Math.sin(rad(deg)) });
export const arcPointAt = (step: number) => pointAtAngle(angleAt(step));

/** The apex — where the first claimable number sits, and what the submit button lines up with. */
export const ARC_APEX = pointAtAngle(0);
/** Half-width of the apex node, so callers can place things clear of it. */
export const ARC_APEX_HALF = 65;
/** The player rail's sweep, matched exactly: 3.3 steps × 19° per step. */
const SWEEP_DEG = 62.7;

type NodeState = "taken" | "active" | "next";

/** Largest node; every node renders at this size and is scaled by transform. See ArcNode. */
const BASE = 130;

/** The three you can take lead the eye; what is gone, and what is merely coming, recede. */
const sizeAt = (state: NodeState, step: number) => {
  if (state === "active") return step < 0.5 ? 130 : step < 1.5 ? 108 : 92;
  if (state === "next") return 76;
  return step > -1.5 ? 72 : step > -2.5 ? 60 : 50;
};
const fadeAt = (state: NodeState, step: number, recent: boolean) => {
  if (Math.abs(step) > 3.4) return 0;
  if (state === "active") return 1;
  if (state === "next") return 0.62;
  // The previous player's claim is the one thing in the taken zone that carries live information —
  // how many they took — so it does NOT fade with age the way older claims do.
  if (recent) return 0.96;
  return step > -1.5 ? 0.72 : step > -2.5 ? 0.56 : 0.42;
};

const GOAL = 31;
const C = {
  gold: "#F5A524",
  goldSoft: "#FFD98A",
  claim: "#35D6E8",
  claimSoft: "#D3FBFF",
  /** 31, and nothing else. */
  danger: "#F87171",
  /** The previous player's claim — a SOLID disc, not an outline: a tinted ring over a near-black
   *  fill just read as grey. Deliberately far from `danger` in hue so the two never read alike. */
  brown: "#A0682F",
  brownHi: "#CE8F4E",
  brownLo: "#63401E",
  brownRim: "#E0A870",
  brownInk: "#FFF1DD",
  grey: "#6E6757",
  greyInk: "#8C8468",
};

/* -------------------------------------------------------------------- rail */
/** Identical construction to ClassicArcBoard's `Rail` — same layers, widths, opacities and rivets. */
function ArcRail() {
  const { d, rivets } = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 140; i++) {
      const p = pointAtAngle(-SWEEP_DEG + (2 * SWEEP_DEG * i) / 140);
      pts.push(`${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    // 19 rivets over a slightly shorter sweep than the rail, exactly as the player rail does it.
    const r = Array.from({ length: 19 }, (_, i) => pointAtAngle(-58.9 + (117.8 * i) / 18));
    return { d: pts.join(" "), rivets: r };
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
          <feGaussianBlur stdDeviation="9" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={d} fill="none" stroke={C.gold} strokeWidth="26" opacity="0.1" filter="url(#anb-glow)" />
      <path d={d} fill="none" stroke="url(#anb-brass)" strokeWidth="16" strokeLinecap="round" />
      <path d={d} fill="none" stroke={C.goldSoft} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      {rivets.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.6" fill="#3B2708" opacity="0.85" />
      ))}
    </svg>
  );
}

/* -------------------------------------------------------------------- node */
function ArcNode({
  value,
  step,
  state,
  recent,
  selected,
  onSelect,
}: {
  value: number;
  step: number;
  state: NodeState;
  /** Part of the PREVIOUS player's claim — painted brown so its size is readable at a glance. */
  recent: boolean;
  selected: boolean;
  onSelect?: (n: number) => void;
}) {
  const p = arcPointAt(step);
  const size = sizeAt(state, step);
  const opacity = fadeAt(state, step, recent);
  if (opacity <= 0) return null;

  const isDanger = value === GOAL && state === "active";
  const clickable = state === "active" && !!onSelect;

  const ring = selected
    ? C.claim
    : isDanger
      ? C.danger
      : state === "active"
        ? C.claim
        : recent
          ? C.brownRim
          : state === "next"
            ? "rgba(245,165,36,.22)"
            : C.grey;

  const bg = selected
    ? `radial-gradient(circle at 35% 30%, ${C.claimSoft}, ${C.claim} 62%, #0E7F90)`
    : recent
      ? `radial-gradient(circle at 35% 30%, ${C.brownHi}, ${C.brown} 58%, ${C.brownLo})`
      : "rgba(14,16,12,.88)";

  const fg = selected
    ? "#04222A"
    : isDanger
      ? "#FECACA"
      : state === "active"
        ? C.claimSoft
        : recent
          ? C.brownInk
          : C.greyInk;

  const glow = selected
    ? `0 0 30px ${C.claim}b0`
    : isDanger
      ? `0 0 20px ${C.danger}88`
      : state === "active"
        ? `0 0 18px ${C.claim}55`
        : recent
          ? `0 0 22px ${C.brown}aa`
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
            : `${value}, already taken${recent ? ", by the previous player" : ""}`
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
        border: `${state === "active" || recent ? 3 : 2}px solid ${ring}`,
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
export type ArcNumberBoardProps = NumberBoardProps & {
  /** Numbers the PREVIOUS player claimed this turn — painted brown. */
  lastPicks?: number[];
};

function ArcNumberBoardImpl({ total, picks, highlight, onSelect, myTurn, lastPicks, brand }: ArcNumberBoardProps) {
  /**
   * The seven-node window. Steps run -3…+3 with the FIRST claimable number at the apex (step 0),
   * where it is biggest and easiest to hit — it is the number a player reaches for most.
   */
  const nodes = useMemo(() => {
    const out: { value: number; step: number; state: NodeState }[] = [];
    // Above: the three most recently claimed, the running total among them.
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
  const recent = useMemo(() => new Set(lastPicks ?? []), [lastPicks]);

  // The sponsor's mark. It used to sit behind the running total; with that gone it moves to the open
  // space outside the arc, under the submit button — still a real, visible surface, and now the only
  // thing in the composition that isn't the game itself.
  const wm = brand?.watermark !== false && brand?.logoUrl;

  return (
    <div className="anb-layer" aria-label="Number board">
      <ArcRail />
      {wm && <img src={brand.logoUrl} alt="" aria-hidden="true" className="anb-watermark" style={{ opacity: brand?.watermarkOpacity ?? 0.14 }} />}
      {nodes.map((n) => (
        <ArcNode
          key={n.value}
          value={n.value}
          step={n.step}
          state={n.state}
          recent={n.state === "taken" && recent.has(n.value)}
          selected={selected.has(n.value)}
          onSelect={myTurn && n.state === "active" && claimable.has(n.value) ? onSelect : undefined}
        />
      ))}
    </div>
  );
}

export const ArcNumberBoard = memo(ArcNumberBoardImpl);
ArcNumberBoard.displayName = "ArcNumberBoard";
