"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { wsBaseUrl } from "../runtime-host";

export type LiveReason = "31" | "repeat" | "over3" | "skip" | "timeout" | "left";
export interface LivePlayer {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
}
export interface LiveState {
  mode: "practice" | "knockout";
  count: number;
  players: LivePlayer[];
  currentId: string | null;
  lastK: number | null;
  turnEndsAt: number | null;
  round: number;
  status: "waiting" | "playing" | "over";
  winner: { name: string; color: string } | null;
  lastEliminated: { name: string; reason: LiveReason } | null;
  taken: Record<number, string>;
}

export interface JoinCosmetics {
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
}

/**
 * Connects to a Count Down 31 room on the "/countdown" namespace. On connect the client WATCHES the
 * room (spectates the running game); it joins as a player only when the user picks a name via
 * join(). Rooms: "practice" (always-on) or "tour:<id>" (a tournament knockout). The timer starts
 * only when the current player arms it (their first pick).
 */
export function useCountdownLive(roomId = "practice") {
  const [state, setState] = useState<LiveState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${wsBaseUrl()}/countdown`, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setMyId(socket.id ?? null);
      socket.emit("watch", { roomId });
    });
    socket.on("state", (s: LiveState) => setState(s));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  const join = useCallback(
    (name: string, cos?: JoinCosmetics) => socketRef.current?.emit("join", { roomId, name, card: cos?.card, avatar: cos?.avatar }),
    [roomId],
  );
  const arm = useCallback(() => socketRef.current?.emit("arm", { roomId }), [roomId]);
  const submit = useCallback((picks: number[]) => socketRef.current?.emit("submit", { roomId, picks }), [roomId]);

  return { state, myId, join, arm, submit };
}
