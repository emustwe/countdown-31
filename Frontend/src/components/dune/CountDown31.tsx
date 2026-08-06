"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Clock, Crown, LogIn, Users } from "lucide-react";
import { useSettingsStore } from "../../stores/settings-store";
import { useGuestStore } from "../../stores/guest-store";
import { useAuthStore } from "../../stores/auth-store";
import { useCosmetics } from "../../lib/hooks/useSponsors";
import { useCountdownLive, type LiveReason } from "../../lib/hooks/useCountdownLive";
import { playSelect, playTick } from "../../lib/cd31-audio";
import { AvatarThumb } from "./Avatar";

// Live Count Down 31. Home uses the always-on "practice" room; a tournament passes its own room
// ("tour:<id>") which runs in KNOCKOUT mode (an elimination is permanent; the field shrinks to one
// winner). The board, turns, player cards and per-player colours all come from the server.
const TARGET = 31;
const TILES = Array.from({ length: TARGET }, (_, i) => i + 1);
const WINDOW = 3; // numbers each side of the front (3 previous + current + 3 next)
const PWINDOW = 5; // player cards each side of the current player (previous 5 + next 5)
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

export function CountDown31({ roomId = "practice" }: { roomId?: string }) {
  const guestName = useGuestStore((s) => s.username);
  const setGuestName = useGuestStore((s) => s.setUsername);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const defaultName = user?.fullName || user?.email?.split("@")[0] || guestName || "";
  const soundOn = useSettingsStore((s) => s.soundEnabled);
  const { data: cosmetics } = useCosmetics(!!accessToken);
  const { state, myId, join, arm, submit } = useCountdownLive(roomId);

  const [chosenName, setChosenName] = useState("");
  const [showNameGate, setShowNameGate] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [selected, setSelected] = useState<number[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const prevCount = useRef(0);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const armedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  const count = state?.count ?? 0;
  const players = state?.players ?? [];
  const status = state?.status ?? "waiting";
  const currentId = state?.currentId ?? null;
  const taken = state?.taken ?? {};
  const knockout = state?.mode === "knockout";
  const amIn = !!myId && players.some((p) => p.id === myId);
  const myTurn = status === "playing" && currentId === myId;
  const myColor = players.find((p) => p.id === myId)?.color ?? "#5be348";
  const currentPlayer = players.find((p) => p.id === currentId) ?? null;
  const center = count + 2;
  const remaining = state?.turnEndsAt ? Math.max(0, state.turnEndsAt - now) : 0;
  const timerRunning = status === "playing" && !!state?.turnEndsAt;
  const curIdx = players.findIndex((p) => p.id === currentId);

  useEffect(() => {
    const delta = count - prevCount.current;
    prevCount.current = count;
    if (delta > 0 && soundRef.current) for (let i = 0; i < delta; i++) window.setTimeout(() => playTick(), i * 95);
    setSelected([]);
  }, [count]);
  // Reset the per-turn "armed" flag whenever the turn changes.
  useEffect(() => {
    armedRef.current = false;
    if (!myTurn) setSelected([]);
  }, [myTurn, currentId]);

  function toggle(n: number) {
    if (!myTurn) return;
    setSelected((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      // First pick of the turn arms the countdown timer.
      if (!armedRef.current) { armedRef.current = true; arm(); }
      if (soundRef.current) playSelect();
      return [...prev, n];
    });
  }
  function onSubmit() {
    if (!myTurn || selected.length === 0) return;
    submit([...selected]);
    setSelected([]);
  }

  function openNameGate() {
    setNameInput(chosenName || defaultName);
    setShowNameGate(true);
  }
  function confirmJoin() {
    const name = nameInput.trim().slice(0, 20) || `Guest ${Math.floor(1000 + Math.random() * 9000)}`;
    setChosenName(name);
    if (!user) setGuestName(name);
    join(name, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar });
    setShowNameGate(false);
  }
  function rejoin() {
    if (chosenName) join(chosenName, { card: cosmetics?.card as Record<string, unknown> | undefined, avatar: cosmetics?.avatar });
    else openNameGate();
  }

  const turnLabel = !state
    ? "Connecting…"
    : status === "over"
      ? state.winner
        ? `${state.winner.name} wins! 🏆`
        : "Game over"
      : status === "waiting"
        ? `Waiting for players… (${players.length}/2)`
        : myTurn
          ? "Your turn!"
          : `${currentPlayer?.name ?? "…"} is playing…`;

  return (
    <div className="cd31">
      <header className="cd31-head">
        <h1 className="cd31-title">
          <span>Count Down</span>
          <b>31</b>
        </h1>
      </header>

      <div className="cd31-score">
        <span className="cd31-score-side you">
          <Users size={15} /> <b>{players.length}</b> {knockout ? "left" : "playing"}
        </span>
        <span className="cd31-score-round">{knockout ? "Knockout" : `Round ${state?.round ?? 0}`}</span>
        <span className="cd31-score-side cpu">
          {state?.lastEliminated ? `${state.lastEliminated.name} out — ${reasonText(state.lastEliminated.reason)}` : knockout ? "last one standing wins" : "live 24/7"}
        </span>
      </div>

      {/* Number reel (circular, 3D) — consumed numbers keep the colour of whoever took them. */}
      <div className="cd31-stage">
        <div className="cd31-stage-inner">
          <div className="cd31-front-box" />
          {TILES.map((n) => {
            const d = wrapOffset(n - center);
            if (Math.abs(d) > WINDOW) return null;
            const ad = Math.abs(d);
            const picked = selected.includes(n);
            const clickable = myTurn && n > count && n <= count + 3;
            const takenColor = taken[n];
            let x = 0, ry = 0, z = 0, op = 1;
            if (ad <= 1) {
              x = d * 128;
            } else {
              const s = Math.sign(d);
              const r = ad - 1;
              x = s * (214 + (r - 1) * 70);
              ry = -s * 52;
              z = -r * 82;
              op = Math.max(0.14, 0.78 - (r - 1) * 0.3);
            }
            const cls = ["cd31-tile", "cd31-reel-tile"];
            if (ad <= 1) cls.push("front");
            if (n === TARGET) cls.push("bomb");
            if (n <= count) cls.push("done");
            if (picked) cls.push("picked");
            if (clickable) cls.push("clickable");
            // Colour: my live selection uses my colour; consumed numbers use the taker's colour.
            const tint = picked ? myColor : n <= count ? takenColor : undefined;
            const style: React.CSSProperties = {
              transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg)`,
              opacity: op,
              zIndex: ad <= 1 ? 3 : 1,
            };
            if (tint) { style.color = tint; style.borderColor = tint; style.boxShadow = `0 0 16px ${tint}55, inset 0 0 0 2px ${tint}`; }
            return (
              <span
                key={n}
                className={cls.join(" ")}
                style={style}
                role={clickable ? "button" : undefined}
                onClick={clickable ? () => toggle(n) : undefined}
              >
                {n}
              </span>
            );
          })}
        </div>
      </div>

      {/* Turn status + timer + action. */}
      <div className={`cd31-turn ${myTurn ? "you" : ""} ${status === "over" ? "win" : ""}`}>{turnLabel}</div>
      {timerRunning && (
        <div className={`cd31-timer ${remaining <= 3000 ? "low" : ""}`}>
          <div className="cd31-timer-fill" style={{ transform: `scaleX(${Math.max(0, remaining) / 7000})` }} />
          <span className="cd31-timer-label">
            <Clock size={15} /> {Math.ceil(remaining / 1000)}s
          </span>
        </div>
      )}
      {myTurn && !timerRunning && <div className="cd31-hint">Pick a number to start your timer</div>}

      {amIn && status === "playing" ? (
        <button className="cd31-submit" disabled={!myTurn || selected.length === 0} onClick={onSubmit}>
          <Check size={18} /> Submit
        </button>
      ) : (
        <button className="cd31-submit" onClick={chosenName ? rejoin : openNameGate}>
          <LogIn size={18} /> {status === "over" ? "Play again" : chosenName && amIn ? "Waiting…" : chosenName ? "Rejoin the game" : "Join the game"}
        </button>
      )}

      {/* Player reel — previous 5 + current + next 5, each showing the player's own avatar + colour. */}
      <div className="cd31-proll">
        {players.map((p, i) => {
          const d = curIdx >= 0 ? wrapOffset(i - curIdx, players.length || 1) : i;
          if (Math.abs(d) > PWINDOW) return null;
          const ad = Math.abs(d);
          let x = 0, ry = 0, z = 0, op = 1;
          if (d !== 0) {
            const s = Math.sign(d);
            x = s * (132 + (ad - 1) * 40);
            ry = -s * 28;
            z = -ad * 58;
            op = Math.max(0.22, 0.92 - (ad - 1) * 0.18);
          }
          const isCurrent = status === "playing" && p.id === currentId;
          const isWinner = status === "over" && state?.winner?.name === p.name;
          const cls = ["cd31-pcard"];
          if (isCurrent) cls.push("current");
          if (isWinner) cls.push("winner");
          if (p.id === myId) cls.push("me");
          return (
            <div
              key={p.id}
              className={cls.join(" ")}
              style={{ transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${z}px) rotateY(${ry}deg)`, opacity: op, zIndex: 20 - ad, ["--pc" as string]: p.color }}
            >
              <span className="cd31-pcard-ava" title={initials(p.name)}>
                <AvatarThumb config={p.avatar} size={54} />
              </span>
              <b>{p.name}</b>
              <small>{isWinner ? "Winner" : p.id === myId ? "You" : isCurrent ? "Playing" : p.cpu ? "CPU" : ""}</small>
            </div>
          );
        })}
        {players.length === 0 && <p className="cd31-proll-empty">No players yet — be the first to join.</p>}
      </div>

      {showNameGate && (
        <div className="cd31-gate-overlay" onClick={() => setShowNameGate(false)}>
          <div className="cd31-gate glass" onClick={(e) => e.stopPropagation()}>
            <span className="cd31-gate-ico"><Crown size={22} /></span>
            <h2>Choose your name</h2>
            <p>This is how other players see you in the game.</p>
            <input
              autoFocus
              value={nameInput}
              maxLength={20}
              placeholder="Your name"
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && nameInput.trim()) confirmJoin(); }}
            />
            <button className="primary full xl" onClick={confirmJoin} disabled={!nameInput.trim()}>
              <LogIn size={18} /> Enter game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
