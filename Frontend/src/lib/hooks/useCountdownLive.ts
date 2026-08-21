"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { wsBaseUrl } from "../runtime-host";
import { getAuthState, useAuthStore, bootstrapSession } from "../../stores/auth-store";

export type LiveReason = "31" | "repeat" | "over3" | "skip" | "timeout" | "left";
export interface LiveTeam {
  name: string;
  color: string;
}
export interface LivePlayer {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  team?: LiveTeam;
  captain?: boolean; // team captain (influencer) — special card
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
  winner: { name: string; color: string; team?: LiveTeam } | null;
  lastEliminated: { name: string; reason: LiveReason } | null;
  taken: Record<number, string>;
  teamStandings?: { name: string; color: string; alive: number }[];
  startsAt?: number | null; // lobby: tournament start time (ms) for the GMT countdown
  spinEndsAt?: number | null; // kickoff wheel spin phase end (ms)
}

export interface JoinCosmetics {
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  team?: LiveTeam; // the player's own team (INFLUENCER tournaments)
  teams?: LiveTeam[]; // both team definitions (seeds CPU fillers across the two teams)
  captain?: boolean; // this player is the team captain (influencer)
  startAt?: number; // tournament start time (ms) — the game holds in a lobby until then
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

  // The access token is memory-only now (#4): on a fresh load it's null until it's re-minted from
  // the refresh cookie. A logged-in user must NOT open the socket with a missing token, or the
  // handshake authenticates as a guest and the server rejects the tournament join (leaving the
  // player stuck). So: kick the bootstrap, and for a logged-in user wait until the token exists.
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const ready = !user || !!accessToken; // guests connect immediately; members wait for their token

  useEffect(() => {
    void bootstrapSession();
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Pass the access token in the handshake so the server can authenticate tournament joins.
    const token = getAuthState().accessToken ?? undefined;
    const socket = io(`${wsBaseUrl()}/countdown`, { transports: ["websocket"], auth: { token } });
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
  }, [roomId, ready]);

  const join = useCallback(
    (name: string, cos?: JoinCosmetics) =>
      socketRef.current?.emit("join", { roomId, name, card: cos?.card, avatar: cos?.avatar, team: cos?.team, teams: cos?.teams, captain: cos?.captain, startAt: cos?.startAt }),
    [roomId],
  );
  const arm = useCallback(() => socketRef.current?.emit("arm", { roomId }), [roomId]);
  const submit = useCallback((picks: number[]) => socketRef.current?.emit("submit", { roomId, picks }), [roomId]);

  return { state, myId, join, arm, submit };
}
