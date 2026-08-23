"use client";

import { useEffect, useRef } from "react";

// In-game leaderboard styled after the "leaderboard with abstract background" reference: a glowing
// rounded frame with a title pill straddling the top border, abstract diagonal corner shapes +
// sparkles, and rows of [medal/rank] [circular avatar] [name · star rating · score] pills. The
// LAYOUT/design is shared everywhere; only the palette changes per brand (WM vs VA) via CSS vars —
// the reference's blue colours are NOT reused.

export type LbRow = { userId: string; name: string; score: number; isMe: boolean };

const MEDAL = ["🥇", "🥈", "🥉"];
const medal = (i: number) => MEDAL[i] ?? null;
const initials = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";
// Decorative star rating (matches the reference) — leaders get more stars.
const starsFor = (i: number) => Math.max(1, 5 - Math.floor(i * 0.7));

export function GameLeaderboard({
  rows,
  brand,
  collapsed,
  onToggle,
  ko,
  note,
  title,
}: {
  rows: LbRow[];
  brand?: string;
  collapsed: boolean;
  onToggle: () => void;
  ko: boolean;
  note?: string;
  title?: string;
}) {
  const isVA = brand === "VA";
  const ref = useRef<HTMLElement>(null);

  // Match the panel's height to the actual board (.slot-cabinet) beside it, so the two frames are
  // exactly the same height. offsetHeight is the untransformed layout height, so it's unaffected by
  // the arena's fit-to-screen scale.
  useEffect(() => {
    const aside = ref.current;
    const arena = aside?.closest(".match-arena-inner") ?? aside?.closest(".match-arena");
    const cabinet = arena?.querySelector<HTMLElement>(".slot-cabinet");
    if (!aside || !cabinet) return;
    const apply = () => {
      aside.style.height = collapsed ? "" : `${cabinet.offsetHeight}px`;
    };
    const ro = new ResizeObserver(apply);
    ro.observe(cabinet);
    apply();
    return () => ro.disconnect();
  }, [collapsed]);

  return (
    <aside ref={ref} className={`game-lb ${isVA ? "brand-va" : "brand-wm"} ${collapsed ? "collapsed" : ""}`}>
      <span className="lb-bg" aria-hidden="true">
        <span className="lb-shape lb-shape-a" />
        <span className="lb-shape lb-shape-b" />
        <i className="lb-spark lb-spark-a">✦</i>
        <i className="lb-spark lb-spark-b">✦</i>
      </span>
      <button className="lb-title" onClick={onToggle} aria-expanded={!collapsed}>
        <span className="lb-title-text">{title ?? (ko ? "스코어보드" : "SCOREBOARD")}</span>
        <small>{collapsed ? (ko ? "보기" : "show") : ko ? "숨기기" : "hide"}</small>
      </button>
      {!collapsed && (
        <>
        <div className="lb-rows">
          {rows.map((r, i) => (
            <div className={`lb-row ${r.isMe ? "me" : ""}`} key={r.userId}>
              <span className="lb-rank">{medal(i) ?? <b>{i + 1}</b>}</span>
              <span className="lb-avatar">{initials(r.name)}</span>
              <span className="lb-pill">
                <span className="lb-name">
                  {r.name}
                  {r.isMe && <em>{ko ? "나" : "YOU"}</em>}
                </span>
                <span className="lb-stars" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, s) => (
                    <span key={s} className={s < starsFor(i) ? "on" : ""}>
                      ★
                    </span>
                  ))}
                </span>
                <strong className="lb-score">{r.score.toLocaleString()}</strong>
              </span>
            </div>
          ))}
          {rows.length === 0 && <p className="lb-empty">{ko ? "플레이어를 기다리는 중…" : "Waiting for players…"}</p>}
        </div>
        {note && <p className="lb-note">{note}</p>}
        </>
      )}
    </aside>
  );
}
