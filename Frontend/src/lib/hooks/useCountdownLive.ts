"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000";

export interface LivePlayer {
  id: string;
  name: string;
}
export type LiveReason = "31" | "repeat" | "over3" | "skip" | "timeout" | "left";
export interface LiveState {
  count: number;
  players: LivePlayer[];
  currentId: string | null;
  lastK: number | null;
  turnEndsAt: number | null;
  round: number;
  status: "waiting" | "playing";
  lastEliminated: { name: string; reason: LiveReason } | null;
}

/**
 * Connects to the live, always-on Count Down 31 game on the "/countdown" namespace. On connect the
 * client only SPECTATES (sees the running game with its CPU players); it joins the game as a player
 * only when the user chooses a name and calls join(). Break a rule and you're out — call join()
 * again to rejoin.
 */
export function useCountdownLive() {
  const [state, setState] = useState<LiveState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${WS_URL}/countdown`, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => setMyId(socket.id ?? null));
    socket.on("state", (s: LiveState) => setState(s));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const join = useCallback((name: string) => {
    socketRef.current?.emit("join", { name });
  }, []);
  const submit = useCallback((picks: number[]) => {
    socketRef.current?.emit("submit", { picks });
  }, []);

  return { state, myId, join, submit };
}
