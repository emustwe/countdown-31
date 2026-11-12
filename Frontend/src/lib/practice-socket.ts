"use client";

import { io, type Socket, type SocketOptions, type ManagerOptions } from "socket.io-client";
import { socketPath, wsBaseUrl } from "./runtime-host";
import { getAuthState } from "../stores/auth-store";
import type { LiveState } from "./hooks/useCountdownLive";

/**
 * LIVE PRACTICE — the one switch. (Lives here, re-exported by useCountdownLive, so the lobby can read
 * it without pulling the whole game hook into its bundle.)
 *
 * `true`  → practice joins the SERVER's always-on "practice" room, so everyone who opens it is in the
 *           same game, sees the same players and waits for the same turns.
 * `false` → practice runs a private in-browser engine per device (the old behaviour): every player
 *           got their own game with their own bots and never saw anyone else.
 *
 * The server room already existed — see countdown.service.ts, "one always-on practice room (5 CPU
 * players, rounds reset and eliminated players/CPUs rejoin)". The frontend simply never connected to
 * it: the effect in useCountdownLive short-circuited on `roomId === "practice"` before a socket was
 * ever opened.
 *
 * Set to false to go back. The local engine is untouched and still used as the fallback whenever the
 * socket cannot connect, so a server outage degrades to a playable game rather than an empty screen.
 */
export const LIVE_PRACTICE = true;

/**
 * Socket options shared by the arena and the lobby's early connection, so the two can never drift.
 *
 * `timeout` was 3s. On a phone (airport Wi-Fi, a weak cell) the handshake alone can take longer than
 * that — measured 0.8-1.1s from a fast desktop in Dubai, before any radio latency — and a timeout in
 * practice does not just retry: it starts the PRIVATE in-browser game, which the server's room then
 * replaces a moment later when the retry lands. 6s keeps a slow phone in the real room.
 *
 * `auth.watch` asks the server to send the room's snapshot in the same flight as the connect itself
 * (countdown.gateway.ts handleConnection), saving the round trip a separate "watch" message costs.
 * The client still emits "watch" on connect, so an older server behaves exactly as before.
 */
export function countdownSocketOptions(roomId: string): Partial<ManagerOptions & SocketOptions> {
  return {
    // "/countdown" is the NAMESPACE; this is the transport path, which differs in production because
    // the API is proxied under /api. See socketPath().
    path: socketPath(),
    transports: ["websocket"],
    timeout: 6000,
    reconnectionAttempts: 2,
    auth: { token: getAuthState().accessToken ?? undefined, watch: roomId },
  };
}

export function countdownSocketUrl(): string {
  return `${wsBaseUrl()}/countdown`;
}

/**
 * THE EARLY CONNECTION.
 *
 * Opening the arena used to be strictly sequential: download + hydrate the page, mount the arena,
 * THEN open the socket, THEN four network round trips (TCP/TLS → websocket → namespace → watch →
 * state) at ~250-300ms each through Cloudflare. Measured on production: the page was ready at 2.3s
 * and the players only appeared at 4.9s — the empty "0 / 0 ALIVE" board in between.
 *
 * The lobby now opens this socket the moment it mounts, so the whole handshake happens while the
 * player is reading the menu or turning their phone. The arena then TAKES the socket (and the latest
 * room state it has been receiving) instead of starting from nothing, and the board is populated on
 * its very first frame.
 *
 * Bounded: a socket nobody takes is closed after IDLE_MS, so a player who opens the lobby and walks
 * away is not left holding a connection.
 */
const IDLE_MS = 90_000;

type Warm = {
  socket: Socket;
  last: LiveState | null;
  idle: ReturnType<typeof setTimeout>;
  onConnect: () => void;
  onState: (s: LiveState) => void;
  onGiveUp: () => void;
};
let warm: Warm | null = null;

function discard(w: Warm) {
  clearTimeout(w.idle);
  w.socket.off("connect", w.onConnect);
  w.socket.off("state", w.onState);
  w.socket.io.off("reconnect_failed", w.onGiveUp);
}

/** Start (or keep alive) the early practice connection. Safe to call repeatedly. */
export function prewarmPracticeSocket(): void {
  if (typeof window === "undefined" || !LIVE_PRACTICE) return;
  if (warm) {
    if (warm.socket.active) {
      // Still connected or still trying — just push the idle deadline back.
      const w = warm;
      clearTimeout(w.idle);
      w.idle = setTimeout(() => closeWarm(w), IDLE_MS);
      return;
    }
    closeWarm(warm);
  }
  try {
    const socket = io(countdownSocketUrl(), countdownSocketOptions("practice"));
    const w: Warm = {
      socket,
      last: null,
      idle: setTimeout(() => closeWarm(w), IDLE_MS),
      onConnect: () => socket.emit("watch", { roomId: "practice" }),
      onState: (s) => {
        w.last = s;
      },
      onGiveUp: () => closeWarm(w),
    };
    socket.on("connect", w.onConnect);
    socket.on("state", w.onState);
    socket.io.on("reconnect_failed", w.onGiveUp);
    warm = w;
  } catch {
    warm = null;
  }
}

function closeWarm(w: Warm) {
  discard(w);
  w.socket.disconnect();
  if (warm === w) warm = null;
}

/**
 * The room state the early connection already has, WITHOUT taking the socket — so the arena can
 * render populated on its first frame (read in a useState initialiser).
 */
export function peekPracticeState(): LiveState | null {
  return warm && warm.socket.active ? warm.last : null;
}

/**
 * Hand the early connection over to the arena. Returns null when there is none (direct link to the
 * game, idle timeout, or it gave up) — the arena then opens its own socket exactly as before.
 * After this the caller owns the socket, including disconnecting it.
 */
export function takePracticeSocket(): { socket: Socket; last: LiveState | null } | null {
  const w = warm;
  warm = null;
  if (!w) return null;
  discard(w);
  if (!w.socket.active) {
    w.socket.disconnect();
    return null;
  }
  return { socket: w.socket, last: w.last };
}
