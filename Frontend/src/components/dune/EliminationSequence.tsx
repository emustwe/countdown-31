"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MasterAvatar } from "./MasterAvatar";
import type { LiveReason } from "../../lib/hooks/useCountdownLive";

/**
 * The 4.6s cinematic ELIMINATION sequence — a faithful port of elimination.html. It plays on EVERY
 * player elimination, showing the eliminated player's own avatar + name + reason. Driven entirely by
 * one `.run` class on the root plus CSS animation-delays (no JS timeline). Two timers: `exit` at
 * 4000ms (card falls away), `done` at 4600ms (resume play). Wrapped in prefers-reduced-motion.
 */

const REASON_TEXT: Record<LiveReason, string> = {
  "31": "Took 31 · Knocked out",
  timeout: "Timed out · Auto-played",
  left: "Left the arena",
  repeat: "Repeated the count · Out",
  over3: "Overshot 31 · Out",
  skip: "Skipped the turn · Out",
};

// Fixed ember spread (no randomness) so the signature moment looks identical every time.
const EMBERS = [-96, -72, -48, -24, -6, 14, 34, 58, 82, 104, -120, 126];

export type EliminationSequenceProps = {
  name: string;
  avatar?: Record<string, string>;
  color?: string;
  seat?: number;
  reason: LiveReason;
  remaining?: number;
  onDone: () => void;
};

