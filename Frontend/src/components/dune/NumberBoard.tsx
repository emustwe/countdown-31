"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";

/**
 * The 31 number board — a serpentine TRACK (not a grid), ported EXACTLY from board.html.
 *
 * Three colours, ever: gold = the ribbon/token (progress), cyan = claimable now, red = 31. There is
 * NO per-player tint on the board — a taken tile is SPENT (dark, sunk, dimmed), never coloured by its
 * owner; who took a number is the arena panel's job. The board only answers "what's left, what can I
 * take, how close is 31". Presentational: a tile click only calls onSelect; the parent submits.
 */

const MAX = 3;
const GOAL = 31;
const CLAIM = "#35D6E8";
const col = (n: number) => {
  const r = Math.floor((n - 1) / 8),
    i = (n - 1) % 8;
  return (r % 2 ? 7 - i : i) + 1;
};
const row = (n: number) => Math.floor((n - 1) / 8) + 1;
const isTrap = (n: number) => n % 4 === 2; // 2,6,10,14,18,22,26,30 — never labelled

export type NumberBoardProps = {
  total: number; // current running count 0–31
  taken: Record<number, string>; // which numbers are spent (value unused — no owner colour on the board)
  picks: number[]; // claimable numbers on YOUR turn — clickable only, NOT coloured until selected
  highlight: number[]; // the numbers ACTUALLY selected right now (yours, or another player's live pick)
  onSelect: (n: number) => void;
  myTurn: boolean; // tiles are only clickable on your own turn
  ticker?: string; // flavour line under the board
  /** AD SURFACE (optional) — a sponsor's mark ghosted onto the board felt, behind the tiles, a brand
   *  tint on the cabinet frame, and optional custom artwork replacing the felt entirely.
   *  Omitted → the board renders exactly as before. */
  brand?: {
    logoUrl?: string;
    name?: string;
    color?: string;
    watermark?: boolean; // default true
    watermarkOpacity?: number; // default .14
    boardImage?: string; // custom felt artwork
    boardStyle?: "felt" | "slate" | "midnight" | "brand"; // surface look
    tileStyle?: "classic" | "flat" | "outline" | "solid"; // number-tile look
  } | null;
};

