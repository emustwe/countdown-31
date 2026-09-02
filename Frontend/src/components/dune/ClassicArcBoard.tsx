"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Sparkles, Send, Play, Flame, Users, Dice5, RotateCcw, Zap, Shield, Moon } from "lucide-react";
import { MasterAvatar } from "./MasterAvatar";
import { CowntdownTimerCow } from "./CowntdownTimerCow";
import { useAvatarStore, type AvatarConfig } from "../../stores/avatar-customization-store";
import type { LivePlayer, LastMoveInfo, SkillType, GameMode } from "../../lib/hooks/useCountdownLive";

/* Skill presentation (icon + short label + accent) — matches the rest of the arena. */
const SKILL_META: Record<SkillType, { short: string; icon: typeof Zap; color: string }> = {
  rewind: { short: "Back 2", icon: RotateCcw, color: "#22d3ee" },
  turbo: { short: "Leap 3", icon: Zap, color: "#f59e0b" },
  shield: { short: "Shield", icon: Shield, color: "#c084fc" },
  nudge: { short: "Skip", icon: Moon, color: "#34d399" },
  double: { short: "Force 2", icon: Sparkles, color: "#f472b6" },
};

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

/* ---------------------------------------------------------------- geometry */
const STAGE_W = 1240;
const STAGE_H = 680;
const ARC_RADIUS = 430; // bigger = flatter curve
const ARC_STEP_DEG = 19; // angular gap between two neighbouring players
const ARC_APEX_X = 46; // where the current player sits (left edge inset)

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
      {active && <span className="cab-ring" style={{ width: size + 24, height: size + 24 }} />}
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
function CurrentCard({ player, waiting, skills }: { player: LivePlayer; waiting: string | null; skills?: SkillType[] }) {
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
      <div style={{ fontSize: 26, fontWeight: 800, color: C.bone, lineHeight: 1.1, letterSpacing: "-.01em" }}>{player.name}</div>
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

      {/* Skills mode: show the active player's loadout as small pips. */}
      {skills && skills.length > 0 && (
        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          {skills.map((skill) => {
            const meta = SKILL_META[skill];
            const Icon = meta.icon;
            return (
              <span key={skill} className="cab-skillpip" style={{ color: meta.color, borderColor: `${meta.color}55`, background: `${meta.color}18` }}>
                <Icon size={11} /> {meta.short}
              </span>
            );
          })}
        </div>
      )}
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
  secondsLeft: number;
  turnKey: string | number | null;
  // Skills mode: the same arc board, plus the player's equipped skills as turn actions.
  gameMode: GameMode;
  onSkill: (skill: SkillType) => void;
  skillsLocked: boolean;
  // Real tournaments / test arena: shown in the picker slot while the local player is spectating.
  spectatorMessage?: string | null;
  // Live reveal of the CURRENT (non-local) player's picked numbers, highlighted in their colour so
  // everyone sees the selection as it happens.
  selecting?: { playerId: string; picks: number[]; color: string } | null;
}

