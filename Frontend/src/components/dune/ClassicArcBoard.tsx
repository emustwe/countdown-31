"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Send, Flame, Users } from "lucide-react";
import { useSettledResize } from "../../lib/hooks/useSettledResize";
import { ArenaRoster } from "./ArenaRoster";
import { countryFlag, countryName } from "../../lib/countries";
import { MasterAvatar } from "./MasterAvatar";
import { NumberBoard } from "./NumberBoard";
import { useAvatarStore, type AvatarConfig } from "../../stores/avatar-customization-store";
import type { LivePlayer, LastMoveInfo } from "../../lib/hooks/useCountdownLive";

/**
 * ClassicArcBoard — the curved player rail for Countdown 31 CLASSIC PRACTICE.
 *
 * This replaces the horizontal number cylinder for classic practice only. Five+ players ride an arc
 * that bulges LEFT with the CURRENT player at the apex; previous players sit above (dimmed), upcoming
 * below. When a turn commits the whole rail slides one step ALONG the curve (never teleports). The
 * open space to the right holds the running total, the claimed-numbers ledger, and — for the active
 * player only — the number picker.
 *
 * All geometry is computed from `pointAt`, so `ARC_RADIUS` / `ARC_STEP_DEG` / `ARC_APEX_X` are the
 * single source of truth. Cow avatars come from the shared MasterAvatar (same theme everywhere).
 */

/* ------------------------------------------------------------------ tokens */
const C = {
  brassHi: "#E9B45A",
  brass: "#C6862B",
  brassLo: "#7A4E12",
  gold: "#F5A524",
  goldSoft: "#FFD98A",
  cyan: "#2ED3E9",
  ember: "#F2564B",
  bone: "#F6EFE2",
  mute: "#8A8071",
};


// Stage-y of the number board's TOP edge = the arena roster's head. The parent pins the roster
// overlay at ROSTER_TOP * boardScale, so the board and the roster line up exactly on every screen.
export const ROSTER_TOP = 44;
// Shared height (stage units) of BOTH the number board and the arena roster, so they line up top AND
// bottom (same height). Sized as tall as possible while still leaving room for the compact number
// picker below the board within the stage.
export const ARENA_H = 494;

/* ---------------------------------------------------------------- geometry */
const STAGE_W = 1240;
const STAGE_H = 680;
// The ARENA roster now lives INSIDE the stage (right of the board), so the whole arc + board + roster
// composition fit-scales and centres as ONE unit — balanced on every aspect ratio (no shove-right on
// wide phone-landscape, no overlap on square windows). CONTENT_W spans the board's right edge
// (BOARD_X + BOARD_W) + gap + roster width + a small right margin.
const BOARD_X = 560; // number board left (nudged right of the arc)
const BOARD_W = 520;
// Gap board→roster (wider = roster sits further right). Kept in step with BOARD_X so CONTENT_W — and
// therefore the fit scale AND the roster's screen position — stay put when the board is nudged right.
const BOARD_ROSTER_GAP = 45;
const ROSTER_X = BOARD_X + BOARD_W + BOARD_ROSTER_GAP;
const ROSTER_W = 300;
const CONTENT_W = ROSTER_X + ROSTER_W + 18;
const ARC_RADIUS = 430; // bigger = flatter curve
const ARC_STEP_DEG = 19; // angular gap between two neighbouring players
// Where the current player sits (left edge inset). Big enough that the apex avatar (140 stage px wide,
// so it reaches ARC_APEX_X - 70) clears the screen-left PLAY button, which is aligned under the "31"
// badge and vertically centred on the page.
const ARC_APEX_X = 126;

const CX = ARC_APEX_X + ARC_RADIUS;
const CY = STAGE_H / 2;