export function NumberBoard({ total, taken, picks, highlight, onSelect, myTurn, ticker, brand }: NumberBoardProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const ribbonRef = useRef<SVGSVGElement | null>(null);
  const tokenRef = useRef<HTMLDivElement | null>(null);
  const totalRef = useRef<HTMLElement | null>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const prevTotal = useRef(0);
  const nums = useMemo(() => Array.from({ length: 31 }, (_, i) => i + 1), []);

  // ---- geometry from MEASURED DOM (offset coords → correct inside the scaled arena stage) ----
  const paintRibbon = useCallback(() => {
    const run = ribbonRef.current?.querySelector<SVGPathElement>(".nb-run");
    if (!run) return;
    const L = run.getTotalLength();
    run.setAttribute("stroke-dasharray", String(L));
    run.setAttribute("stroke-dashoffset", String(L * (1 - Math.max(0, Math.min(1, total / GOAL)))));
  }, [total]);

  const placeToken = useCallback((n: number, hop: boolean) => {
    const track = trackRef.current;
    const token = tokenRef.current;
    if (!track || !token) return;
    const el = tileRefs.current[n > 0 ? n : 1];
    if (!el) return;
    const size = Math.max(28, Math.min(el.offsetWidth, el.offsetHeight) * 0.82);
    token.style.width = size + "px";
    token.style.height = size + "px";
    const cx = track.offsetLeft + el.offsetLeft + el.offsetWidth / 2 - size / 2;
    const cy = track.offsetTop + el.offsetTop + el.offsetHeight / 2 - size / 2;
    token.style.transform = `translate(${cx}px,${cy}px)`;
    token.style.opacity = n > 0 ? "1" : ".4";
    if (hop) {
      token.classList.remove("nb-hop");
      void token.offsetWidth;
      token.classList.add("nb-hop");
    }
  }, []);

  const relayout = useCallback(() => {
    const track = trackRef.current;
    const ribbon = ribbonRef.current;
    if (!track || !ribbon || !tileRefs.current[1]) return;
    let d = "";
    for (let n = 1; n <= 31; n++) {
      const el = tileRefs.current[n];
      if (!el) continue;
      const cx = el.offsetLeft + el.offsetWidth / 2;
      const cy = el.offsetTop + el.offsetHeight / 2;
      d += (n === 1 ? "M" : "L") + cx.toFixed(1) + "," + cy.toFixed(1);
    }
    ribbon.style.left = track.offsetLeft + "px";
    ribbon.style.top = track.offsetTop + "px";
    ribbon.setAttribute("width", String(track.clientWidth));
    ribbon.setAttribute("height", String(track.clientHeight));
    ribbon.innerHTML =
      `<path d="${d}" fill="none" stroke="#F5A524" stroke-width="16" opacity=".05" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="none" stroke="#2A3A2E" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path class="nb-run" d="${d}" fill="none" stroke="#F5A524" stroke-width="5" opacity=".9" stroke-linecap="round" stroke-linejoin="round"/>`;
    paintRibbon();
    placeToken(total, false);
  }, [total, paintRibbon, placeToken]);

  useLayoutEffect(() => {
    relayout();
    const ro = new ResizeObserver(() => relayout());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [relayout]);

  // ---- transient flourishes (cyan for a claim / trap, red for 31) fired when the total ADVANCES ----
  const fx = useCallback((n: number, text: string, color: string) => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const el = tileRefs.current[n];
    if (!wrap || !track || !el) return;
    if (wrap.querySelectorAll(".nb-fx").length > 24) wrap.querySelector(".nb-fx")?.remove();
    const x = track.offsetLeft + el.offsetLeft + el.offsetWidth / 2;
    const y = track.offsetTop + el.offsetTop + el.offsetHeight / 2;
    if (text) {
      const f = document.createElement("div");
      f.className = "nb-fx nb-float";
      f.style.cssText = `left:${x}px;top:${y}px;color:${color}`;
      f.textContent = text;
      wrap.appendChild(f);
      setTimeout(() => f.remove(), 1700);
    }
    const bu = document.createElement("div");
    bu.className = "nb-fx nb-burst";
    bu.style.cssText = `left:${x}px;top:${y}px;border-color:${color}`;
    wrap.appendChild(bu);
    setTimeout(() => bu.remove(), 720);
    for (let i = 0; i < 7; i++) {
      const s = document.createElement("div");
      const a = Math.random() * 6.28,
        dist = 26 + Math.random() * 40;
      s.className = "nb-fx nb-spark";
      s.style.cssText = `left:${x}px;top:${y}px;background:${color};transition:transform .7s cubic-bezier(.1,.8,.3,1),opacity .7s`;
      wrap.appendChild(s);
      requestAnimationFrame(() => {
        s.style.transform = `translate(${Math.cos(a) * dist}px,${Math.sin(a) * dist}px) scale(0)`;
        s.style.opacity = "0";
      });
      setTimeout(() => s.remove(), 760);
    }
  }, []);

  useEffect(() => {
    const prev = prevTotal.current;
    if (total > prev) {
      for (let k = prev + 1; k <= total; k++) {
        const el = tileRefs.current[k];
        if (!el) continue;
        el.classList.remove("nb-stamp");
        void el.offsetWidth;
        el.classList.add("nb-stamp");
        setTimeout(() => el.classList.remove("nb-stamp"), 520);
      }
      const tv = totalRef.current;
      if (tv) {
        tv.classList.remove("nb-roll");
        void tv.offsetWidth;
        tv.classList.add("nb-roll");
      }
      placeToken(total, true);
      paintRibbon();
      if (total === GOAL) {
        fx(GOAL, "31", "#FF4A3D");
        const stage = wrapRef.current?.closest(".nb-stage");
        stage?.classList.add("nb-bust");
        setTimeout(() => stage?.classList.remove("nb-bust"), 620);
      } else {
        // Always show how many numbers were claimed: +1 / +2 / +3 (never a "trap" label).
        fx(total, "+" + (total - prev), CLAIM);
      }
    } else if (total < prev) {
      placeToken(total, false);
      paintRibbon();
    }
    prevTotal.current = total;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // cabinet heat + heartbeat cadence (the frame itself warms toward 31)
  const warm = total >= 20 && total < 26;
  const hot = total >= 26;
  const bpm = total >= 28 ? "0.7s" : total >= 24 ? "1.1s" : total >= 18 ? "1.7s" : "2.4s";
  const ko = total >= GOAL;

  return (
    <div
      className={`nb-stage nb-b-${brand?.boardStyle ?? "felt"} nb-t-${brand?.tileStyle ?? "classic"} ${warm ? "nb-warm" : ""} ${hot ? "nb-hot" : ""}`}
      style={
        {
          "--bpm": bpm,
          ...(brand?.color ? { borderColor: `${brand.color}66`, ["--nb-brand" as string]: brand.color } : {}),
          // Custom sponsor artwork can replace the board felt entirely.
          ...(brand?.boardImage
            ? { backgroundImage: `linear-gradient(rgba(6,11,8,.62),rgba(6,11,8,.72)),url('${brand.boardImage}')`, backgroundSize: "cover", backgroundPosition: "center" }
            : {}),
        } as React.CSSProperties
      }
    >
      <style>{NB_CSS}</style>

      {/* AD SURFACE — the sponsor's mark ghosted onto the board felt (behind the tiles, never
          intercepting clicks). This is the arena's largest piece of brand real-estate: players stare
          at this board every single turn. */}
      {brand && brand.watermark !== false && (brand.logoUrl || brand.name) && (
        <div className="nb-brandmark" aria-hidden="true" style={{ opacity: 1 }}>
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" style={{ opacity: brand.watermarkOpacity ?? 0.14 }} />
          ) : (
            <span style={{ color: brand.color ?? "#F5D186", opacity: brand.watermarkOpacity ?? 0.14 }}>{brand.name}</span>
          )}
        </div>
      )}

      {/* header — running total only */}
      <div className="nb-head">
        <div className="nb-count">
          <div className="nb-lab">Running total</div>
          <div className="nb-val">
            <b ref={totalRef}>{total}</b>
            <span>/31</span>
          </div>
        </div>
        <div className="nb-gap" />
      </div>

      {/* the track */}
      <div className="nb-trackwrap" ref={wrapRef}>
        <svg className="nb-ribbon" ref={ribbonRef} aria-hidden="true" />
        <div className="nb-track" ref={trackRef}>
          {nums.map((n) => {
            const isTaken = !!taken[n];
            const doom = n === GOAL;
            // Clickable = a claimable tile on your turn. The 31 ("doom") cell is normally left out of
            // `picks`, but when the count is high enough that reaching 31 is a LEGAL claim (it appears
            // in `picks` — e.g. a forced move at count 30), the player MUST be able to tap it to say 31
            // and end the lap (round finishes → cow dance → fresh count). Without this a trapped player
            // could only time out, which continues the count and never resets it.
            const isClickable = myTurn && !isTaken && picks.includes(n);
            // Coloured = ONLY the numbers actually SELECTED right now (yours, or another player's live pick).
            const isHl = !isTaken && highlight.includes(n);
            const cls = ["nb-t", isTaken ? "nb-taken" : "", doom ? "nb-doom" : "", isClickable ? "nb-click" : "", isHl ? "nb-hl" : ""]
              .filter(Boolean)
              .join(" ");
            return (
              <div
                key={n}
                ref={(el) => {
                  tileRefs.current[n] = el;
                }}
                className={cls}
                style={{ gridColumn: col(n), gridRow: row(n) }}
                onClick={isClickable ? () => onSelect(n) : undefined}
                role={isClickable ? "button" : undefined}
                aria-label={isClickable ? `Claim ${n}` : undefined}
              >
                <span className="nb-n">{n}</span>
                {isTrap(n) && <span className="nb-trap" />}
                {doom && <span className="nb-skull">💀</span>}
              </div>
            );
          })}
        </div>
        <div className="nb-token" ref={tokenRef}>
          <div className="nb-body">🐮</div>
        </div>
      </div>

      {/* footer — ticker + legend */}
      <div className="nb-foot">
        <div className="nb-ticker">{ticker ? <b key={ticker}>{ticker}</b> : <b>&nbsp;</b>}</div>
        <div className="nb-legend">
          <span>
            <i style={{ background: "#2E2210", border: "1px solid rgba(245,165,36,.4)" }} />
            Taken
          </span>
          <span>
            <i style={{ background: "rgba(53,214,232,.4)", border: "1px solid #35D6E8" }} />
            Claim
          </span>
          <span>
            <i style={{ background: "rgba(255,74,61,.4)", border: "1px solid #FF4A3D" }} />
            31 loses
          </span>
        </div>
      </div>

      {/* knockout curtain */}
      <div className={`nb-ko ${ko ? "show" : ""}`} aria-hidden={!ko}>
        <div className="nb-ko-in">
          <div className="nb-ko-big">31</div>
          <div className="nb-ko-sub">knocked out</div>
        </div>
      </div>
    </div>
  );
}

