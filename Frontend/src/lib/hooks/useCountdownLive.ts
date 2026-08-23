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
  winner: { name: string; color: string } | null;
  lastEliminated: { name: string; reason: LiveReason; note?: string } | null;
  taken: Record<number, string>;
  lastSkillUsed?: {
    skill: SkillType;
    userName: string;
    description: string;
  } | null;
}

export interface JoinCosmetics {
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  chosenSkills?: SkillType[];
}

export function useCountdownLive(roomId = "practice") {
  const { data: gameConfig } = useGameConfig();
  const isTournament = roomId !== "practice";
  const activeConfig = isTournament ? (gameConfig ?? DEFAULT_GAME_CONFIG) : DEFAULT_GAME_CONFIG;
  const runtimeConfigRef = useRef(activeConfig);
  runtimeConfigRef.current = activeConfig;
  const [state, setState] = useState<LiveState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const isLocalPracticeRef = useRef(false);
  const stateRef = useRef<LiveState | null>(null);
  stateRef.current = state;

  // Practice arena runs 24/7: 5 CPU cows always play, and each finished game auto-restarts. Once a
  // human joins they stay "seated" so they're auto-re-added to every new game (they can also rejoin
  // instantly). humanSeatRef holds their join params, or null while it's a CPU-only ambient game.
  const PRACTICE_BOT_COUNT = 5;
  const humanSeatRef = useRef<{ name: string; cos?: JoinCosmetics; mode: GameMode; chosenSkills: SkillType[] } | null>(null);
  const ambientModeRef = useRef<GameMode>(DEFAULT_GAME_CONFIG.gameplay.defaultMode);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const overHandledRef = useRef(false);

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

        // Check Rule #6 Repeat Elimination
        if (forbiddenK !== null && chosenK === forbiddenK) {
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
          const survivingPlayers = activeState.players.filter((p) => !p.eliminated);
          const currentIdx = survivingPlayers.findIndex((p) => p.id === currentP.id);
          const nextPlayer = survivingPlayers[(currentIdx + 1) % survivingPlayers.length]!;

          const nextState: LiveState = {
            ...activeState,
            count: nextCount,
            taken: nextTaken,
            lastK: chosenK,
            lastMove: moveInfo,
            currentId: nextPlayer.id,
            turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
            lastSkillUsed: null,
          };

          setState(nextState);
          processNextTurn(nextState);
        }
      },
      runtimeConfigRef.current.gameplay.botThinkMinMs +
        Math.random() *
          (runtimeConfigRef.current.gameplay.botThinkMaxMs -
            runtimeConfigRef.current.gameplay.botThinkMinMs),
    );
  }, []);

  // Player Elimination Handler
  const eliminatePlayer = useCallback(
    (eliminatedId: string, reason: LiveReason, baseState: LiveState, note?: string) => {
      const eliminatedPlayer = baseState.players.find((p) => p.id === eliminatedId);
      const updatedPlayers = baseState.players.map((p) =>
        p.id === eliminatedId ? { ...p, eliminated: true } : p,
      );

      const surviving = updatedPlayers.filter((p) => !p.eliminated);

      if (surviving.length <= 1) {
        const champ = surviving[0] ?? eliminatedPlayer;
        const overState: LiveState = {
          ...baseState,
          players: updatedPlayers,
          status: "over",
          winner: champ ? { name: champ.name, color: champ.color } : null,
          lastEliminated: eliminatedPlayer ? { name: eliminatedPlayer.name, reason, note } : null,
        };
        setState(overState);
      } else {
        const nextRound = baseState.round + 1;
        // Turn passes to the next SURVIVING player after the one just eliminated (seating order,
        // wrapping) — not back to player #1. (The eliminated player isn't in `surviving`, so the old
        // findIndex returned -1 and always fell back to surviving[0], i.e. player #1 every time.)
        const elimIdx = updatedPlayers.findIndex((p) => p.id === eliminatedId);
        let nextPlayer = surviving[0]!;
        for (let i = 1; i <= updatedPlayers.length; i++) {
          const cand = updatedPlayers[(elimIdx + i) % updatedPlayers.length];
          if (cand && !cand.eliminated) {
            nextPlayer = cand;
            break;
          }
        }

        const nextRoundState: LiveState = {
          ...baseState,
          count: 0,
          taken: {},
          lastK: null,
          lastMove: null,
          round: nextRound,
          players: updatedPlayers,
          currentId: nextPlayer.id,
          turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
          status: "playing",
          lastEliminated: eliminatedPlayer ? { name: eliminatedPlayer.name, reason, note } : null,
          lastSkillUsed: null,
        };

        setState(nextRoundState);
        processNextTurn(nextRoundState);
      }
    },
    [processNextTurn],
  );

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

      const botColors = ["#ff43c4", "#21e6d7", "#f4b942", "#a78bfa", "#38bdf8"];
      const enabledSkills = runtimeConfigRef.current.skills.filter((skill) => skill.enabled);
      const bots: LivePlayer[] = runtimeConfigRef.current.bots
        .filter((bot) => bot.enabled)
        .sort((a, b) => a.order - b.order)
        .slice(0, PRACTICE_BOT_COUNT)
        .map((bot, index) => {
          const equipped = enabledSkills
            .slice(index % Math.max(1, enabledSkills.length), (index % Math.max(1, enabledSkills.length)) + 2)
            .map((skill) => skill.id);
          const chosen = equipped.length === 2 ? equipped : enabledSkills.slice(0, 2).map((skill) => skill.id);
          const skills = { rewind: 0, turbo: 0, shield: 0, nudge: 0, double: 0 } as Record<SkillType, number>;
          if (mode === "skills") chosen.forEach((skill) => { skills[skill] = 1; });
          return {
            id: `cpu_${bot.id}`,
            name: bot.name,
            cpu: true,
            color: botColors[index % botColors.length]!,
            card: { difficulty: bot.difficulty, title: bot.title },
            avatar: { variantId: bot.avatarVariantId },
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

      const newState: LiveState = {
        mode: "practice",
        gameMode: mode,
        count: 0,
        players,
        currentId,
        lastK: null,
        lastMove: null,
        turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
        round: 1,
        status: "playing",
        winner: null,
        lastEliminated: null,
        taken: {},
        lastSkillUsed: null,
      };

      setMyId("player_local");
      setState(newState);
      // If a CPU leads (ambient game), start the bot turn chain now.
      if (players.find((p) => p.id === currentId)?.cpu) processNextTurn(newState);
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
    // Pure local mode for practice room — never connects to background headless tournament bot sockets.
    // Start the 24/7 ambient arena: 5 CPU cows already playing that a human can drop into any time.
    if (roomId === "practice") {
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
        setMyId(socket?.id ?? null);
        socket?.emit("watch", { roomId });
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
      mode: GameMode = "skills",
      chosenSkills: SkillType[] = ["rewind", "turbo"],
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

      // Seat the human so they're auto-re-added to every subsequent 24/7 game, then start now.
      humanSeatRef.current = { name, cos, mode, chosenSkills };
      startLocalGame(humanSeatRef.current);
    },
    [roomId, startLocalGame],
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
      if (!cur || cur.status !== "playing" || picks.length === 0 || !myId || cur.currentId !== myId)
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

  const useSkill = useCallback(
    (skill: SkillType) => {
      const cur = stateRef.current;
      if (
        !cur ||
        cur.status !== "playing" ||
        cur.gameMode !== "skills" ||
        !myId ||
        cur.currentId !== myId
      )
        return false;

      if (cur.count >= 22) return false;

      const player = cur.players.find((p) => p.id === myId);
      const available = player?.skills?.[skill] ?? 0;
      if (available <= 0) return false;

      const updatedPlayers = cur.players.map((p) => {
        if (p.id === myId && p.skills) {
          return {
            ...p,
            skills: {
              ...p.skills,
              [skill]: 0,
            },
          };
        }
        return p;
      });

      if (skill === "rewind") {
        soundManager.playSkillRewind();
        const newCount = Math.max(0, cur.count - 2);
        const newTaken = { ...cur.taken };
        delete newTaken[cur.count];
        delete newTaken[cur.count - 1];

        const nextState: LiveState = {
          ...cur,
          count: newCount,
          taken: newTaken,
          players: updatedPlayers,
          turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
          lastSkillUsed: {
            skill: "rewind",
            userName: player?.name ?? "Player",
            description: "Rewound the counter by -2! 🔄",
          },
        };
        setState(nextState);
        return true;
      }

      if (skill === "turbo") {
        soundManager.playSkillTurbo();
        const newCount = Math.min(30, cur.count + 3);
        const newTaken = { ...cur.taken };
        for (let i = cur.count + 1; i <= newCount; i++) {
          newTaken[i] = player?.color ?? "#5be348";
        }

        const nextState: LiveState = {
          ...cur,
          count: newCount,
          taken: newTaken,
          players: updatedPlayers,
          turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
          lastSkillUsed: {
            skill: "turbo",
            userName: player?.name ?? "Player",
            description: "Turbo Leaped +3 steps forward! ⚡",
          },
        };
        setState(nextState);
        return true;
      }

      if (skill === "shield") {
        soundManager.playSkillShield();
        const nextState: LiveState = {
          ...cur,
          players: updatedPlayers,
          turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
          lastSkillUsed: {
            skill: "shield",
            userName: player?.name ?? "Player",
            description: "Activated Divine Barrier Protection! 🛡️",
          },
        };
        setState(nextState);
        return true;
      }

      if (skill === "nudge") {
        soundManager.playClick();
        const survivingPlayers = cur.players.filter((p) => !p.eliminated);
        const currentIdx = survivingPlayers.findIndex((p) => p.id === myId);
        const nextPlayer = survivingPlayers[(currentIdx + 1) % survivingPlayers.length]!;

        const nextState: LiveState = {
          ...cur,
          players: updatedPlayers,
          currentId: nextPlayer.id,
          turnEndsAt: Date.now() + runtimeConfigRef.current.gameplay.turnSeconds * 1000,
          lastSkillUsed: {
            skill: "nudge",
            userName: player?.name ?? "Player",
            description: "Used Snooze to safely pass turn! ⏭️",
          },
        };
        setState(nextState);
        processNextTurn(nextState);
        return true;
      }

      return false;
    },
    [myId, processNextTurn],
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
    arm,
    submit,
    useSkill,
    triggerDefeat,
  };
}
