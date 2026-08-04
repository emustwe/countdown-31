"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, LogIn, Users } from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { useGuestStore } from "../../stores/guest-store";
import { useAuthStore } from "../../stores/auth-store";
import { useCountdownLive, type LiveReason } from "../../lib/hooks/useCountdownLive";
import { playSelect, playTick } from "../../lib/cd31-audio";

// Live, always-on Count Down 31 (practice, multiplayer). The board and turns come from the server
// in real time; anyone can join with a display name (no account). Break a rule and you're out — but
// you can rejoin. Min 2 players; with fewer it waits. Reel + player cards both scroll like reels.
const TARGET = 31;
const TILES = Array.from({ length: TARGET }, (_, i) => i + 1);
const WINDOW = 4; // numbers curving each side of the front 3
const PWINDOW = 2; // player cards each side of the current player
const wrapOffset = (raw: number, n = TARGET): number => raw - n * Math.round(raw / n);
const initials = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "?";

function reasonText(r: LiveReason | undefined): string {
  switch (r) {
    case "over3": return "picked more than 3";
    case "skip": return "skipped a number";
    case "repeat": return "repeated the last count";
    case "timeout": return "ran out of time";
    case "left": return "left";
    default: return "said 31";
  }
}

export function CountDown31() {
  const guestName = useGuestStore((s) => s.username);
  const user = useAuthStore((s) => s.user);
  const [fallback] = useState(() => `Guest ${Math.floor(1000 + Math.random() * 9000)}`);
  const username = user?.fullName || user?.email?.split("@")[0] || guestName || fallback;
  const soundOn = useSettingsStore((s) => s.soundEnabled);
  const { state, myId, submit, rejoin } = useCountdownLive(username);

  const [selected, setSelected] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const prevCount = useRef(0);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const count = state?.count ?? 0;
  const players = state?.players ?? [];
  const status = state?.status ?? "waiting";
  const currentId = state?.currentId ?? null;
  const amIn = !!myId && players.some((p) => p.id === myId);
  const myTurn = status === "playing" && currentId === myId;
  const currentPlayer = players.find((p) => p.id === currentId) ?? null;
  const center = count + 2;
  const remaining = state?.turnEndsAt ? Math.max(0, state.turnEndsAt - now) : 0;
  const curIdx = players.findIndex((p) => p.id === currentId);

  // Reel tick per number as the shared count advances; also clear any stale selection.
  useEffect(() => {
    const delta = count - prevCount.current;
    prevCount.current = count;
    if (delta > 0 && soundRef.current) for (let i = 0; i < delta; i++) window.setTimeout(() => playTick(), i * 95);
    setSelected([]);
  }, [count]);
  useEffect(() => {
    if (!myTurn) setSelected([]);
  }, [myTurn]);

  function toggle(n: number) {
    if (!myTurn) return;
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (soundRef.current) playSelect();
      return [...prev, n];
    });
  }
  function onSubmit() {
    if (!myTurn || selected.length === 0) return;
    submit([...selected]);
    setSelected([]);
  }

  const turnLabel = !state
    ? "Connecting…"
    : status === "waiting"
      ? `Waiting for players… (${players.length}/2)`
      : myTurn
        ? "Your turn!"
        : `${currentPlayer?.name ?? "…"} is playing…`;

  return (
    <div className="cd31">
      <header className="cd31-head">
        <h1>Count Down 31</h1>
        <p>Live practice — anyone can join. Take 1–3 in a row (no skips), never the same amount as the last turn, and never say 31. Break a rule and you&apos;re out (rejoin anytime).</p>
      </header>

      <div className="cd31-score">
        <span className="cd31-score-side you">
          <Users size={15} /> <b>{players.length}</b> playing
        </span>
        <span className="cd31-score-round">Round {state?.round ?? 0}</span>
        <span className="cd31-score-side cpu">
          {state?.lastEliminated ? `${state.lastEliminated.name} out — ${reasonText(state.lastEliminated.reason)}` : "live 24/7"}
        </span>
      </div>

      {/* Number reel (circular, 3D). */}
      <div className="cd31-stage">
        <div className="cd31-stage-inner">
          <div className="cd31-front-box" />
          {TILES.map((n) => {
            const d = wrapOffset(n - center);
            if (Math.abs(d) > WINDOW) return null;
            const ad = Math.abs(d);
            const picked = selected.includes(n);
            const clickable = myTurn && n > count && n <= count + 3;
            let x = 0, ry = 0, z = 0, op = 1;
            if (ad <= 1) {
              x = d * 124;
            } else {
              const s = Math.sign(d);
              const r = ad - 1;
              x = s * (206 + (r - 1) * 66);
              ry = -s * 52;
              z = -r * 78;
              op = Math.max(0.1, 0.75 - (r - 1) * 0.28);
            }
            const cls = ["cd31-tile", "cd31-reel-tile"];
            if (ad <= 1) cls.push("front");
            if (n === TARGET) cls.push("bomb");
            if (n <= count) cls.push("done");
            if (picked) cls.push("picked");
            if (clickable) cls.push("clickable");
            return (
              <span
                key={n}
                className={cls.join(" ")}
                style={{ transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg)`, opacity: op, zIndex: ad <= 1 ? 3 : 1 }}
                role={clickable ? "button" : undefined}
                onClick={clickable ? () => toggle(n) : undefined}
              >
                {n}
              </span>
            );
          })}
        </div>
      </div>

      {/* Turn status + timer + submit. */}
      <div className={`cd31-turn ${myTurn ? "you" : ""}`}>{turnLabel}</div>
      {status === "playing" && (
        <div className={`cd31-timer ${remaining <= 3000 ? "low" : ""}`}>
          <div className="cd31-timer-fill" style={{ transform: `scaleX(${Math.max(0, remaining) / 7000})` }} />
          <span className="cd31-timer-label">
            <Clock size={15} /> {Math.ceil(remaining / 1000)}s
          </span>
        </div>
      )}
      {amIn ? (
        <button className="cd31-submit" disabled={!myTurn || selected.length === 0} onClick={onSubmit}>
          <Check size={18} /> Submit
        </button>
      ) : (
        <button className="cd31-submit" onClick={rejoin}>
          <LogIn size={18} /> {players.length ? "Rejoin the game" : "Join the game"}
        </button>
      )}

      {/* Player cards — a circular reel of everyone in the game, current player centred. */}
      <div className="cd31-proll">
        {players.map((p, i) => {
          const d = curIdx >= 0 ? wrapOffset(i - curIdx, players.length || 1) : i;
          if (Math.abs(d) > PWINDOW) return null;
          const ad = Math.abs(d);
          let x = 0, ry = 0, z = 0, op = 1;
          if (d !== 0) {
            const s = Math.sign(d);
            x = s * (128 + (ad - 1) * 20);
            ry = -s * 34;
            z = -ad * 60;
            op = Math.max(0.3, 0.85 - (ad - 1) * 0.28);
          }
          const isCurrent = status === "playing" && p.id === currentId;
          const cls = ["cd31-pcard"];
          if (isCurrent) cls.push("current");
          if (p.id === myId) cls.push("me");
          return (
            <div
              key={p.id}
              className={cls.join(" ")}
              style={{ transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg)`, opacity: op, zIndex: 10 - ad }}
            >
              <span className="cd31-pcard-ava">{initials(p.name)}</span>
              <b>{p.name}</b>
              <small>{p.id === myId ? "You" : isCurrent ? "Playing" : ""}</small>
            </div>
          );
        })}
        {players.length === 0 && <p className="cd31-proll-empty">No players yet — be the first to join.</p>}
      </div>
    </div>
  );
}
