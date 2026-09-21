"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { wsBaseUrl } from "../runtime-host";
import { getAuthState } from "../../stores/auth-store";
import { soundManager } from "../soundManager";
import { useGameConfig } from "./useGameConfig";
import { DEFAULT_GAME_CONFIG } from "../game-config";

export type LiveReason = "31" | "repeat" | "over3" | "skip" | "timeout" | "left";
export type SkillType = "rewind" | "turbo" | "shield" | "nudge" | "double";
export type GameMode = "classic" | "skills";

/** How many numbers the countdown cow's clip counts down through (it shows 7 … 1). */
export const COW_COUNT_SPAN = 7;
/** Practice turn length: two passes of the cow's 7-count — a full 7→1, then 7→2. */
export const PRACTICE_TURN_SECONDS = 13;
/** Practice always runs on the built-in defaults, with its own longer turn timer. */
const PRACTICE_GAME_CONFIG = {
  ...DEFAULT_GAME_CONFIG,
  gameplay: { ...DEFAULT_GAME_CONFIG.gameplay, turnSeconds: PRACTICE_TURN_SECONDS },
};

export interface LivePlayer {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  skills?: Record<SkillType, number>;
  equippedSkills?: SkillType[];
  eliminated?: boolean;
}

export interface LastMoveInfo {
  playerId: string;
  playerName: string;
  playerColor: string;
  picks: number[];
  count: number;
}

export interface LiveState {
  mode: "practice" | "knockout";
  gameMode: GameMode;
  count: number;
  players: LivePlayer[];
  currentId: string | null;
  lastK: number | null; // Previous digit count (1, 2, or 3) per Rule #6
  lastMove?: LastMoveInfo | null; // Detailed info on previous turn for reel highlighting
  turnEndsAt: number | null;
  round: number;
  status: "waiting" | "playing" | "over";
  // Server tournaments send a kickoff-wheel phase: turn 1 begins only after this ms (the wheel is
  // spinning to pick who starts). null/absent = no spin phase (practice starts instantly).
  spinEndsAt?: number | null;
  // Server tournaments: on each elimination the WHOLE game freezes for the cow-dance until this ms
  // (every player sees the cow centre-stage). null/absent = not dancing.
  danceEndsAt?: number | null;
  winner: { name: string; color: string } | null;
  lastEliminated: { name: string; reason: LiveReason; note?: string } | null;
  taken: Record<number, string>;
  lastSkillUsed?: {
    skill: SkillType;
    userName: string;
    description: string;
  } | null;
  // Local practice/arena only: when set, the whole arena is FROZEN for the eliminated player's
  // centre cow-dance. No turns process and no input is accepted until the dance ends (endDance()).
  dancing?: {
    id: string;
    name: string;
    reason: LiveReason;
    note?: string;
    // Extra info the cinematic ELIMINATION sequence needs: the player's avatar + colour + seat, and
    // whether this elimination completed the round (31 → count resets) so the dancing cow can play
    // ONLY at round completion (not on every elimination).
    roundDone?: boolean;
    color?: string;
    avatar?: Record<string, string>;
    seat?: number;
    remaining?: number;
  } | null;
  // Brief "reveal" beat: the numbers the CURRENT player just picked, shown highlighted (in their
  // colour) on the picker tiles so everyone SEES the selection before the turn advances.
  selecting?: {
    playerId: string;
    picks: number[];
    color: string;
  } | null;
}

export interface JoinCosmetics {
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  chosenSkills?: SkillType[];
}