const pointAt = (step: number) => {
  const a = (step * ARC_STEP_DEG * Math.PI) / 180;
  return { x: CX - ARC_RADIUS * Math.cos(a), y: CY + ARC_RADIUS * Math.sin(a) };
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Interpolate along an array of stops keyed by |step| = 0,1,2,3… */
const curve = (abs: number, stops: number[]) => {
  if (abs <= 0) return stops[0]!;
  if (abs >= stops.length - 1) return stops[stops.length - 1]!;
  const i = Math.floor(abs);
  return lerp(stops[i]!, stops[i + 1]!, abs - i);
};
const sizeAt = (abs: number) => curve(abs, [140, 82, 58, 44]);
const dimAt = (abs: number) => curve(abs, [1, 0.9, 0.6, 0.28]);

/* ------------------------------------------------------------- avatar cfg */
function avatarConfigFor(player: LivePlayer, isLocal: boolean, localCfg: Partial<AvatarConfig>): AvatarConfig {
  const base = isLocal ? { ...localCfg, ...(player.avatar ?? {}) } : { ...(player.avatar ?? {}) };
  return {
    ...base,
    variantId: (player.avatar?.variantId ?? (base as AvatarConfig).variantId ?? "daisy_v1_cowboy") as AvatarConfig["variantId"],
    backgroundId: ((base as AvatarConfig).backgroundId || (isLocal ? "emerald" : "frost")) as AvatarConfig["backgroundId"],
    frameId: ((base as AvatarConfig).frameId || (isLocal ? "mythic_gold" : "neon_glacier")) as AvatarConfig["frameId"],
  } as AvatarConfig;
}

/* ------------------------------------------------------------------- rail */
function Rail() {
  const d = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i <= 140; i++) {
      const p = pointAt(-3.3 + (6.6 * i) / 140);
      out.push(`${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return out.join(" ");
  }, []);
  const rivets = useMemo(() => Array.from({ length: 19 }, (_, i) => pointAt(-3.1 + (6.2 * i) / 18)), []);

  return (
    <svg width={STAGE_W} height={STAGE_H} style={{ position: "absolute", inset: 0, pointerEvents: "none" }} aria-hidden="true">
      <defs>
        <linearGradient id="cab-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.brassHi} />
          <stop offset="45%" stopColor={C.brass} />
          <stop offset="100%" stopColor={C.brassLo} />
        </linearGradient>
        <filter id="cab-glow" x="-60%" y="-20%" width="220%" height="140%">
          <feGaussianBlur stdDeviation="9" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d={d} fill="none" stroke={C.gold} strokeWidth="26" opacity="0.1" filter="url(#cab-glow)" />
      <path d={d} fill="none" stroke="url(#cab-brass)" strokeWidth="16" strokeLinecap="round" />
      <path d={d} fill="none" stroke={C.goldSoft} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
      {rivets.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.6" fill="#3B2708" opacity="0.85" />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ node */
function ArcNode({
  player,
  step,
  seat,
  isLocal,
  localCfg,
  ghost,
}: {
  player: LivePlayer;
  step: number;
  seat: number;
  isLocal: boolean;
  localCfg: Partial<AvatarConfig>;
  ghost: number | null;
}) {
  const abs = Math.abs(step);
  if (abs > 3.3) return null; // buffer of 7 (-3…+3); anything past fades out

  const p = pointAt(step);
  const size = sizeAt(abs);
  const active = abs < 0.35;
  const past = step < -0.1;
  // Fade the two buffer slots in/out so arrivals/departures never pop.
  const edgeFade = abs > 2.5 ? Math.max(0, 1 - (abs - 2.5) / 0.8) : 1;
  const opacity = dimAt(abs) * edgeFade;
  const cfg = avatarConfigFor(player, isLocal, localCfg);
  const relLabel = active ? "up now" : step < 0 ? (step < -1.5 ? "earlier" : "last turn") : step > 1.5 ? "in queue" : "up next";

  return (
    <div
      role="listitem"
      aria-label={`Seat ${seat}, ${player.name}, ${relLabel}`}
      aria-current={active ? "true" : undefined}
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        width: size,
        height: size,
        transform: "translate(-50%,-50%)",
        opacity,
        zIndex: active ? 30 : 20 - Math.round(abs),
        willChange: "left, top, width, height",
      }}
    >
      {active && <span className="cab-ring" style={{ width: size + 8, height: size + 8 }} />}
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: size * 0.26,
          padding: active ? 4 : 3,
          background: active
            ? "linear-gradient(140deg,#FF9BD2,#FFD98A,#2ED3E9,#FF9BD2)"
            : `linear-gradient(160deg,${C.brass},${C.brassLo})`,
          boxShadow: active ? "0 0 0 2px rgba(0,0,0,.55), 0 18px 44px rgba(245,165,36,.4)" : "0 8px 20px rgba(0,0,0,.5)",
          filter: past ? "saturate(.55)" : "none",
        }}
      >
        <div style={{ width: "100%", height: "100%", borderRadius: size * 0.2, overflow: "hidden" }}>
          <MasterAvatar config={cfg} className="w-full h-full" />
        </div>
      </div>

      {/* Seat / turn-order badge — top-left, on the brass-rail side. */}
      <span
        className="cab-seat"
        style={{
          background: active ? C.gold : "rgba(8,7,5,.82)",
          color: active ? "#1b1206" : C.goldSoft,
          border: `1px solid ${active ? C.goldSoft : "rgba(245,165,36,.35)"}`,
          fontSize: active ? 11 : 10,
        }}
      >
        {seat}
      </span>

      {/* Last-mover ghost badge (+k) while sitting in the −1 slot. */}
      {ghost != null && step < -0.1 && step > -1.6 && (
        <span className="cab-ghost" style={{ borderColor: `${player.color}88`, color: player.color }}>
          +{ghost}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ detail card */
function CurrentCard({ player, waiting }: { player: LivePlayer; waiting: string | null }) {
  const p = pointAt(0);
  const title = (player.card?.title as string) ?? "Countdown Cow";
  const rating = (player.card?.rating as number) ?? null;
  return (
    <div
      key={player.id}
      className="cab-card"
      style={{ position: "absolute", left: p.x + sizeAt(0) / 2 + 26, top: p.y, transform: "translateY(-50%)", width: 300 }}
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <span className="cab-pill" style={{ color: C.cyan, borderColor: `${C.cyan}55`, background: `${C.cyan}14` }}>
          ⚡ Active turn
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        {/* Country flag — the clearest read of where a player is from, right beside their name.
            CPU cows and pre-country players have none, and the row just closes up. */}
        {countryFlag(player.country) && (
          <span className="player-flag" title={countryName(player.country)} style={{ fontSize: 26 }}>
            {countryFlag(player.country)}
          </span>
        )}
        <div
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: C.bone,
            lineHeight: 1.1,
            letterSpacing: "-.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {player.name}
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.goldSoft, marginTop: 4 }}>✦ {title}</div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid rgba(245,165,36,.16)",
        }}
      >
        {rating != null ? (
          <span className="cab-pill" style={{ color: C.goldSoft, borderColor: "rgba(245,165,36,.4)", background: "rgba(245,165,36,.1)" }}>
            🏆 {rating}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: C.mute }}>{player.cpu ? "CPU cow" : "You"}</span>
        )}
        {waiting && <span style={{ fontSize: 12, color: C.mute, fontStyle: "italic" }}>{waiting}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ props */
interface ClassicArcBoardProps {
  players: LivePlayer[];
  currentId: string | null;
  myId: string | null;
  count: number;
  taken: Record<number, string>;
  lastMove: LastMoveInfo | null;
  forbiddenK: number | null;
  selectedCards: number[];
  onToggleCard: (n: number) => void;
  onConfirmMove: () => void;
  myTurn: boolean;
  status: string;
  amInAlive: boolean;
  showJoin: boolean;
  onJoin: () => void;
  // Countdown timer cow (pinned to the number board's corner while it's your turn).
  timerActive: boolean;
  turnKey: string | number | null;
  // Real tournaments / test arena: shown in the picker slot while the local player is spectating.
  spectatorMessage?: string | null;
  // Live reveal of the CURRENT (non-local) player's picked numbers, highlighted in their colour so
  // everyone sees the selection as it happens.
  selecting?: { playerId: string; picks: number[]; color: string } | null;
  // Reports the board's fit scale up to the parent, so it can render the ARENA roster as a screen-edge
  // overlay scaled to match the board (hugs the right edge on every size, never overlaps the board).
  onScale?: (scale: number) => void;
  // Extra rightward offset (stage units) for the number board group, set by the parent so the board
  // sits right next to the arena roster on every screen (0 on desktop, larger on letterboxed mobile).
  shiftX?: number;
  // AD SURFACES (optional) — a sponsor theme's brand marks for the board felt + the arena list.
  // Omitted → the board and roster render exactly as before.
  boardBrand?: { logoUrl?: string; name?: string; color?: string; watermark?: boolean; watermarkOpacity?: number; boardImage?: string } | null;
  rosterSponsor?: { logoUrl?: string; name?: string; color?: string; bannerImage?: string } | null;
  rosterStyle?: "default" | "glass" | "solid" | "brand";
}

/* ------------------------------------------------------------------ stage */
/**
 * Memoised. NOTE the honest expectation: `selecting`, `lastMove`, `taken` and `count` change on
 * nearly every engine tick during play, so this still re-renders often — legitimately, because its
 * content genuinely changed. The memo is for correctness (it no longer re-renders on unrelated
 * parent state), not a large win. The real cost here is the layout-animated arc rail; see FIX 3.
 */
function ClassicArcBoardImpl({
  players,
  currentId,
  myId,
  count,
  taken,
  lastMove,
  forbiddenK,
  selectedCards,
  onToggleCard,
  onConfirmMove,
  myTurn,
  status,
  amInAlive,
  showJoin,
  onJoin,
  timerActive,
  turnKey,
  spectatorMessage,
  selecting,
  onScale,
  shiftX = 0,
  boardBrand = null,
  rosterSponsor = null,
  rosterStyle = "default",
}: ClassicArcBoardProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  // Rightward nudge (screen px) applied to the whole composition on phone-landscape, so it doesn't sit
  // a touch left of centre. Clamped to the available side margin so the roster can never spill off the
  // right edge (0 on square windows that fill the width, and 0 on desktop).
  const [shift, setShift] = useState(0);
  const localCfg = useAvatarStore();

  // Fit the fixed-design stage into whatever space the arena gives us (width AND height). Runs only
  // once the viewport has SETTLED after a resize / orientation burst — mobile auto-rotation fires a
  // flurry of transient sizes, and re-fitting on each one makes the board scale (and the overlays
  // that mirror it) blink. useSettledResize waits for the size to hold steady, then fits once.
  const fit = useCallback(() => {
    const w = wrapRef.current?.clientWidth ?? CONTENT_W;
    const h = wrapRef.current?.clientHeight ?? STAGE_H;
    const s = Math.min(w / CONTENT_W, h / STAGE_H, 1.05);
    setScale(s);
    onScale?.(s);
    // Nudge the whole composition right so the arc clears the left-edge PLAY button (and the board +
    // roster sit a touch further right). Clamped so the roster never spills off the right edge.
    const margin = (w - CONTENT_W * s) / 2; // cab-fit side margin
    const isPhoneLandscape =
      typeof window !== "undefined" &&
      window.matchMedia?.("(max-width: 1180px) and (orientation: landscape)").matches;
    if (isPhoneLandscape) {
      setShift(Math.max(0, Math.min(60, margin - 8)));
    } else {
      // Desktop: clamp to the REAL room to the viewport's right edge (cab-fit is inset from it), so the
      // composition can move far enough right for the arc's apex avatar to clear the PLAY button.
      const cabLeft = wrapRef.current?.getBoundingClientRect().left ?? 0;
      const compRight = cabLeft + (w + CONTENT_W * s) / 2; // centred composition's right edge
      const vw = typeof window !== "undefined" ? window.innerWidth : w;
      const rightRoom = vw - compRight - 8; // keep a small breathing gap at the right edge
      setShift(Math.max(0, Math.min(72, rightRoom)));
    }
  }, [onScale]);
  useSettledResize(fit, wrapRef);

  // Turn order: surviving players in seating order. Seat number = original roster index + 1.
  const seatOf = useMemo(() => {
    const m = new Map<string, number>();
    players.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [players]);
  const queue = useMemo(() => players.filter((p) => !p.eliminated), [players]);
  const N = queue.length;
  const curIdx = Math.max(0, queue.findIndex((p) => p.id === currentId));

  // Rotation: animate a single scalar `offset` 1 → 0 each time the turn advances, then add it to every
  // player's resting signed step so avatars trace the arc (never a straight-line corner-cut).
  const [offset, setOffset] = useState(0);
  const prevCurrent = useRef<string | null>(currentId);
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevCurrent.current === currentId) return;
    prevCurrent.current = currentId;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || N <= 1) {
      setOffset(0);
      return;
    }
    const D = 560;
    const start = performance.now();
    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic ~ cubic-bezier(.22,.9,.24,1)
    const tick = (nowT: number) => {
      const p = Math.min(1, (nowT - start) / D);
      setOffset(1 - ease(p)); // 1 → 0
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    setOffset(1);
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [currentId, N]);

  const currentPlayer = queue[curIdx] ?? null;
  // The three next numbers the active player may claim (consecutive from the total).
  const tiles = [count + 1, count + 2, count + 3];

  return (
    <div ref={wrapRef} className="cab-fit">
      <style>{`
        .cab-fit{width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden}
        .cab-pill{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:1px solid;border-radius:999px;padding:5px 10px;white-space:nowrap}
        .cab-ring{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:34%;border:2px dashed rgba(245,165,36,.55);animation:cab-spin 14s linear infinite;pointer-events:none}
        .cab-seat{position:absolute;top:-6px;left:-6px;min-width:18px;height:18px;padding:0 4px;display:grid;place-items:center;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;letter-spacing:.06em;box-shadow:0 3px 8px rgba(0,0,0,.5);z-index:5}
        .cab-ghost{position:absolute;bottom:-8px;right:-6px;font-size:10px;font-weight:800;padding:1px 6px;border-radius:999px;background:rgba(8,7,5,.85);border:1px solid;box-shadow:0 3px 8px rgba(0,0,0,.5)}
        .cab-card{border-radius:20px;padding:16px 18px;background:linear-gradient(155deg,rgba(24,20,12,.97),rgba(9,8,5,.97));border:1px solid rgba(245,165,36,.35);box-shadow:0 24px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,217,138,.14);animation:cab-fade .5s ease}
        .cab-total{font-variant-numeric:tabular-nums;font-weight:900;letter-spacing:-.03em;line-height:.9}
        .cab-tile{position:relative;display:grid;place-items:center;border-radius:18px;font-weight:900;font-variant-numeric:tabular-nums;cursor:pointer;user-select:none;transition:transform .12s ease, box-shadow .2s ease, background .2s ease;border:2px solid}
        .cab-tile:active{transform:scale(.95)}
        .cab-tile[disabled]{cursor:not-allowed;opacity:.35;filter:grayscale(.6)}
        .cab-submit{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:9px;border-radius:14px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;border:none;color:#062012;background:linear-gradient(90deg,#34d399,#22c55e,#34d399);box-shadow:0 0 25px rgba(52,211,153,.55);transition:filter .15s, transform .1s}
        .cab-submit:hover{filter:brightness(1.08)}
        .cab-submit:active{transform:scale(.98)}
        .cab-submit[disabled]{opacity:.4;filter:grayscale(.5);cursor:not-allowed;box-shadow:none}
        .cab-join{width:120px;height:120px;border-radius:999px;display:grid;place-items:center;cursor:pointer;border:3px solid #fff;color:#1b1206;background:linear-gradient(180deg,#fcd34d,#f59e0b,#b45309);box-shadow:0 0 38px rgba(245,158,11,.9);transition:transform .15s}
        .cab-join:hover{transform:scale(1.05)}.cab-join:active{transform:scale(.95)}
        .cab-panel{position:relative;border-radius:22px;border:2px solid transparent;background:linear-gradient(#0f0c07,#0f0c07) padding-box,linear-gradient(160deg,#E9B45A,#7A4E12) border-box;box-shadow:0 18px 40px rgba(0,0,0,.55), inset 0 2px 6px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,217,138,.12)}
        /* The number board wears a felt-green baize under a double brass frame + corner rivets. */
        .cab-numboard{position:relative;border-radius:24px;padding:16px 18px 18px;border:3px solid transparent;
          background:
            radial-gradient(120% 90% at 50% -10%, rgba(94,231,178,.10), transparent 60%),
            radial-gradient(140% 120% at 50% 120%, rgba(0,0,0,.55), transparent 55%),
            linear-gradient(160deg,#123a2a,#0a2018 55%,#06140e) padding-box,
            linear-gradient(160deg,#F2CE86,#C6862B 45%,#5c3a0d) border-box;
          box-shadow:0 22px 46px rgba(0,0,0,.6), inset 0 0 40px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,231,179,.18)}
        .cab-numboard::before{content:"";position:absolute;inset:6px;border-radius:18px;border:1px solid rgba(245,209,134,.16);pointer-events:none}
        .cab-rivet{position:absolute;width:7px;height:7px;border-radius:999px;background:radial-gradient(circle at 35% 30%,#ffe6a8,#8a5a16 70%,#3a2508);box-shadow:0 1px 2px rgba(0,0,0,.6)}
        .cab-numgrid{position:relative;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(4,1fr);gap:10px;flex:1;min-height:0}
        .cab-numcell{position:relative;display:grid;place-items:center;border-radius:16px;font-weight:900;font-variant-numeric:tabular-nums;font-size:36px;border:1.5px solid;overflow:hidden;transition:background .3s,color .3s,box-shadow .3s,transform .3s}
        .cab-numcell::after{content:"";position:absolute;inset:0 0 55% 0;background:linear-gradient(180deg,rgba(255,255,255,.14),transparent);pointer-events:none}
        .cab-numcell.is-claimed{transform:translateY(-1px)}
        .cab-roster-row{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:12px;border:1px solid transparent;transition:background .2s,border-color .2s;flex:none}
        /* Fixed-height, scrollable roster list — the panel NEVER grows with more players; extra rows
           scroll. Thin amber scrollbar so it's clearly scrollable. */
        .cab-roster-list{scrollbar-width:thin;scrollbar-color:rgba(245,165,36,.55) transparent}
        .cab-roster-list::-webkit-scrollbar{width:5px}
        .cab-roster-list::-webkit-scrollbar-thumb{background:rgba(245,165,36,.55);border-radius:999px}
        .cab-roster-list::-webkit-scrollbar-track{background:transparent}
        .cab-panel-title{font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:900;color:#c8b790}
        @keyframes cab-spin{to{transform:translate(-50%,-50%) rotate(360deg)}}
        @keyframes cab-fade{from{opacity:0;transform:translateY(-50%) translateX(-8px)}to{opacity:1;transform:translateY(-50%) translateX(0)}}
        @keyframes cab-pulse{0%,100%{box-shadow:0 0 0 0 rgba(245,165,36,.5)}50%{box-shadow:0 0 0 6px rgba(245,165,36,0)}}
        @keyframes cab-turn-arrow{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
        @media (prefers-reduced-motion: reduce){[style*="cab-turn-arrow"]{animation:none!important}}
        @media (prefers-reduced-motion: reduce){.cab-ring,.cab-card{animation:none}}
      `}</style>

      <div style={{ position: "relative", width: CONTENT_W, height: STAGE_H, transform: `translateX(${shift}px) scale(${scale})`, transformOrigin: "center center", flex: "none" }}>
        <Rail />

        {/* Player rail */}
        <div role="list" aria-label="Turn order">
          {queue.map((p, i) => {
            const fd = ((i - curIdx) % N + N) % N; // forward distance 0…N-1
            const signed = fd <= N / 2 ? fd : fd - N; // wrap the tail above the apex
            const ghost = lastMove && lastMove.playerId === p.id ? lastMove.count : null;
            return (
              <ArcNode
                key={p.id}
                player={p}
                step={signed + offset}
                seat={seatOf.get(p.id) ?? i + 1}
                isLocal={p.id === myId}
                localCfg={localCfg}
                ghost={ghost}
              />
            );
          })}
        </div>

        {/* Current player's detail card at the apex */}
        {currentPlayer && (
          <CurrentCard
            player={currentPlayer}
            waiting={status === "playing" && currentPlayer.id !== myId ? "Choosing…" : null}
          />
        )}

        {/* ---- Centre zone: themed number board ---- */}

        {/* ---- The NUMBER BOARD — enlarged to fill the open centre (the roster is now a right-edge
             overlay). Its TOP (stage y = ROSTER_TOP) is aligned with the arena roster's head, which the
             parent pins at ROSTER_TOP*scale — so the two panels line up exactly on every screen. ---- */}
        <div style={{ position: "absolute", left: BOARD_X + shiftX, top: ROSTER_TOP, width: BOARD_W, height: ARENA_H }}>

        {/* The serpentine TRACK board — 1…31 threaded by a ribbon with a hopping cow token, heat ramp,
            trap diamonds and a 31 doom cell. It fills the ARENA_H height so it lines up with the arena
            roster top and bottom. Picks are claimed by tapping the glowing tiles on the board. */}
        <NumberBoard
          brand={boardBrand}
          total={count}
          taken={taken}
          picks={myTurn && count < 31 ? tiles.filter((n) => n <= 31 && !taken[n]) : []}
          highlight={
            myTurn
              ? selectedCards
              : selecting && selecting.playerId === currentId
                ? selecting.picks
                : []
          }
          onSelect={onToggleCard}
          myTurn={myTurn}
          ticker={
            spectatorMessage ??
            (myTurn
              ? "Tap the glowing tiles — claim 1, 2 or 3."
              : currentPlayer && status === "playing"
                ? `${currentPlayer.name} is choosing…`
                : "")
          }
        />

        </div>
        {/* ---- end number board row ---- */}

        {/* ---- ARENA roster — a fixed part of the composition, a gap to the RIGHT of the board, so the
             whole arc + board + roster group scales and centres as one unit on every screen. ---- */}
        <div style={{ position: "absolute", left: ROSTER_X, top: ROSTER_TOP, width: ROSTER_W, height: ARENA_H }}>
          <ArenaRoster
            players={players}
            currentId={currentId}
            myId={myId}
            status={status as "waiting" | "playing" | "over"}
            style={{ width: "100%", height: "100%", pointerEvents: "auto" }}
            sponsor={rosterSponsor}
            rosterStyle={rosterStyle}
          />
        </div>

        {/* Countdown timer cow is now rendered by the parent (CountDown31) as an OVERLAY above the
            board's top-right, OUTSIDE the clipped board area, so it can rise above the board with its
            head fully visible instead of being cut off by the board boundary. */}

        {/* Number picker / waiting state / join. */}
        <div style={{ position: "absolute", left: BOARD_X + shiftX, top: ROSTER_TOP + ARENA_H + 12, width: BOARD_W }}>
          {showJoin ? (
            /* Play/"Tap to take a seat" button removed for now — it will be re-added elsewhere. */
            null
          ) : currentPlayer && status === "playing" ? (
            <>
              {/* The turn header (whose turn + remaining seconds) was removed — the TurnIndicator
                  overlay now announces the turn (cyan "YOUR TURN" sweep + frame breathe + panic
                  timer), and the board ticker already shows "X is choosing…", so this strip below
                  the board is redundant. Only the submit bar remains on your turn. */}

              {/* Claimable numbers are chosen by tapping the glowing tiles ON the board above; here we
                  keep only the submit bar (your turn) or the live status line (others' turns). */}
              {myTurn ? (
                <>
                  <button type="button" className="cab-submit" disabled={selectedCards.length === 0} onClick={onConfirmMove}>
                    <Send size={18} />
                    {selectedCards.length === 0 ? "Pick your numbers" : `Submit ${selectedCards.length} number${selectedCards.length > 1 ? "s" : ""}`}
                  </button>

                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderRadius: 16, border: "1px solid rgba(245,165,36,.2)", background: "rgba(8,7,5,.55)" }}>
                  <Flame size={14} style={{ color: C.ember }} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.mute, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {spectatorMessage ?? `${currentPlayer.name} is claiming from ${count + 1}${count + 1 >= 31 ? "" : "–" + Math.min(31, count + 3)}`}
                  </span>
                </div>
              )}
            </>
          ) : spectatorMessage ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "18px 20px",
                borderRadius: 18,
                border: "1px solid rgba(242,86,75,.35)",
                background: "rgba(30,8,8,.55)",
              }}
            >
              <Users size={20} style={{ color: C.ember }} />
              <div style={{ fontSize: 14, fontWeight: 800, color: C.bone }}>{spectatorMessage}</div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "18px 20px",
                borderRadius: 18,
                border: "1px solid rgba(245,165,36,.25)",
                background: "rgba(8,7,5,.6)",
              }}
            >
              <Crown size={20} style={{ color: C.gold }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.bone }}>
                  {currentPlayer ? `${currentPlayer.name} is choosing…` : "Waiting for the next cow…"}
                </div>
                <div style={{ fontSize: 12, color: C.mute, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <Flame size={12} style={{ color: C.ember }} /> Their pick stays hidden until they submit.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Callbacks and objects are stabilised at the call site in CountDown31; see the note above. */
export const ClassicArcBoard = memo(ClassicArcBoardImpl);
ClassicArcBoard.displayName = "ClassicArcBoard";
