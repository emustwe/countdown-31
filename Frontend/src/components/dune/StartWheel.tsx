"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// The tournament "starting point" wheel. Every player's name is placed on a wheel, the order is
// shuffled once, then the wheel spins and lands on ONE player — the starting player (already chosen
// by the server). This is a purely cosmetic reveal of who goes first.
interface WheelPlayer {
  name: string;
  color: string;
}

const SIZE = 320;
const R = SIZE / 2;
const CX = R;
const CY = R;
const SPINS = 6; // full turns before landing

// Point on the wheel at angle φ (degrees, clockwise from the top / 12 o'clock).
function pt(phiDeg: number, radius: number): [number, number] {
  const a = ((phiDeg - 90) * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
}
function trunc(s: string, n = 10): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

export function StartWheel({
  players,
  starterIndex,
  onDone,
}: {
  players: WheelPlayer[];
  starterIndex: number;
  onDone: () => void;
}) {
  // Shuffle the seating order once for display; remember where the real starter landed.
  const { display, targetDisplayIndex } = useMemo(() => {
    const idx = players.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j]!, idx[i]!];
    }
    return {
      display: idx.map((i) => players[i]!),
      targetDisplayIndex: Math.max(0, idx.indexOf(starterIndex)),
    };
  }, [players, starterIndex]);

  const n = Math.max(1, display.length);
  const seg = 360 / n;
  const [rot, setRot] = useState(0);
  const [phase, setPhase] = useState<"intro" | "spin" | "result">("intro");
  const doneRef = useRef(false);

  useEffect(() => {
    // Land the target segment's centre under the top pointer, plus SPINS full turns and a little
    // jitter so it feels natural (but still safely inside the segment).
    const center = targetDisplayIndex * seg + seg / 2;
    const jitter = (Math.random() - 0.5) * seg * 0.5;
    const final = SPINS * 360 - center + jitter;
    const t1 = setTimeout(() => {
      setPhase("spin");
      setRot(final);
    }, 750);
    return () => clearTimeout(t1);
  }, [targetDisplayIndex, seg]);

  function onSpinEnd() {
    if (phase !== "spin" || doneRef.current) return;
    setPhase("result");
    doneRef.current = true;
    setTimeout(onDone, 1600);
  }

  const starter = display[targetDisplayIndex];

  return (
    <div className="startwheel-overlay">
      <div className="startwheel-box">
        <p className="startwheel-eyebrow">STARTING PLAYER</p>
        <h2 className="startwheel-title">
          {phase === "result" ? "Spinning done!" : phase === "spin" ? "Spinning…" : "Shuffling players…"}
        </h2>

        <div className="startwheel-wrap">
          <div className="startwheel-pointer" />
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="startwheel-svg">
            <g
              style={{
                transform: `rotate(${rot}deg)`,
                transformOrigin: "center",
                transition: phase === "spin" ? "transform 4.4s cubic-bezier(0.15,0.85,0.2,1)" : "none",
              }}
              onTransitionEnd={onSpinEnd}
            >
              {display.map((p, i) => {
                const a0 = i * seg;
                const a1 = (i + 1) * seg;
                const [x0, y0] = pt(a0, R - 3);
                const [x1, y1] = pt(a1, R - 3);
                const large = seg > 180 ? 1 : 0;
                const isTarget = phase === "result" && i === targetDisplayIndex;
                const [tx, ty] = pt(a0 + seg / 2, R * 0.62);
                return (
                  <g key={i}>
                    <path
                      d={n === 1 ? `M ${CX} ${CY} m ${-(R - 3)} 0 a ${R - 3} ${R - 3} 0 1 0 ${2 * (R - 3)} 0 a ${R - 3} ${R - 3} 0 1 0 ${-2 * (R - 3)} 0` : `M ${CX} ${CY} L ${x0} ${y0} A ${R - 3} ${R - 3} 0 ${large} 1 ${x1} ${y1} Z`}
                      fill={p.color}
                      fillOpacity={isTarget ? 0.95 : 0.62}
                      stroke="rgba(0,0,0,0.35)"
                      strokeWidth={1.5}
                    />
                    <text
                      x={tx}
                      y={ty}
                      transform={`rotate(${a0 + seg / 2} ${tx} ${ty})`}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={n > 9 ? 10 : 12}
                      fontWeight={700}
                      fill="#0d0a16"
                    >
                      {trunc(p.name)}
                    </text>
                  </g>
                );
              })}
              <circle cx={CX} cy={CY} r={22} fill="#12100a" stroke="rgba(255,255,255,0.3)" strokeWidth={2} />
            </g>
          </svg>
        </div>

        <div className={`startwheel-result ${phase === "result" ? "show" : ""}`} style={{ ["--sc" as string]: starter?.color }}>
          {phase === "result" && starter ? (
            <>
              <b>{starter.name}</b> starts the tournament!
            </>
          ) : (
            <span>&nbsp;</span>
          )}
        </div>
      </div>
    </div>
  );
}