export function useCountdownLive(roomId = "practice", opts?: { local?: boolean; botCount?: number }) {
  const { data: gameConfig } = useGameConfig();
  const isTournament = roomId !== "practice";
  // PRACTICE gets a longer turn than a live tournament: the countdown cow runs its 7-count TWICE —
  // a full 7→1, then a second pass that reaches 7→2 before the turn expires — which is 13 seconds.
  // Tournaments keep whatever turn length is configured for them (the server is authoritative there).
  const activeConfig = isTournament ? (gameConfig ?? DEFAULT_GAME_CONFIG) : PRACTICE_GAME_CONFIG;
  const runtimeConfigRef = useRef(activeConfig);
  runtimeConfigRef.current = activeConfig;
  const [state, setState] = useState<LiveState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isLocalPracticeRef = useRef(false);
  const stateRef = useRef<LiveState | null>(null);
  stateRef.current = state;

  // A "local arena" (opts.local) runs the same in-browser engine as practice but for a themed room
  // (e.g. the always-open test tournament) with a configurable bot count.
  const forceLocalRef = useRef(!!opts?.local);
  forceLocalRef.current = !!opts?.local;

  // Practice/local arena runs 24/7: CPU cows always play and each finished game auto-restarts. Once a
  // human joins they stay "seated" so they're auto-re-added to every new game (they can also rejoin
  // instantly). humanSeatRef holds their join params, or null while it's a CPU-only ambient game.
  const DEFAULT_PRACTICE_BOTS = 5;
  const PRACTICE_BOT_COUNT = Math.max(1, Math.min(100, opts?.botCount ?? DEFAULT_PRACTICE_BOTS));
  const humanSeatRef = useRef<{ name: string; cos?: JoinCosmetics; mode: GameMode; chosenSkills: SkillType[] } | null>(null);
  // Tournament socket join requested before the socket finished connecting — emitted on "connect".
  const pendingJoinRef = useRef<{ name: string; cos?: JoinCosmetics; mode: GameMode } | null>(null);
  const ambientModeRef = useRef<GameMode>(DEFAULT_GAME_CONFIG.gameplay.defaultMode);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overHandledRef = useRef(false);
  // Kickoff-wheel timing for the local test arena (real tournaments get their spin from the server):
  // the pointer lands after WHEEL_MS, then the "X starts!" reveal holds for REVEAL_MS before turn 1.
  const LOCAL_WHEEL_MS = 3600;
  const LOCAL_REVEAL_MS = 1300;
  // How long a CPU's picked numbers flash (highlighted in its colour) on the tiles before its turn
  // advances — long enough that every player SEES the selection, short enough to keep play brisk.
  const REVEAL_MS = 650;
  // While a human's cow-dance is playing the arena is frozen; this holds the state to apply the
  // moment the dance finishes (endDance()), so the game resumes from the exact same point.
  const pendingResumeRef = useRef<LiveState | null>(null);
  const botCountRef = useRef(PRACTICE_BOT_COUNT);
  botCountRef.current = PRACTICE_BOT_COUNT;

  // Multi-player Local Simulation Engine (4 Players: You + Bessie + Daisy + Barnaby)
  const processNextTurn = useCallback((currentState: LiveState) => {
    const cur = currentState;
    if (cur.status !== "playing" || !cur.currentId) return;

    const currentP = cur.players.find((p) => p.id === cur.currentId);
    if (!currentP || !currentP.cpu || currentP.eliminated) return;

    setTimeout(
      () => {
        const activeState = stateRef.current;
        if (
          !activeState ||
          activeState.status !== "playing" ||
          activeState.dancing || // frozen for a cow-dance — no bot moves until it ends
          activeState.currentId !== currentP.id
        )
          return;

        const currentCount = activeState.count;
        const forbiddenK = activeState.lastK;

        // AI has a chance to use one of its equipped skills in Skill Mode (count between 5 and 20)
        if (
          activeState.gameMode === "skills" &&
          currentCount >= 8 &&
          currentCount <= 21 &&
          Math.random() < 0.2
        ) {
          const availableSkills = (currentP.equippedSkills ?? []).filter(
            (sk) => (currentP.skills?.[sk] ?? 0) > 0,
          );
          if (availableSkills.length > 0) {
            const chosenSkill = availableSkills[0]!;
            if (chosenSkill === "turbo" && currentCount + 3 <= 29) {
              soundManager.playSkillTurbo();
              const newCount = currentCount + 3;
              const newTaken = { ...activeState.taken };
              for (let i = currentCount + 1; i <= newCount; i++) {
                newTaken[i] = currentP.color;
              }
              const updatedP = activeState.players.map((p) =>
                p.id === currentP.id && p.skills ? { ...p, skills: { ...p.skills, turbo: 0 } } : p,
              );
              const nextState: LiveState = {
                ...activeState,
                count: newCount,
                taken: newTaken,
                players: updatedP,
                lastSkillUsed: {
                  skill: "turbo",
                  userName: currentP.name,
                  description: "Turbo Leaped +3 steps forward! ⚡",
                },
              };
              setState(nextState);
              processNextTurn(nextState);
              return;
            }
          }
        }

        // AI mistake chances
        const difficulty = String(currentP.card?.difficulty ?? "normal");
        const mistakeRate = difficulty === "easy" ? 0.13 : difficulty === "hard" ? 0.018 : 0.05;
        const makesRepeatMistake = Math.random() < mistakeRate && forbiddenK !== null;
        const makesSkipMistake = Math.random() < mistakeRate * 0.8;

        if (makesSkipMistake && currentCount + 2 <= 30) {
          soundManager.playBlunder();
          eliminatePlayer(currentP.id, "skip", activeState, `Skipped #${currentCount + 1}!`);
          return;
        }

        let chosenK = 1;

        if (makesRepeatMistake && forbiddenK !== null) {
          chosenK = forbiddenK;
        } else {
          const allowedMoves = [1, 2, 3].filter((k) => k !== forbiddenK && currentCount + k <= 31);
          const validMoves =
            allowedMoves.length > 0
              ? allowedMoves
              : [1, 2, 3].filter((k) => currentCount + k <= 31);
          chosenK = validMoves[0] ?? 1;

          // Smart Nim Strategy targeting safe numbers
          for (const k of validMoves) {
            const landing = currentCount + k;
            if (landing === 30 || (landing < 30 && (30 - landing) % 4 === 0)) {
              chosenK = k;
              break;
            }
          }

          // Avoid landing on 31 if possible
          if (currentCount + chosenK === 31 && validMoves.length > 1) {
            chosenK = validMoves.find((k) => currentCount + k < 31) ?? chosenK;
          }
        }

        // Check Rule #6 Repeat Elimination — but reaching 31 IS the losing move and takes precedence:
        // a player forced to say 31 (e.g. count 30 after a prior single number) must end the lap via
        // the "31" path below, not be mis-flagged "repeat" (which would leave the count stuck at 30).
        if (currentCount + chosenK < 31 && forbiddenK !== null && chosenK === forbiddenK) {
          soundManager.playBlunder();
          eliminatePlayer(currentP.id, "repeat", activeState, "Repeated previous count!");
          return;
        }

        const picks: number[] = [];
        for (let i = 1; i <= chosenK; i++) {
          if (currentCount + i <= 31) picks.push(currentCount + i);
        }

        const nextCount = picks[picks.length - 1] ?? currentCount;
        const nextTaken = { ...activeState.taken };
        picks.forEach((p) => {
          nextTaken[p] = currentP.color;
        });

        const moveInfo: LastMoveInfo = {
          playerId: currentP.id,
          playerName: currentP.name,
          playerColor: currentP.color,
          picks,
          count: chosenK,
        };

        if (nextCount >= 31) {
          eliminatePlayer(
            currentP.id,
            "31",
            {
              ...activeState,
              count: 31,
              taken: nextTaken,
              lastMove: moveInfo,
            },
            "Hit 31 💣",
          );
        } else {
          const advance = () => {
            // Re-read the LIVE state instead of spreading the snapshot this turn started from. A
            // human can press PLAY at any moment during the think + reveal window (~2.5–4s per bot
            // turn); spreading the stale `activeState` here would silently wipe them back out of
            // `players`, which is why a join sometimes appeared to do nothing and needed 2–3 clicks.
            const live = stateRef.current ?? activeState;
            const survivingPlayers = live.players.filter((p) => !p.eliminated);
            const currentIdx = survivingPlayers.findIndex((p) => p.id === currentP.id);
            const nextPlayer = survivingPlayers[(currentIdx + 1) % survivingPlayers.length] ?? currentP;
            const nextState: LiveState = {
              ...live,
              count: nextCount,
              taken: nextTaken,
              lastK: chosenK,
              lastMove: moveInfo,
              currentId: nextPlayer.id,
              turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
              lastSkillUsed: null,
              selecting: null,
            };
            setState(nextState);
            processNextTurn(nextState);
          };

          // REVEAL: flash this player's picked numbers (in their colour) on the tiles for a beat so
          // everyone sees the selection, THEN advance the turn. Merge onto the live state (not the
          // snapshot) for the same reason as above.
          setState((s) => ({ ...(s ?? activeState), selecting: { playerId: currentP.id, picks, color: currentP.color } }));
          setTimeout(() => {
            const s = stateRef.current;
            if (!s || s.status !== "playing" || s.dancing || s.currentId !== currentP.id) return;
            advance();
          }, REVEAL_MS);
        }
      },
      runtimeConfigRef.current.gameplay.botThinkMinMs +
        Math.random() *
          (runtimeConfigRef.current.gameplay.botThinkMaxMs -
            runtimeConfigRef.current.gameplay.botThinkMinMs),
    );
  }, []);

  // Player Elimination Handler
  //
  // The local practice/arena engine is ENDLESS — there is never a winner and the counter CONTINUES
  // from where it was rather than restarting at 1 (it only resets to 0 on a completed lap — someone
  // was forced to say 31). CPU blunderers AUTO-REJOIN (stay active, field never shrinks). A HUMAN
  // blunderer instead stays OUT (eliminated) and must press REJOIN to re-enter — and their
  // elimination FREEZES the whole arena for the centre cow-dance (state.dancing); endDance() applies
  // the stored resume state when the dance video finishes. CPU blunders continue immediately.
  const eliminatePlayer = useCallback(
    (eliminatedId: string, reason: LiveReason, baseState: LiveState, note?: string) => {
      const eliminatedPlayer = baseState.players.find((p) => p.id === eliminatedId);
      const isHuman = !!eliminatedPlayer && !eliminatedPlayer.cpu;

      // CPUs auto-rejoin (stay active). A human stays eliminated until they press REJOIN.
      const players = isHuman
        ? baseState.players.map((p) => (p.id === eliminatedId ? { ...p, eliminated: true } : p))
        : baseState.players;

      // Continue forward; only a completed lap (reached 31) starts a fresh count.
      const completedLap = reason === "31" || baseState.count >= 31;
      const contCount = completedLap ? 0 : baseState.count;
      const contTaken = completedLap ? {} : baseState.taken;
      const contLastK = completedLap ? null : baseState.lastK;

      // Turn passes to the next STILL-ACTIVE player after the one who just blundered (wrapping).
      const elimIdx = players.findIndex((p) => p.id === eliminatedId);
      let nextPlayer = players.find((p) => !p.eliminated) ?? players[0]!;
      for (let i = 1; i <= players.length; i++) {
        const cand = players[(elimIdx + i) % players.length];
        if (cand && !cand.eliminated) { nextPlayer = cand; break; }
      }

      const resumeState: LiveState = {
        ...baseState,
        count: contCount,
        taken: contTaken,
        lastK: contLastK,
        lastMove: completedLap ? null : baseState.lastMove,
        round: completedLap ? baseState.round + 1 : baseState.round,
        players,
        currentId: nextPlayer.id,
        turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
        status: "playing",
        winner: null,
        lastEliminated: eliminatedPlayer ? { name: eliminatedPlayer.name, reason, note } : null,
        lastSkillUsed: null,
        dancing: null,
      };

      // FREEZE gate — NOT the dancing cow. In practice, EVERY elimination (human or CPU) freezes the
      // arena so the ELIMINATION SEQUENCE can play and every player is treated the same; the CPU
      // still auto-rejoins afterwards via resumeState. Elsewhere (the 100-bot test arena, real
      // tournaments) only a human elimination freezes.
      //
      // The DANCING COW is a separate, downstream gate: CountDown31.tsx:854 plays it only when
      // `reason === "31"`, i.e. when the lap completed and the board resets to 0. Do not conflate
      // the two — this flag was previously called `danceEveryElim`, which caused exactly that
      // misreading. Freezing on every elimination is correct; dancing on every elimination is not.
      //
      // Was `roomId === "practice" && baseState.gameMode === "classic"`. The gameMode half was dead
      // weight and an active trap: the socket-failure fallbacks build state with
      // `gameMode: "skills"`, so a dropped tournament socket silently disabled the freeze.
      const freezeEveryElim = roomId === "practice";
      if ((isHuman || freezeEveryElim) && eliminatedPlayer) {
        // Freeze the arena and play the centre cow-dance. endDance() will apply resumeState (for a
        // human they're now marked eliminated → REJOIN button; for a CPU they're already re-seated).
        pendingResumeRef.current = resumeState;
        setState({
          ...baseState,
          players,
          turnEndsAt: null,
          lastEliminated: { name: eliminatedPlayer.name, reason, note },
          lastSkillUsed: null,
          dancing: {
            id: eliminatedId,
            name: eliminatedPlayer.name,
            reason,
            note,
            roundDone: completedLap,
            color: eliminatedPlayer.color,
            avatar: eliminatedPlayer.avatar,
            seat: baseState.players.findIndex((p) => p.id === eliminatedId) + 1,
            remaining: players.filter((p) => !p.eliminated).length,
          },
        });
        // Do NOT advance — wait for endDance() when the dance video finishes.
      } else {
        // CPU blunder outside practice: auto-rejoin + continue immediately, no pause.
        setState(resumeState);
        processNextTurn(resumeState);
      }
    },
    [processNextTurn, roomId],
  );

  // Called by the mascot when the centre cow-dance finishes: unfreeze and resume from the exact
  // point captured at elimination time.
  const endDance = useCallback(() => {
    const resume = pendingResumeRef.current;
    if (!resume) return;
    pendingResumeRef.current = null;
    const resumed: LiveState = {
      ...resume,
      turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
      dancing: null,
    };
    setState(resumed);
    processNextTurn(resumed);
  }, [processNextTurn]);

  // Build + start a local practice game: always 5 CPU cows, plus the human if `seat` is provided.
  // With no seat it's a CPU-only ambient game (the 24/7 arena you drop into). If a CPU leads, the
  // bot turn chain is kicked off immediately.
  const startLocalGame = useCallback(
    (seat: { name: string; cos?: JoinCosmetics; mode: GameMode; chosenSkills: SkillType[] } | null) => {
      // A fresh game supersedes any pending auto-restart.
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      overHandledRef.current = false;

      const mode: GameMode = seat?.mode ?? ambientModeRef.current;
      ambientModeRef.current = mode;

      const botColors = ["#ff43c4", "#21e6d7", "#f4b942", "#a78bfa", "#38bdf8", "#5be348", "#ffd23f", "#ff8c42"];
      const enabledSkills = runtimeConfigRef.current.skills.filter((skill) => skill.enabled);
      const templates = runtimeConfigRef.current.bots.filter((bot) => bot.enabled).sort((a, b) => a.order - b.order);
      const total = botCountRef.current; // up to 100 for the test arena; 5 for practice
      // Generate `total` CPU cows, cycling the configured bot templates (numbered past the first pass).
      const bots: LivePlayer[] = Array.from({ length: total }, (_, index) => {
        const tpl = templates[index % Math.max(1, templates.length)] ?? { id: "cow", name: "Cow", title: "Rookie", avatarVariantId: "daisy_v1_cowboy", difficulty: "normal" };
        const pass = Math.floor(index / Math.max(1, templates.length));
        const baseName = String(tpl.name).replace(/\s*[\u{1F000}-\u{1FAFF}☀-➿]\s*$/u, "").trim() || "Cow";
        const name = pass === 0 ? tpl.name : `${baseName} ${pass + 1}`;
        const equipped = enabledSkills
          .slice(index % Math.max(1, enabledSkills.length), (index % Math.max(1, enabledSkills.length)) + 2)
          .map((skill) => skill.id);
        const chosen = equipped.length === 2 ? equipped : enabledSkills.slice(0, 2).map((skill) => skill.id);
        const skills = { rewind: 0, turbo: 0, shield: 0, nudge: 0, double: 0 } as Record<SkillType, number>;
        if (mode === "skills") chosen.forEach((skill) => { skills[skill] = 1; });
        return {
            id: `cpu_${tpl.id}_${index}`,
            name,
            cpu: true,
            color: botColors[index % botColors.length]!,
            card: { difficulty: tpl.difficulty, title: tpl.title },
            avatar: { variantId: tpl.avatarVariantId },
            skills,
            equippedSkills: mode === "skills" ? chosen : [],
            eliminated: false,
          };
        });

      let players: LivePlayer[];
      let currentId: string;
      if (seat) {
        const playerSkills: Record<SkillType, number> = { rewind: 0, turbo: 0, shield: 0, nudge: 0, double: 0 };
        if (mode === "skills") seat.chosenSkills.forEach((s) => { playerSkills[s] = 1; });
        const human: LivePlayer = {
          id: "player_local",
          name: seat.name,
          cpu: false,
          color: "#5be348",
          card: seat.cos?.card,
          avatar: seat.cos?.avatar,
          skills: playerSkills,
          equippedSkills: mode === "skills" ? seat.chosenSkills : [],
          eliminated: false,
        };
        players = [human, ...bots];
        currentId = "player_local"; // the human moves first when they're in the game
      } else {
        players = bots;
        currentId = bots[0]?.id ?? "cpu_daisy";
      }

      // The always-open TEST arena kicks off with a spin wheel that picks a RANDOM starting cow —
      // mirroring a real tournament's `spinEndsAt` kickoff. Practice starts instantly (no spin).
      if (spinTimerRef.current) { clearTimeout(spinTimerRef.current); spinTimerRef.current = null; }
      const spinEndsAt = forceLocalRef.current ? Date.now() + LOCAL_WHEEL_MS : null;
      if (spinEndsAt) currentId = players[Math.floor(Math.random() * players.length)]!.id;

      const newState: LiveState = {
        mode: "practice",
        gameMode: mode,
        count: 0,
        players,
        currentId,
        lastK: null,
        lastMove: null,
        turnEndsAt: spinEndsAt ? null : Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
        round: 1,
        status: "playing",
        spinEndsAt,
        winner: null,
        lastEliminated: null,
        taken: {},
        lastSkillUsed: null,
      };

      setMyId("player_local");
      setState(newState);

      if (spinEndsAt) {
        // Hold turn 1 until the wheel lands AND its "X starts!" reveal has been shown, then start the
        // picked cow's turn (the game proceeds onward from them in seating order).
        spinTimerRef.current = setTimeout(() => {
          spinTimerRef.current = null;
          const s = stateRef.current;
          if (!s || s.status !== "playing") return;
          const started: LiveState = {
            ...s,
            spinEndsAt: null,
            turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
          };
          setState(started);
          if (started.players.find((p) => p.id === started.currentId)?.cpu) processNextTurn(started);
        }, LOCAL_WHEEL_MS + LOCAL_REVEAL_MS);
      } else if (players.find((p) => p.id === currentId)?.cpu) {
        // If a CPU leads (ambient game), start the bot turn chain now.
        processNextTurn(newState);
      }
    },
    [processNextTurn],
  );

  // Local Human Player Turn Timeout Monitor
  useEffect(() => {
    if (
      !isLocalPracticeRef.current ||
      !state ||
      state.status !== "playing" ||
      !myId ||
      state.currentId !== myId ||
      !state.turnEndsAt
    )
      return;

    const timer = setInterval(() => {
      const cur = stateRef.current;
      if (!cur || cur.status !== "playing" || !myId || cur.currentId !== myId || !cur.turnEndsAt)
        return;

      if (Date.now() >= cur.turnEndsAt) {
        soundManager.playBlunder();
        eliminatePlayer(myId, "timeout", cur, "Turn timer expired! ⏰");
      }
    }, 250);

    return () => clearInterval(timer);
  }, [state?.status, state?.currentId, state?.turnEndsAt, myId, eliminatePlayer]);

  useEffect(() => {
    // Local engine for the practice room and for a forced local arena (the test tournament).
    // Starts the 24/7 ambient arena: CPU cows already playing that a human can drop into any time.
    if (roomId === "practice" || forceLocalRef.current) {
      isLocalPracticeRef.current = true;
      setMyId("player_local");
      startLocalGame(humanSeatRef.current);
      return;
    }

    let socket: Socket | null = null;
    try {
      // Send the access token in the handshake so the server can authenticate the player and let
      // them JOIN this tournament room (registered players only). Without it the join is refused and
      // the arena would fall back to the local practice bots.
      const token = getAuthState().accessToken ?? undefined;
      socket = io(`${wsBaseUrl()}/countdown`, {
        transports: ["websocket"],
        timeout: 3000,
        reconnectionAttempts: 2,
        auth: { token },
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        isLocalPracticeRef.current = false;
        // Tournaments identify players by USER ID (their DB-seeded seat), so "me" is my user id — not
        // the socket id — otherwise `currentId === myId` (and my turn / my defeat) would never match.
        setMyId(getAuthState().user?.id ?? socket?.id ?? null);
        socket?.emit("watch", { roomId });
        // If a join was requested before the socket was ready, send it now (fixes the race where a
        // tournament auto-join fired before the websocket finished connecting → player never joined).
        const pending = pendingJoinRef.current;
        if (pending) {
          pendingJoinRef.current = null;
          socket?.emit("join", { roomId, name: pending.name, card: pending.cos?.card, avatar: pending.cos?.avatar, mode: pending.mode });
        }
      });

      socket.on("state", (s: LiveState) => {
        isLocalPracticeRef.current = false;
        setState(s);
      });

      socket.on("connect_error", () => {
        if (!stateRef.current) {
          isLocalPracticeRef.current = true;
          setMyId("player_local");
          setState({
            mode: "practice",
            gameMode: "skills",
            count: 0,
            players: [],
            currentId: null,
            lastK: null,
            lastMove: null,
            turnEndsAt: null,
            round: 1,
            status: "waiting",
            winner: null,
            lastEliminated: null,
            taken: {},
          });
        }
      });
    } catch {
      isLocalPracticeRef.current = true;
      setMyId("player_local");
      setState({
        mode: "practice",
        gameMode: "skills",
        count: 0,
        players: [],
        currentId: null,
        lastK: null,
        lastMove: null,
        turnEndsAt: null,
        round: 1,
        status: "waiting",
        winner: null,
        lastEliminated: null,
        taken: {},
      });
    }

    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [roomId, startLocalGame]);

  // 24/7 auto-restart: when a local practice game ends, start the next one after a short beat (long
  // enough for the win/elimination animation to play once). A seated human is auto-re-added.
  useEffect(() => {
    if (!isLocalPracticeRef.current || state?.status !== "over" || overHandledRef.current) return;
    overHandledRef.current = true;
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      startLocalGame(humanSeatRef.current);
    }, 3800);
    return () => {
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    };
  }, [state?.status, startLocalGame]);

  const join = useCallback(
    (
      name: string,
      cos?: JoinCosmetics,
      // Default to CLASSIC. This previously defaulted to "skills" with a pre-filled loadout, which
      // was inert only because every caller passes "classic" explicitly — a landmine, not a design.
      mode: GameMode = "classic",
      chosenSkills: SkillType[] = [],
      // botCount is accepted for backward-compat but practice always fields 5 CPU cows.
      _botCount: number = PRACTICE_BOT_COUNT,
    ) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("join", {
          roomId,
          name,
          card: cos?.card,
          avatar: cos?.avatar,
          mode,
        });
        return;
      }
      // Socket exists but hasn't finished connecting yet — queue the join for the "connect" handler
      // (a tournament room always has a socket; this avoids falling through to the local engine).
      if (socketRef.current) {
        pendingJoinRef.current = { name, cos, mode };
        return;
      }

      // Seat the human so they're auto-re-added to every subsequent 24/7 game.
      humanSeatRef.current = { name, cos, mode, chosenSkills };

      // Classic and Skill are SEPARATE practice games. We only drop the human into a game already in
      // progress when it's the SAME mode they're joining (mid-join, no restart) — and there we grant
      // their chosen skills so they can actually use them. If they're joining a DIFFERENT mode (a
      // mode switch), we start a fresh game in that mode instead.
      const cur = stateRef.current;
      const playerSkills: Record<SkillType, number> = { rewind: 0, turbo: 0, shield: 0, nudge: 0, double: 0 };
      if (mode === "skills") chosenSkills.forEach((s) => { playerSkills[s] = 1; });

      if (cur && cur.status === "playing" && cur.gameMode === mode) {
        const already = cur.players.find((p) => p.id === "player_local");
        if (already) {
          // Rejoin after being eliminated: re-activate + refresh their equipped skills.
          setState({
            ...cur,
            players: cur.players.map((p) =>
              p.id === "player_local"
                ? { ...p, name, eliminated: false, skills: playerSkills, equippedSkills: mode === "skills" ? chosenSkills : [] }
                : p,
            ),
          });
        } else {
          const human: LivePlayer = {
            id: "player_local",
            name,
            cpu: false,
            color: "#5be348",
            card: cos?.card,
            avatar: cos?.avatar,
            skills: playerSkills,
            equippedSkills: mode === "skills" ? chosenSkills : [],
            eliminated: false,
          };
          // Seat the newcomer directly AFTER whoever is playing right now, so their first turn comes
          // on the very next move. Appending them to the END of the field instead meant waiting out a
          // full lap of CPU cows (5 cows x ~2.5-4s each = ~20s) before they could touch the board.
          const seated = [...cur.players];
          const turnIdx = seated.findIndex((p) => p.id === cur.currentId);
          seated.splice(turnIdx >= 0 ? turnIdx + 1 : seated.length, 0, human);
          setState({ ...cur, players: seated });
        }
        setMyId("player_local");
        return;
      }

      // No matching game running (or a different mode) — start a fresh game in the chosen mode.
      startLocalGame(humanSeatRef.current);
    },
    [roomId, startLocalGame],
  );

  // Classic vs Skill are separate games: switching modes drops the human out of the current game and
  // spins up a CPU-only ambient game in the new mode, so they must explicitly re-join it.
  const leaveGame = useCallback(
    (mode: GameMode) => {
      if (socketRef.current?.connected) return; // server rooms aren't mode-switchable client-side
      humanSeatRef.current = null;
      ambientModeRef.current = mode;
      startLocalGame(null);
      setMyId("player_local");
    },
    [startLocalGame],
  );

  const arm = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("arm", { roomId });
      return;
    }
    if (stateRef.current) {
      setState({
        ...stateRef.current,
        turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
      });
    }
  }, [roomId]);

  const submit = useCallback(
    (picks: number[]) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("submit", { roomId, picks });
        return;
      }

      const cur = stateRef.current;
      if (
        !cur ||
        cur.status !== "playing" ||
        cur.dancing || // frozen for a cow-dance
        cur.spinEndsAt != null || // kickoff wheel spinning / revealing the starter
        picks.length === 0 ||
        !myId ||
        cur.currentId !== myId
      )
        return;

      const currentCount = cur.count;
      const sortedPicks = [...picks].sort((a, b) => a - b);
      const k = sortedPicks.length;
      const me = cur.players.find((p) => p.id === myId);
      const myColor = me?.color ?? "#5be348";

      // Sequence Blunder Check
      if (sortedPicks[0] !== currentCount + 1) {
        soundManager.playBlunder();
        eliminatePlayer(
          myId,
          "skip",
          cur,
          `Blunder! You skipped card #${currentCount + 1} and started at #${sortedPicks[0]}! 💣`,
        );
        return;
      }

      for (let i = 1; i < sortedPicks.length; i++) {
        if (sortedPicks[i] !== sortedPicks[i - 1]! + 1) {
          soundManager.playBlunder();
          eliminatePlayer(
            myId,
            "skip",
            cur,
            `Blunder! You skipped card #${sortedPicks[i - 1]! + 1}! 💣`,
          );
          return;
        }
      }

      if (k > 3) {
        soundManager.playBlunder();
        eliminatePlayer(myId, "over3", cur, "Exceeded 3 cards limit!");
        return;
      }

      if (cur.lastK !== null && k === cur.lastK) {
        soundManager.playBlunder();
        eliminatePlayer(myId, "repeat", cur, `Repeated previous digit count (${k})!`);
        return;
      }

      const nextCount = sortedPicks[sortedPicks.length - 1]!;
      const nextTaken = { ...cur.taken };
      sortedPicks.forEach((p) => {
        nextTaken[p] = myColor;
      });

      const moveInfo: LastMoveInfo = {
        playerId: myId,
        playerName: me?.name ?? "You",
        playerColor: myColor,
        picks: sortedPicks,
        count: k,
      };

      if (nextCount >= 31) {
        soundManager.playSpinDefeat();
        eliminatePlayer(
          myId,
          "31",
          {
            ...cur,
            count: 31,
            taken: nextTaken,
            lastMove: moveInfo,
          },
          "Hit 31 💣💀",
        );
      } else {
        const survivingPlayers = cur.players.filter((p) => !p.eliminated);
        const currentIdx = survivingPlayers.findIndex((p) => p.id === myId);
        const nextPlayer = survivingPlayers[(currentIdx + 1) % survivingPlayers.length]!;

        const nextState: LiveState = {
          ...cur,
          count: nextCount,
          taken: nextTaken,
          lastK: k,
          lastMove: moveInfo,
          currentId: nextPlayer.id,
          turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
          lastSkillUsed: null,
        };

        setState(nextState);
        processNextTurn(nextState);
      }
    },
    [myId, roomId, eliminatePlayer, processNextTurn],
  );

  // Using a skill is a COMPLETE turn action: the player may pick numbers OR play a skill on their
  // turn, not both. Every skill applies its effect and then passes the turn to the next player
  // (so no numbers need to be submitted afterwards).
  const useSkill = useCallback(
    (skill: SkillType) => {
      // Server tournament: skills are server-authoritative — emit and let the server apply + broadcast.
      if (socketRef.current?.connected) {
        socketRef.current.emit("useSkill", { roomId, skill });
        return true;
      }

      const cur = stateRef.current;
      if (
        !cur ||
        cur.status !== "playing" ||
        cur.dancing || // frozen for a cow-dance
        cur.spinEndsAt != null || // kickoff wheel spinning / revealing the starter
        cur.gameMode !== "skills" ||
        !myId ||
        cur.currentId !== myId
      )
        return false;

      if (cur.count >= 22) return false;

      const player = cur.players.find((p) => p.id === myId);
      const available = player?.skills?.[skill] ?? 0;
      if (available <= 0) return false;

      const updatedPlayers = cur.players.map((p) =>
        p.id === myId && p.skills ? { ...p, skills: { ...p.skills, [skill]: 0 } } : p,
      );

      // Apply the skill's effect to the board.
      let newCount = cur.count;
      const newTaken = { ...cur.taken };
      let description = "";
      if (skill === "rewind") {
        soundManager.playSkillRewind();
        newCount = Math.max(0, cur.count - 2);
        delete newTaken[cur.count];
        delete newTaken[cur.count - 1];
        description = "Rewound the counter by -2! 🔄";
      } else if (skill === "turbo") {
        soundManager.playSkillTurbo();
        newCount = Math.min(30, cur.count + 3);
        for (let i = cur.count + 1; i <= newCount; i++) newTaken[i] = player?.color ?? "#5be348";
        description = "Turbo Leaped +3 steps forward! ⚡";
      } else if (skill === "shield") {
        soundManager.playSkillShield();
        description = "Activated Divine Barrier Protection! 🛡️";
      } else if (skill === "nudge") {
        soundManager.playClick();
        description = "Used Snooze to safely pass turn! ⏭️";
      } else {
        return false;
      }

      // Every skill ends the turn — advance to the next player in seating order.
      const survivingPlayers = cur.players.filter((p) => !p.eliminated);
      const currentIdx = survivingPlayers.findIndex((p) => p.id === myId);
      const nextPlayer =
        survivingPlayers[(currentIdx + 1) % survivingPlayers.length] ?? survivingPlayers[0]!;

      const nextState: LiveState = {
        ...cur,
        count: newCount,
        taken: newTaken,
        players: updatedPlayers,
        lastK: null, // a skill isn't a digit-count move, so it carries no repeat constraint
        currentId: nextPlayer.id,
        turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
        lastSkillUsed: { skill, userName: player?.name ?? "Player", description },
      };
      setState(nextState);
      processNextTurn(nextState);
      return true;
    },
    [myId, roomId, processNextTurn],
  );

  const triggerDefeat = useCallback(
    (reason: LiveReason = "31") => {
      const cur = stateRef.current;
      if (!cur) return;
      soundManager.playSpinDefeat();
      eliminatePlayer(myId ?? "player_local", reason, cur, "Instant Test: Hit 31 💣💀");
    },
    [myId, eliminatePlayer],
  );

  return {
    state,
    myId,
    join,
    leaveGame,
    arm,
    submit,
    useSkill,
    endDance,
    triggerDefeat,
    /** The turn length actually in force for this room (practice runs longer than a tournament). */
    turnSeconds: activeConfig.gameplay.turnSeconds,
  };
}