export function EliminationSequence({ name, avatar, color, seat, reason, remaining, onDone }: EliminationSequenceProps) {
  const [mounted, setMounted] = useState(false);
  const [run, setRun] = useState(false);
  const [exit, setExit] = useState(false);
  // Centre the whole cinematic on the GAME BOARD, not the viewport (measured at trigger time).
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const detonate = reason === "31"; // a timeout etc. never exploded → skip the tile-31 shockwave

  useEffect(() => {
    setMounted(true);
    const board = document.querySelector(".nb-stage");
    if (board) {
      const r = board.getBoundingClientRect();
      // On landscape phones the board is short, so nudge the cinematic a little DOWN to sit centred.
      const downOnMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 1180px)").matches ? 30 : 0;
      setCenter({ x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) + downOnMobile });
    }
  }, []);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setRun(true));
    const t1 = setTimeout(() => setExit(true), 4000);
    const t2 = setTimeout(() => onDoneRef.current(), 4600);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!mounted || typeof document === "undefined") return null;

  const node = (
    <div
      className={`elim-root ${run ? "run" : ""} ${exit ? "exit" : ""}`}
      aria-live="polite"
      style={center ? ({ "--cx": center.x + "px", "--cy": center.y + "px" } as React.CSSProperties) : undefined}
    >
      <style>{ELIM_CSS}</style>

      <div className="elim-curtain" />

      {detonate && <span className="elim-ring" style={{ "--d": ".14s" } as React.CSSProperties} />}
      <span className="elim-ring" style={{ "--d": ".74s", borderColor: "#FFD98A" } as React.CSSProperties} />
      <span className="elim-ring" style={{ "--d": "1.46s" } as React.CSSProperties} />

      <div className="elim-dust" />

      <div className="elim-card">
        <div className="elim-face" style={color ? ({ "--own": color } as React.CSSProperties) : undefined}>
          {seat != null && seat > 0 && <span className="elim-badge">{seat}</span>}
          <div className="elim-ava">
            <MasterAvatar config={avatar} className="h-full w-full" />
          </div>
          <svg className="elim-cracks" viewBox="0 0 158 158" aria-hidden="true">
            <path style={{ "--d": ".78s" } as React.CSSProperties} d="M79 4 L72 46 L92 70 L78 104 L86 154" />
            <path style={{ "--d": ".86s" } as React.CSSProperties} d="M72 46 L26 38" />
            <path style={{ "--d": ".92s" } as React.CSSProperties} d="M92 70 L152 58" />
            <path style={{ "--d": ".98s" } as React.CSSProperties} d="M78 104 L20 118" />
            <path style={{ "--d": "1.04s" } as React.CSSProperties} d="M92 70 L108 118 L150 132" />
          </svg>
          {EMBERS.map((x, i) => (
            <span
              key={i}
              className="elim-ember"
              style={{ "--x": x + "px", "--d": 1.5 + i * 0.07 + "s" } as React.CSSProperties}
            />
          ))}
        </div>

        <div className="elim-name">{name}</div>
        <div className="elim-reason">{REASON_TEXT[reason] ?? "Out"}</div>
        <div>
          <span className="elim-stamp">Eliminated</span>
        </div>
        {remaining != null && (
          <div className="elim-tally">
            Cows remaining · <b>{remaining}</b>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

const ELIM_CSS = `
.elim-root{position:fixed;inset:0;z-index:220;pointer-events:none;overflow:hidden;
  font-family:"Baloo 2","Fredoka",ui-rounded,system-ui,sans-serif;color:#F3EEE4;font-variant-numeric:tabular-nums}

.elim-curtain{position:absolute;inset:0;opacity:0;transition:opacity .45s ease;
  background:radial-gradient(46% 52% at var(--cx,50%) var(--cy,50%),rgba(120,14,8,.4),transparent 70%),
    radial-gradient(120% 120% at 50% 50%,transparent 26%,rgba(4,6,5,.94) 82%)}
.elim-root.run .elim-curtain{opacity:1;transition-delay:.32s}
.elim-root.exit .elim-curtain{opacity:0;transition-delay:0s}

.elim-ring{position:absolute;left:var(--cx,50%);top:var(--cy,50%);border-radius:50%;border:2px solid #FF4A3D;transform:translate(-50%,-50%);opacity:0}
.elim-root.run .elim-ring{animation:elim-ring 1s cubic-bezier(.15,.8,.3,1) forwards;animation-delay:var(--d,0s)}
@keyframes elim-ring{0%{width:20px;height:20px;opacity:.95}100%{width:1500px;height:1500px;opacity:0;border-width:.5px}}

.elim-dust{position:absolute;left:var(--cx,50%);top:calc(var(--cy,50%) - 46px);width:220px;height:66px;transform:translate(-50%,-50%);opacity:0;
  background:radial-gradient(50% 50% at 50% 50%,rgba(255,217,138,.5),transparent 70%);filter:blur(6px)}
.elim-root.run .elim-dust{animation:elim-dust .7s ease-out .74s forwards}
@keyframes elim-dust{0%{opacity:.9;transform:translate(-50%,-50%) scale(.3)}100%{opacity:0;transform:translate(-50%,-58%) scale(1.9)}}

.elim-card{position:absolute;left:var(--cx,50%);top:var(--cy,50%);width:430px;max-width:86vw;text-align:center;
  transform:translate(-50%,-50%) scale(.9);opacity:0}
.elim-root.run .elim-card{animation:elim-cardIn .42s cubic-bezier(.2,1.3,.35,1) .46s forwards}
@keyframes elim-cardIn{to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.elim-root.exit .elim-card{animation:elim-cardOut .5s cubic-bezier(.5,0,.75,0) forwards}
@keyframes elim-cardOut{to{opacity:0;transform:translate(-50%,-30%) scale(.86) rotate(3deg)}}

.elim-face{position:relative;width:158px;height:158px;margin:0 auto;border-radius:34px;padding:4px;
  background:linear-gradient(140deg,#FFD98A,#F5A524,#35D6E8,#FFD98A);
  box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 60px rgba(245,165,36,.3)}
.elim-root.run .elim-face{animation:elim-fly .44s cubic-bezier(.2,1.15,.35,1) .46s backwards,elim-drain 1s ease-out 2.05s forwards}
@keyframes elim-fly{0%{transform:translate(-420px,90px) scale(.32) rotate(-18deg);opacity:0}55%{opacity:1}100%{transform:none;opacity:1}}
@keyframes elim-drain{to{filter:grayscale(1) brightness(.55);box-shadow:0 20px 60px rgba(0,0,0,.7),0 0 0 rgba(245,165,36,0)}}
.elim-ava{width:100%;height:100%;border-radius:30px;overflow:hidden;background:radial-gradient(120% 120% at 32% 20%,#2B3A2D,#0A0F0B)}

.elim-cracks{position:absolute;inset:0;pointer-events:none}
.elim-cracks path{stroke:#0A0F0B;stroke-width:3;fill:none;stroke-linecap:round;stroke-dasharray:260;stroke-dashoffset:260;filter:drop-shadow(0 0 2px rgba(255,255,255,.35))}
.elim-root.run .elim-cracks path{animation:elim-crack .5s cubic-bezier(.2,.9,.3,1) forwards;animation-delay:var(--d,.78s)}
@keyframes elim-crack{to{stroke-dashoffset:0}}

.elim-badge{position:absolute;top:-10px;left:-10px;min-width:30px;height:30px;padding:0 8px;border-radius:10px;display:grid;place-items:center;
  font-size:14px;font-weight:800;background:#F5A524;color:#3A2405;overflow:hidden;z-index:3}
.elim-badge::after{content:"";position:absolute;left:-2px;right:-2px;top:50%;height:3px;background:#3A2405;transform:scaleX(0);transform-origin:left;border-radius:2px}
.elim-root.run .elim-badge{animation:elim-badgeGrey .5s ease 2.05s forwards}
.elim-root.run .elim-badge::after{animation:elim-strike .3s cubic-bezier(.2,.9,.3,1) 2.15s forwards}
@keyframes elim-badgeGrey{to{background:#5A6A5E;color:#0D140F}}
@keyframes elim-strike{to{transform:scaleX(1)}}

.elim-name{margin-top:22px;font-size:38px;font-weight:800;letter-spacing:-.02em;line-height:1.05;opacity:0;transform:translateY(16px)}
.elim-root.run .elim-name{animation:elim-rise .45s cubic-bezier(.2,1.2,.3,1) 1s forwards}
.elim-reason{margin-top:8px;font-size:13px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#FF4A3D;opacity:0;transform:translateY(10px)}
.elim-root.run .elim-reason{animation:elim-rise .45s cubic-bezier(.2,1.2,.3,1) 1.14s forwards}
@keyframes elim-rise{to{opacity:1;transform:none}}

.elim-stamp{margin:20px auto 0;display:inline-block;padding:11px 30px;border-radius:14px;border:3px solid #FF4A3D;color:#FFD9D5;
  background:rgba(120,14,8,.28);font-size:24px;font-weight:800;letter-spacing:.3em;text-transform:uppercase;
  opacity:0;transform:scale(3.4) rotate(-16deg);filter:blur(7px)}
.elim-root.run .elim-stamp{animation:elim-slam .34s cubic-bezier(.2,1.1,.3,1) 1.45s forwards,elim-stampShake .3s ease-out 1.79s}
@keyframes elim-slam{to{opacity:1;transform:scale(1) rotate(-4deg);filter:blur(0)}}
@keyframes elim-stampShake{25%{transform:scale(1.03) rotate(-2.4deg)}60%{transform:scale(.99) rotate(-5deg)}100%{transform:scale(1) rotate(-4deg)}}

.elim-tally{margin-top:22px;font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#8B9A8F;opacity:0}
.elim-tally b{color:#FFD98A;font-size:16px;display:inline-block;min-width:16px}
.elim-root.run .elim-tally{animation:elim-rise .4s ease 2.3s forwards}
.elim-root.run .elim-tally b{animation:elim-tick .5s cubic-bezier(.2,1.6,.3,1) 2.5s}
@keyframes elim-tick{0%{transform:translateY(-14px) scale(1.5);color:#FF4A3D}60%{transform:translateY(2px) scale(.94)}100%{transform:none}}

.elim-ember{position:absolute;left:var(--cx,50%);top:var(--cy,50%);width:5px;height:5px;border-radius:50%;background:#F5A524;
  box-shadow:0 0 10px 3px rgba(245,165,36,.6);opacity:0;pointer-events:none}
.elim-root.run .elim-ember{animation:elim-ember 1.7s ease-out forwards;animation-delay:var(--d,1.5s)}
@keyframes elim-ember{0%{opacity:0;transform:translate(-50%,-50%)}12%{opacity:1}100%{opacity:0;transform:translate(calc(-50% + var(--x,0px)),calc(-50% - 260px)) scale(.2)}}

@media (prefers-reduced-motion:reduce){
  .elim-root.run .elim-ring,.elim-root.run .elim-ember,.elim-root.run .elim-stamp,.elim-root.run .elim-face,
  .elim-root.run .elim-cracks path,.elim-root.run .elim-dust,.elim-root.run .elim-tally b{animation:none!important}
  .elim-root.run .elim-card{opacity:1;transform:translate(-50%,-50%)}
  .elim-root.run .elim-name,.elim-root.run .elim-reason,.elim-root.run .elim-tally{opacity:1;transform:none}
  .elim-root.run .elim-stamp{opacity:1;transform:none;filter:none}
}
`;