/* ------------------------------------------------------------------ stage */
export function ClassicArcBoard({
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
  secondsLeft,
  turnKey,
  gameMode,
  onSkill,
  skillsLocked,
  spectatorMessage,
  selecting,
}: ClassicArcBoardProps) {
  const skillsMode = gameMode === "skills";
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const localCfg = useAvatarStore();

  // Fit the fixed-design stage into whatever space the arena gives us (width AND height).
  useEffect(() => {
    const fit = () => {
      const w = wrapRef.current?.clientWidth ?? STAGE_W;
      const h = wrapRef.current?.clientHeight ?? STAGE_H;
      setScale(Math.min(w / STAGE_W, h / STAGE_H, 1.05));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

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
  const myPlayer = players.find((p) => p.id === myId) ?? null;
  // The local player's equipped skills (skills mode only) — rendered as turn actions in the picker.
  const mySkills: SkillType[] = skillsMode ? myPlayer?.equippedSkills ?? [] : [];

  // The claimed numbers live on the 8×4 board below; the most-recent one is spotlit.
  const maxClaimed = useMemo(() => {
    const keys = Object.keys(taken)
      .map(Number)
      .filter((n) => n >= 1 && n <= 31);
    return keys.length ? Math.max(...keys) : 0;
  }, [taken]);

  // The three next numbers the active player may claim (consecutive from the total).
  const tiles = [count + 1, count + 2, count + 3];
  const isSelected = (num: number) => selectedCards.includes(num);

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
        .cab-submit{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px;border-radius:16px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;cursor:pointer;border:none;color:#062012;background:linear-gradient(90deg,#34d399,#22c55e,#34d399);box-shadow:0 0 25px rgba(52,211,153,.55);transition:filter .15s, transform .1s}
        .cab-submit:hover{filter:brightness(1.08)}
        .cab-submit:active{transform:scale(.98)}
        .cab-submit[disabled]{opacity:.4;filter:grayscale(.5);cursor:not-allowed;box-shadow:none}
        .cab-skill{display:flex;align-items:center;justify-content:center;gap:6px;padding:11px 6px;border-radius:14px;border:1.5px solid;cursor:pointer;user-select:none;transition:transform .12s ease,filter .15s ease}
        .cab-skill:hover:not([disabled]){filter:brightness(1.14)}
        .cab-skill:active:not([disabled]){transform:scale(.96)}
        .cab-skill[disabled]{cursor:not-allowed;filter:grayscale(.55);opacity:.6}
        .cab-skillpip{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;border-radius:999px;border:1px solid;font-size:10px;font-weight:800}
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
        .cab-numgrid{position:relative;display:grid;grid-template-columns:repeat(8,1fr);gap:7px}
        .cab-numcell{position:relative;aspect-ratio:1/1;display:grid;place-items:center;border-radius:12px;font-weight:900;font-variant-numeric:tabular-nums;font-size:27px;border:1.5px solid;overflow:hidden;transition:background .3s,color .3s,box-shadow .3s,transform .3s}
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
        @media (prefers-reduced-motion: reduce){.cab-ring,.cab-card{animation:none}}
      `}</style>

      <div style={{ position: "relative", width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: "center center", flex: "none" }}>
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
            skills={skillsMode ? currentPlayer.equippedSkills : undefined}
          />
        )}

        {/* ---- Centre zone: running total + themed number board ---- */}

        {/* Running total. */}
        <div style={{ position: "absolute", left: 468, top: 26, width: 430, textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: ".2em", textTransform: "uppercase", fontWeight: 800, color: C.mute, marginBottom: 2 }}>
            Running total
          </div>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 10 }}>
            <span className="cab-total" style={{ fontSize: 82, color: count >= 28 ? C.ember : C.goldSoft }}>{count}</span>
            <span className="cab-total" style={{ fontSize: 38, color: C.mute }}>/ 31</span>
          </div>
        </div>

        {/* ---- Board + roster row: the number board and the live player list share the SAME top and
             height (align-items:stretch), so the roster is exactly aligned with the board and sits to
             its far right. The roster scrolls internally when there are more players than fit. ---- */}
        <div style={{ position: "absolute", left: 468, right: 24, top: 156, height: 266, display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: 18 }}>

        {/* The NUMBER BOARD — 1…31 on a felt-green baize under a double brass frame. Claimed numbers
            light up in the taker's colour (most recent spotlit); 31 is the danger 💣 cell. */}
        <div className="cab-numboard" style={{ width: 430, flex: "none" }}>
          <span className="cab-rivet" style={{ top: 11, left: 11 }} />
          <span className="cab-rivet" style={{ top: 11, right: 11 }} />
          <span className="cab-rivet" style={{ bottom: 11, left: 11 }} />
          <span className="cab-rivet" style={{ bottom: 11, right: 11 }} />
          <div className="cab-panel-title" style={{ marginBottom: 11, display: "flex", alignItems: "center", gap: 6, color: "#ffe9be" }}>
            <Dice5 size={14} style={{ color: C.gold }} /> Number board
          </div>
          <div className="cab-numgrid">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => {
              const color = taken[n];
              const claimedCell = !!color;
              const latest = n === maxClaimed;
              const bomb = n === 31;
              return (
                <span
                  key={n}
                  className={`cab-numcell ${claimedCell ? "is-claimed" : ""}`}
                  style={{
                    color: latest ? "#150a06" : claimedCell ? "#fff" : bomb ? "#ff9a8f" : "rgba(233,209,160,.5)",
                    background: latest
                      ? `linear-gradient(160deg,#fff6,${color})`
                      : claimedCell
                        ? `linear-gradient(160deg,${color}66,${color}30)`
                        : bomb
                          ? "linear-gradient(160deg,rgba(120,26,22,.55),rgba(38,8,8,.6))"
                          : "linear-gradient(160deg,rgba(10,26,19,.65),rgba(4,12,9,.8))",
                    borderColor: claimedCell ? `${color}` : bomb ? "rgba(242,86,75,.45)" : "rgba(245,209,134,.14)",
                    boxShadow: latest
                      ? `0 0 18px ${color}, 0 0 0 2px ${color}88`
                      : claimedCell
                        ? `0 2px 8px ${color}55, inset 0 1px 0 rgba(255,255,255,.25)`
                        : "inset 0 2px 6px rgba(0,0,0,.55)",
                    animation: latest ? "cab-pulse 1.6s ease-in-out infinite" : "none",
                  }}
                >
                  {n}
                  {bomb && !claimedCell && (
                    <span style={{ position: "absolute", bottom: 1, right: 3, fontSize: 10, opacity: 0.85 }}>💣</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>

        {/* ---- Live player list (arena roster) — FIXED height (never grows with more players); the
             list scrolls. Aligned with the number board. ---- */}
        <div className="cab-panel" style={{ width: 268, height: "100%", flex: "none", padding: "12px 11px", display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
          <div className="cab-panel-title" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6, flex: "none" }}>
            <Users size={13} style={{ color: C.gold }} /> Arena · {queue.length}/{players.length}
          </div>
          <div className="cab-roster-list" style={{ display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", flex: 1, minHeight: 0, paddingRight: 3 }}>
            {players.map((pl) => {
              const isCur = pl.id === currentId && !pl.eliminated;
              const isMe = pl.id === myId;
              return (
                <div
                  key={pl.id}
                  className="cab-roster-row"
                  style={{
                    background: isCur ? "rgba(245,165,36,.16)" : "rgba(0,0,0,.35)",
                    borderColor: isCur ? "rgba(245,165,36,.6)" : "rgba(255,255,255,.05)",
                  }}
                >
                  <span
                    style={{
                      minWidth: 22,
                      height: 22,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 7,
                      fontFamily: "ui-monospace,Menlo,monospace",
                      fontWeight: 800,
                      fontSize: 11,
                      color: isCur ? "#1b1206" : C.goldSoft,
                      background: isCur ? C.gold : "rgba(8,7,5,.8)",
                      border: `1px solid ${isCur ? C.goldSoft : "rgba(245,165,36,.3)"}`,
                    }}
                  >
                    {seatOf.get(pl.id)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      fontWeight: 800,
                      color: pl.eliminated ? C.mute : isCur ? "#FFE9BE" : C.bone,
                      textDecoration: pl.eliminated ? "line-through" : "none",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {pl.name}
                    {isMe && <span style={{ color: C.cyan, fontWeight: 900 }}> · you</span>}
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: 999, flex: "none", background: pl.eliminated ? "#4b5563" : isCur ? C.gold : "#34d399", boxShadow: isCur ? `0 0 8px ${C.gold}` : "none" }} />
                </div>
              );
            })}
          </div>
        </div>

        </div>
        {/* ---- end board + roster row ---- */}

        {/* Countdown timer cow — pinned to the number board's TOP-RIGHT CORNER (inside the scaled
            stage, so it lands in the exact same spot on desktop and mobile). Perches just above the
            corner so it never covers the counting numbers. */}
        <div style={{ position: "absolute", left: 738, top: 2, width: 172, height: 168, zIndex: 60, pointerEvents: "none" }}>
          <CowntdownTimerCow anchored active={timerActive} isMyTurn={myTurn} secondsLeft={secondsLeft} turnKey={turnKey} />
        </div>

        {/* Number picker / waiting state / join. */}
        <div style={{ position: "absolute", left: 468, top: 452, width: 430 }}>
          {showJoin ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <button type="button" className="cab-join" onClick={onJoin} aria-label={amInAlive ? "Rejoin" : "Join the game"}>
                <Play size={52} style={{ fill: "#1b1206", transform: "translateX(3px)" }} strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: C.goldSoft }}>
                Tap to take a seat
              </span>
            </div>
          ) : currentPlayer && status === "playing" ? (
            <>
              {/* Turn header — always shows WHOSE turn it is + their remaining seconds, so every player
                  sees the live turn. */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: skillsMode ? 8 : 12 }}>
                {myTurn ? <Sparkles size={16} style={{ color: C.gold }} /> : <Crown size={16} style={{ color: C.gold }} />}
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 900, letterSpacing: ".06em", textTransform: "uppercase", color: C.bone, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {myTurn ? (skillsMode ? "Your turn — claim numbers or use a skill" : "Your turn — claim 1, 2, or 3") : `${currentPlayer.name} is choosing…`}
                </span>
                {secondsLeft > 0 && (
                  <span style={{ fontSize: 15, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: secondsLeft <= 3 ? C.ember : C.goldSoft }}>{secondsLeft}s</span>
                )}
              </div>

              {/* The three claimable numbers — ALWAYS visible (every turn). Interactive on your own turn;
                  read-only on everyone else's so all players see the numbers in play. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: skillsMode ? 10 : 14 }}>
                {tiles.map((num) => {
                  const overshoot = num > 31;
                  const selected = myTurn && isSelected(num);
                  // Live reveal: the CURRENT (other) player's picks, lit in THEIR colour so everyone
                  // sees the same selection feedback the local player gets in gold.
                  const revealHit =
                    !myTurn && !!selecting && selecting.playerId === currentId && selecting.picks.includes(num);
                  const rc = revealHit ? selecting!.color : null;
                  return (
                    <button
                      key={num}
                      type="button"
                      disabled={!myTurn || overshoot}
                      onClick={myTurn ? () => onToggleCard(num) : undefined}
                      className="cab-tile"
                      aria-pressed={selected || revealHit}
                      style={{
                        height: skillsMode ? 82 : 100,
                        fontSize: skillsMode ? 34 : 40,
                        color: selected ? "#0b0906" : revealHit ? "#0b0906" : num >= 31 ? C.ember : C.bone,
                        background: selected
                          ? "linear-gradient(160deg,#FFD98A,#F5A524)"
                          : revealHit
                            ? `linear-gradient(160deg, ${rc}, ${rc})`
                            : myTurn
                              ? "linear-gradient(160deg,rgba(40,33,18,.95),rgba(12,10,6,.95))"
                              : "linear-gradient(160deg,rgba(26,22,12,.82),rgba(8,7,4,.88))",
                        borderColor: selected ? C.goldSoft : revealHit ? rc! : myTurn ? "rgba(245,165,36,.3)" : "rgba(245,165,36,.15)",
                        boxShadow: selected ? "0 12px 30px rgba(245,165,36,.45)" : revealHit ? `0 12px 30px ${rc}66` : "none",
                        cursor: myTurn ? "pointer" : "default",
                        opacity: overshoot ? 0.4 : 1,
                      }}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              {myTurn ? (
                <>
                  <button type="button" className="cab-submit" disabled={selectedCards.length === 0} onClick={onConfirmMove}>
                    <Send size={18} />
                    {selectedCards.length === 0 ? "Pick your numbers" : `Submit ${selectedCards.length} number${selectedCards.length > 1 ? "s" : ""}`}
                  </button>

                  {/* Skills mode: the player's equipped skills as alternative turn actions. */}
                  {skillsMode && mySkills.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${mySkills.length},1fr)`, gap: 10, marginTop: 10 }}>
                      {mySkills.map((skill) => {
                        const meta = SKILL_META[skill];
                        const Icon = meta.icon;
                        const uses = myPlayer?.skills?.[skill] ?? 0;
                        const disabled = uses <= 0 || skillsLocked;
                        return (
                          <button
                            key={skill}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSkill(skill)}
                            className="cab-skill"
                            aria-label={`Use ${meta.short}`}
                            style={{
                              borderColor: disabled ? "rgba(120,120,120,.3)" : `${meta.color}88`,
                              color: disabled ? C.mute : meta.color,
                              background: disabled
                                ? "linear-gradient(160deg,rgba(20,20,20,.7),rgba(8,8,8,.8))"
                                : `linear-gradient(160deg,${meta.color}22,rgba(8,10,7,.85))`,
                            }}
                          >
                            <Icon size={17} className="shrink-0" />
                            <span style={{ fontSize: 12, fontWeight: 900 }}>{meta.short}</span>
                            <span style={{ fontSize: 10, fontWeight: 800, opacity: 0.8 }}>×{uses}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
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