const NB_CSS = `
.nb-stage{position:relative;display:flex;flex-direction:column;height:100%;width:100%;border-radius:22px;padding:12px 14px 10px;
  background:linear-gradient(180deg,rgba(16,24,18,.96),rgba(8,13,10,.98));border:1px solid #243528;
  box-shadow:0 24px 60px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.05);transition:box-shadow .6s ease,border-color .6s ease;color:#F3EEE4;font-variant-numeric:tabular-nums}
/* ---- BOARD SURFACE styles (sponsor-selectable) ---- */
.nb-b-slate{background:linear-gradient(180deg,rgba(30,41,59,.97),rgba(15,23,42,.99))!important;border-color:#33415577}
.nb-b-midnight{background:linear-gradient(180deg,rgba(9,12,28,.98),rgba(3,5,16,.99))!important;border-color:#3b2f7a77}
.nb-b-brand{background:
  radial-gradient(120% 90% at 50% -10%, color-mix(in srgb, var(--nb-brand,#F5C542) 26%, transparent), transparent 62%),
  linear-gradient(180deg, rgba(12,18,14,.96), rgba(5,9,7,.99))!important}
/* ---- NUMBER TILE styles ---- */
.nb-t-flat .nb-t{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.10)!important;box-shadow:none!important}
.nb-t-outline .nb-t{background:transparent!important;border-width:2px!important;
  border-color:color-mix(in srgb, var(--nb-brand,#F5D186) 55%, transparent)!important;box-shadow:none!important}
.nb-t-solid .nb-t{background:color-mix(in srgb, var(--nb-brand,#F5C542) 16%, #0a120c)!important;
  border-color:color-mix(in srgb, var(--nb-brand,#F5C542) 45%, transparent)!important}
/* AD SURFACE: sponsor mark ghosted on the felt — sits under the ribbon/tiles, pointer-events off */
.nb-brandmark{position:absolute;inset:0;z-index:0;display:grid;place-items:center;pointer-events:none;overflow:hidden}
.nb-brandmark img{max-width:56%;max-height:52%;object-fit:contain;opacity:.14;filter:grayscale(.25)}
.nb-brandmark span{font-family:var(--font-title,inherit);font-weight:900;font-size:clamp(28px,7vw,76px);
  letter-spacing:.02em;opacity:.11;text-transform:uppercase;white-space:nowrap}
.nb-warm{border-color:rgba(245,165,36,.4);box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 50px rgba(245,165,36,.1)}
.nb-hot{border-color:rgba(255,74,61,.55);box-shadow:0 24px 60px rgba(0,0,0,.5),0 0 70px rgba(255,74,61,.18)}
.nb-bust{animation:nb-bust .6s cubic-bezier(.36,.07,.19,.97)}
@keyframes nb-bust{10%,90%{transform:translateX(-3px)}20%,80%{transform:translateX(5px)}30%,50%,70%{transform:translateX(-7px)}40%,60%{transform:translateX(7px)}}

.nb-head{display:flex;align-items:flex-end;gap:16px;margin-bottom:10px;flex:none}
.nb-lab{font-size:9px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:#8B9A8F}
.nb-val{display:flex;align-items:baseline;gap:3px;line-height:1}
.nb-val b{font-size:38px;font-weight:800;letter-spacing:-.04em;color:#FFD98A;text-shadow:0 0 24px rgba(245,165,36,.35);display:inline-block}
.nb-val b.nb-roll{animation:nb-roll .42s cubic-bezier(.2,1.4,.3,1)}
@keyframes nb-roll{0%{transform:translateY(10px) scale(.7);opacity:0}60%{transform:translateY(-3px) scale(1.12)}100%{transform:none;opacity:1}}
.nb-val span{font-size:18px;font-weight:800;color:#51604F}
.nb-gap{flex:1}

.nb-trackwrap{position:relative;flex:1;min-height:0;border-radius:16px;padding:12px;overflow:hidden;
  background:radial-gradient(90% 120% at 20% 0%,rgba(53,214,232,.05),transparent 55%),linear-gradient(180deg,#0B120E,#080D0A);border:1px solid #1B2A20}
.nb-trackwrap::after{content:"";position:absolute;top:0;bottom:0;width:44%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.04),transparent);animation:nb-sweep 7.5s ease-in-out infinite;pointer-events:none;z-index:2}
@keyframes nb-sweep{0%{left:-50%}55%,100%{left:110%}}
.nb-ribbon{position:absolute;pointer-events:none;z-index:0}
.nb-track{position:relative;z-index:1;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(4,1fr);gap:9px;height:100%}

.nb-t{position:relative;border-radius:13px;display:grid;place-items:center;font-weight:800;letter-spacing:-.03em;
  color:#93A697;background:linear-gradient(180deg,#141F18,#0B120E);border:1px solid rgba(34,50,40,.6);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 3px 0 #070B08;transition:transform .3s cubic-bezier(.2,.9,.2,1),box-shadow .3s,background .5s,color .4s}
.nb-n{font-size:clamp(16px,4.4vw,30px)}

/* claimed = SPENT: no colour, sinks into the board, numeral dims */
.nb-taken{color:#3E4B42;background:#070C09;border-color:#16211A;box-shadow:inset 0 2px 5px rgba(0,0,0,.7);transform:translateY(3px)}
.nb-stamp{animation:nb-stamp .5s cubic-bezier(.2,1.5,.35,1)}
@keyframes nb-stamp{0%{transform:scale(1.5) rotate(-7deg);filter:brightness(2.4)}55%{transform:scale(.94) rotate(1deg)}100%{transform:none;filter:none}}

/* claimable on your turn — interactive ONLY (pointer + hover); NO persistent highlight, so nothing
   shows on the board except the numbers actually selected */
.nb-click{cursor:pointer}
.nb-click:hover{color:#EAFDFF;background:linear-gradient(180deg,rgba(53,214,232,.16),rgba(53,214,232,.05));border-color:#35D6E8;transform:translateY(-4px) scale(1.04)}
/* coloured = ONLY the numbers ACTUALLY selected right now (yours or another player's live pick) */
.nb-hl{color:#0b1416 !important;background:linear-gradient(180deg,#7FF0FA,#35D6E8) !important;border:2px solid #EAFDFF !important;box-shadow:0 0 0 5px rgba(53,214,232,.18),0 8px 26px rgba(53,214,232,.45) !important;animation:nb-hlpulse 1.4s ease-in-out infinite !important}
@keyframes nb-hlpulse{50%{box-shadow:0 0 0 8px rgba(53,214,232,.1),0 10px 30px rgba(53,214,232,.6)}}

.nb-trap{position:absolute;top:5px;left:5px;width:7px;height:7px;transform:rotate(45deg);border:1.5px solid rgba(245,165,36,.32);border-radius:2px}
.nb-taken .nb-trap{border-color:#2A3A2E;background:transparent}

.nb-doom{color:#FFD9D5;background:radial-gradient(120% 120% at 50% 20%,rgba(255,74,61,.32),rgba(80,12,8,.5));border:2px solid rgba(255,74,61,.6);box-shadow:0 3px 0 #200604;animation:nb-heart var(--bpm,2.4s) ease-in-out infinite}
@keyframes nb-heart{0%,100%{transform:scale(1)}14%{transform:scale(1.06)}28%{transform:scale(1)}42%{transform:scale(1.04)}56%{transform:scale(1)}}
.nb-skull{position:absolute;bottom:2px;font-size:10px;filter:saturate(0) brightness(1.6);opacity:.75}

.nb-token{position:absolute;z-index:3;pointer-events:none;transition:transform .52s cubic-bezier(.34,1.3,.4,1);will-change:transform}
.nb-body{width:100%;height:100%;border-radius:13px;display:grid;place-items:center;
  background:linear-gradient(160deg,#FFF6E4,#E9D6B4);box-shadow:0 6px 16px rgba(0,0,0,.55),0 0 0 3px rgba(245,165,36,.85),0 0 24px rgba(245,165,36,.4)}
.nb-token .nb-body{font-size:clamp(14px,3.4vw,22px)}
.nb-hop .nb-body{animation:nb-hopk .5s ease-out}
@keyframes nb-hopk{0%{transform:translateY(0) scaleY(1)}25%{transform:translateY(-20px) scaleY(1.12)}60%{transform:translateY(0) scaleY(.82)}100%{transform:none}}

.nb-fx{position:absolute;pointer-events:none}
.nb-float{z-index:5;font-size:30px;font-weight:800;letter-spacing:-.02em;transform:translate(-50%,-50%);animation:nb-floatup 1.6s cubic-bezier(.2,.9,.3,1) forwards;text-shadow:0 2px 10px rgba(0,0,0,.55)}
@keyframes nb-floatup{0%{transform:translate(-50%,-50%) scale(.4);opacity:0}18%{transform:translate(-50%,-95%) scale(1.5);opacity:1}62%{transform:translate(-50%,-135%) scale(1.32);opacity:1}100%{transform:translate(-50%,-205%) scale(1);opacity:0}}
.nb-burst{z-index:4;border:2px solid #FFD98A;border-radius:50%;animation:nb-burst .7s ease-out forwards}
@keyframes nb-burst{0%{width:8px;height:8px;opacity:.9;transform:translate(-50%,-50%)}100%{width:130px;height:130px;opacity:0;transform:translate(-50%,-50%)}}
.nb-spark{z-index:4;width:5px;height:5px;border-radius:99px;transform:translate(-50%,-50%)}

.nb-foot{display:flex;align-items:center;gap:12px;margin-top:8px;flex:none}
.nb-ticker{flex:1;height:30px;border-radius:10px;border:1px solid #243528;background:#0A110C;display:flex;align-items:center;padding:0 12px;overflow:hidden}
.nb-ticker b{font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;animation:nb-slidein .45s cubic-bezier(.2,.9,.2,1)}
@keyframes nb-slidein{from{transform:translateX(-12px);opacity:0}}
.nb-legend{display:flex;gap:12px;font-size:8px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#51604F;white-space:nowrap}
.nb-legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:4px;vertical-align:-1px}

.nb-ko{position:absolute;inset:0;z-index:9;border-radius:22px;display:grid;place-items:center;background:radial-gradient(70% 70% at 50% 50%,rgba(120,14,8,.5),rgba(4,6,5,.9));opacity:0;pointer-events:none;transition:opacity .35s}
.nb-ko.show{opacity:1}
.nb-ko-in{text-align:center;transform:scale(.8);transition:transform .5s cubic-bezier(.2,1.5,.3,1)}
.nb-ko.show .nb-ko-in{transform:scale(1)}
.nb-ko-big{font-size:52px;font-weight:800;letter-spacing:-.03em;color:#FFD9D5;text-shadow:0 0 32px rgba(255,74,61,.6)}
.nb-ko-sub{font-size:12px;font-weight:800;letter-spacing:.24em;text-transform:uppercase;color:#FF4A3D;margin-top:4px}

@media (prefers-reduced-motion: reduce){
  .nb-trackwrap::after,.nb-pick,.nb-doom,.nb-stamp,.nb-hop .nb-body,.nb-val b.nb-roll,.nb-ticker b{animation:none !important}
  .nb-token{transition:none}
  .nb-t{transition:background .3s,color .3s}
}
`;
