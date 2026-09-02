"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Trophy } from "lucide-react";

// The sealed draw + roster shape returned by GET /promo-tournaments/:id/roster.
export interface WheelDraw {
  mode: "grand" | "simple";
  total: number;
  groupCount: number;
  groupSizes: number[];
  groupIndex: number;
  reel: { id: string; name: string }[];
  winnerSlot: number;
  winner: { id: string; name: string } | null;
  hash: string;
}

const COW = ["🐄", "🐮", "🐂", "🐃"];
const BANDS = ["#1f6e46", "#2a8a58", "#f4b942", "#c9820f", "#2a8a58", "#1f6e46"];
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * The Grand Starting Wheel kickoff ceremony. For large fields (>24) it's two-stage — a wheel of up
 * to 31 groups lands on one, which then explodes into a name-reel that decelerates to the spotlight
 * cow. For small fields it's a single one-slice-per-player wheel. The result is SEALED server-side
 * (see `draw.hash`) so the animation only plays toward the pre-decided, identical-for-everyone
 * outcome. Calls `onComplete` once the reveal finishes (or immediately if there's no field).
 */
export function StartingWheel({ draw, onComplete }: { draw?: WheelDraw; onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef(-Math.PI / 2);
  const ranRef = useRef(false);
  const doneRef = useRef(false);
  const [phase, setPhase] = useState<"loading" | "wheel" | "reel" | "done">("loading");
  const [status, setStatus] = useState("Sealing the draw for every player…");

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  useEffect(() => {
    if (!draw || ranRef.current) return;
    ranRef.current = true;

    // No entrants → nothing to draw, go straight in.
    if (draw.total === 0 || !draw.winner) {
      finish();
      return;
    }

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const R = canvas.width / 2;
    const slices = draw.mode === "grand" ? draw.groupCount : draw.reel.length;
    const seg = (Math.PI * 2) / slices;

    function drawWheel() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(R, R);
      for (let i = 0; i < slices; i++) {
        const a0 = rotRef.current + i * seg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, R - 6, a0, a0 + seg);
        ctx.closePath();
        const band = BANDS[i % BANDS.length]!;
        ctx.fillStyle = band;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(4,9,6,.9)";
        ctx.stroke();
        // Label — only when slices are few enough to read.
        if (slices <= 40) {
          ctx.save();
          ctx.rotate(a0 + seg / 2);
          ctx.textAlign = "right";
          const dark = band === "#f4b942" || band === "#c9820f";
          ctx.fillStyle = dark ? "#241701" : "#eafff2";
          if (draw!.mode === "grand") {
            ctx.font = "700 13px system-ui";
            ctx.fillText("G" + (i + 1), R - 20, 4);
            ctx.font = "600 9px system-ui";
            ctx.globalAlpha = 0.8;
            ctx.fillText((draw!.groupSizes[i] ?? 0) + "p", R - 20, 17);
          } else {
            const nm = draw!.reel[i]?.name?.split(" ")[0] ?? "";
            ctx.font = "700 11px system-ui";
            ctx.fillText(nm.slice(0, 10), R - 18, 4);
          }
          ctx.restore();
        }
      }
      ctx.restore();
      // Hub.
      ctx.save();
      ctx.translate(R, R);
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      const g = ctx.createLinearGradient(-42, -42, 42, 42);
      g.addColorStop(0, "#ffdf78");
      g.addColorStop(1, "#c9820f");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#04120b";
      ctx.stroke();
      ctx.fillStyle = "#241701";
      ctx.font = "900 26px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("31", 0, 2);
      ctx.restore();
    }

    function spinTo(index: number, turns: number, dur: number) {
      return new Promise<void>((res) => {
        const base = -Math.PI / 2;
        const target = base - (index * seg + seg / 2) - 2 * Math.PI * turns;
        const start = rotRef.current;
        const delta = target - start;
        const t0 = performance.now();
        const frame = (now: number) => {
          const p = Math.min(1, (now - t0) / dur);
          rotRef.current = start + delta * easeOut(p);
          drawWheel();
          if (p < 1) requestAnimationFrame(frame);
          else res();
        };
        requestAnimationFrame(frame);
      });
    }

    function spinReel() {
      return new Promise<void>((res) => {
        const track = trackRef.current!;
        const CARD = 128;
        const reel = draw!.reel;
        const strip: { id: string; name: string }[] = [];
        const LEAD = 42;
        for (let i = 0; i < LEAD; i++) strip.push(reel[(i * 13 + 5) % reel.length]!);
        const landing = strip.length;
        strip.push(reel[draw!.winnerSlot] ?? reel[0]!);
        for (let i = 0; i < 12; i++) strip.push(reel[(i * 7 + 2) % reel.length]!);

        track.innerHTML = "";
        strip.forEach((p, i) => {
          const c = document.createElement("div");
          c.className = "swheel-card";
          const face = COW[(p.name.charCodeAt(0) + i) % COW.length]!;
          c.innerHTML = `<div class="swheel-face">${face}</div><div class="swheel-nm">${p.name}</div>`;
          track.appendChild(c);
        });
        const winW = track.parentElement!.clientWidth;
        const end = -(landing * CARD + CARD / 2 - winW / 2);
        const dur = 3400;
        const t0 = performance.now();
        const frame = (now: number) => {
          const p = Math.min(1, (now - t0) / dur);
          track.style.transform = `translateX(${end * easeOut(p)}px)`;
          if (p < 1) requestAnimationFrame(frame);
          else res();
        };
        requestAnimationFrame(frame);
      });
    }

    (async () => {
      drawWheel();
      await wait(600);
      setPhase("wheel");
      if (draw.mode === "grand") {
        setStatus(`Spinning the field across ${draw.groupCount} groups…`);
        await spinTo(draw.groupIndex, 6, 4200);
        setStatus(`Group ${draw.groupIndex + 1} — ${draw.reel.length} contenders. Zooming in…`);
        await wait(750);
        setPhase("reel");
        await wait(60); // let the reel window mount
        await spinReel();
      } else {
        setStatus(`Spinning ${draw.total} cows…`);
        await spinTo(draw.groupIndex, 6, 4200);
      }
      setStatus("");
      setPhase("done");
      await wait(3600);
      finish();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draw]);

  const winnerName = draw?.winner?.name ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md select-none px-4">
      <style>{`
        .swheel-card{width:128px;flex:0 0 128px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:6px}
        .swheel-face{width:60px;height:60px;border-radius:15px;display:grid;place-items:center;font-size:28px;background:linear-gradient(160deg,#1d3122,#0e1a13);border:1px solid #2b4531}
        .swheel-nm{font-size:12px;font-weight:800;text-align:center;line-height:1.15;color:#f3efe2}
      `}</style>

      <div className="flex flex-col items-center gap-6 text-center w-full max-w-3xl">
        <div className="flex items-center gap-2 text-amber-300 font-title font-black text-base sm:text-lg uppercase tracking-widest">
          <Sparkles size={20} className="fill-yellow-400 text-yellow-400 animate-pulse" />
          <span>{phase === "done" ? "The Grand Draw spotlight" : "Grand Starting Wheel"}</span>
        </div>

        {/* Stage 1 — the group wheel */}
        {phase !== "reel" && phase !== "done" && (
          <div className="relative">
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[15px] border-r-[15px] border-l-transparent border-r-transparent border-t-[24px] border-t-amber-400 drop-shadow-[0_3px_5px_rgba(0,0,0,0.5)]" />
            <canvas
              ref={canvasRef}
              width={460}
              height={460}
              className="rounded-full shadow-[0_0_45px_rgba(245,158,11,0.45)] max-w-[86vw] max-h-[86vw]"
            />
          </div>
        )}

        {/* Stage 2 — the name reel (grand mode) */}
        {phase === "reel" && (
          <div className="w-full">
            <div className="relative h-[150px] overflow-hidden rounded-2xl bg-[#16241a] border border-amber-400/40 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[128px] z-[3] border-x-2 border-amber-400 bg-amber-400/10 shadow-[0_0_24px_rgba(245,158,11,0.25)_inset]" />
              <div ref={trackRef} className="absolute inset-y-0 left-0 flex will-change-transform" />
            </div>
          </div>
        )}

        {/* Reveal */}
        {phase === "done" && draw?.winner && (
          <div className="flex flex-col items-center gap-3 animate-[fadeIn_.5s_ease]">
            <div className="w-24 h-24 rounded-3xl grid place-items-center text-5xl bg-gradient-to-br from-[#1d3122] to-[#0e1a13] border-2 border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.6)]">
              {COW[winnerName.charCodeAt(0) % COW.length]!}
            </div>
            <div className="font-title font-black text-2xl sm:text-3xl text-amber-300 drop-shadow flex items-center gap-2">
              <Trophy size={26} className="text-yellow-400" /> {winnerName}
            </div>
            {draw.mode === "grand" && <div className="text-xs text-emerald-300 font-title font-bold uppercase tracking-widest">Group {draw.groupIndex + 1} · from {draw.total.toLocaleString()} players</div>}
          </div>
        )}

        {status && <div className="text-sm text-slate-300 font-title font-bold min-h-[20px]">{status}</div>}

        <div className="flex flex-col items-center gap-2">
          <div className="text-[10px] text-slate-500 font-title uppercase tracking-widest">
            Sealed result · <span className="text-amber-300/80">{draw?.hash ?? "…"}</span>
          </div>
          {phase === "done" && (
            <button
              onClick={finish}
              className="mt-1 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-400 text-slate-950 font-title font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <Trophy size={16} /> Enter the arena
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
