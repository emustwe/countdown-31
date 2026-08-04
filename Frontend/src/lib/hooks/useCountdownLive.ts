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
 * Connects to the live, always-on Count Down 31 game on the "/countdown" namespace. Joins with a
 * display name (guest — no account needed), receives the shared game state in real time, and can
 * submit a move or rejoin after being eliminated.
 */
export function useCountdownLive(username: string) {
  const [state, setState] = useState<LiveState | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const nameRef = useRef(username);
  nameRef.current = username;

  useEffect(() => {
    const socket = io(`${WS_URL}/countdown`, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      setMyId(socket.id ?? null);
      socket.emit("join", { name: nameRef.current });
    });
    socket.on("state", (s: LiveState) => setState(s));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const submit = useCallback((picks: number[]) => {
    socketRef.current?.emit("submit", { picks });
  }, []);
  const rejoin = useCallback(() => {
    socketRef.current?.emit("join", { name: nameRef.current });
  }, []);

  return { state, myId, submit, rejoin };
}
