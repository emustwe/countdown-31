import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

// A single live, always-on Count Down 31 game (practice). Players (guests, identified by their
// socket id) take turns saying 1–3 consecutive numbers counting up to 31. Breaking a rule — saying
// 31, repeating the previous player's count, skipping/non-consecutive, picking more than 3, or
// timing out (7s) — eliminates that player and starts a fresh round with everyone still in. The
// game never ends: with < 2 players it idles ("waiting"), and eliminated players may rejoin.
const TARGET = 31;
const TURN_MS = 7000;
const MIN_PLAYERS = 2;

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

@Injectable()
export class CountdownGameService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CountdownGameService.name);
  private players: LivePlayer[] = [];
  private count = 0;
  private lastK: number | null = null;
  private currentId: string | null = null;
  private turnEndsAt: number | null = null;
  private round = 0;
  private status: "waiting" | "playing" = "waiting";
  private lastEliminated: { name: string; reason: LiveReason } | null = null;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private broadcaster: ((state: LiveState) => void) | null = null;

  onModuleInit(): void {
    // Drives the 7-second turn timeout for the current player.
    this.tickHandle = setInterval(() => this.tick(), 300);
  }
  onModuleDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  setBroadcaster(fn: (state: LiveState) => void): void {
    this.broadcaster = fn;
  }

  getState(): LiveState {
    return {
      count: this.count,
      players: this.players.map((p) => ({ id: p.id, name: p.name })),
      currentId: this.currentId,
      lastK: this.lastK,
      turnEndsAt: this.turnEndsAt,
      round: this.round,
      status: this.status,
      lastEliminated: this.lastEliminated,
    };
  }

  private broadcast(): void {
    this.broadcaster?.(this.getState());
  }

  join(id: string, rawName: string): void {
    const name = (rawName || "Guest").trim().slice(0, 20) || "Guest";
    const existing = this.players.find((p) => p.id === id);
    if (existing) existing.name = name;
    else this.players.push({ id, name });
    if (this.status === "waiting" && this.players.length >= MIN_PLAYERS) this.beginRound(0);
    this.broadcast();
  }

  leave(id: string): void {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const wasCurrent = this.currentId === id;
    const [gone] = this.players.splice(idx, 1);
    if (this.players.length < MIN_PLAYERS) {
      this.status = "waiting";
      this.currentId = null;
      this.turnEndsAt = null;
      this.count = 0;
      this.lastK = null;
    } else if (wasCurrent) {
      // The player on turn left → fresh round starting from whoever took their slot.
      this.lastEliminated = { name: gone?.name ?? "Player", reason: "left" };
      this.beginRound(idx);
    }
    this.broadcast();
  }

  submit(id: string, rawPicks: unknown): void {
    if (this.status !== "playing" || id !== this.currentId) return;
    const picks = Array.isArray(rawPicks)
      ? [...new Set(rawPicks.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= TARGET))].sort((a, b) => a - b)
      : [];
    const m = picks.length;
    if (m === 0) return; // nothing submitted — wait for a real move or the timeout
    const consecutive = picks.every((v, i) => v === this.count + 1 + i);
    if (!consecutive) return this.eliminate(id, "skip");
    if (m > 3) return this.eliminate(id, "over3");
    if (this.lastK !== null && m === this.lastK) return this.eliminate(id, "repeat");
    const stop = this.count + m;
    this.count = stop;
    this.lastK = m;
    if (stop >= TARGET) return this.eliminate(id, "31");
    this.advanceTurn();
    this.broadcast();
  }

  private tick(): void {
    if (this.status !== "playing" || !this.turnEndsAt || !this.currentId) return;
    if (Date.now() > this.turnEndsAt) this.eliminate(this.currentId, "timeout");
  }

  private beginRound(starterIndex: number): void {
    this.count = 0;
    this.lastK = null;
    this.round += 1;
    if (this.players.length < MIN_PLAYERS) {
      this.status = "waiting";
      this.currentId = null;
      this.turnEndsAt = null;
      return;
    }
    const idx = ((starterIndex % this.players.length) + this.players.length) % this.players.length;
    this.currentId = this.players[idx]!.id;
    this.turnEndsAt = Date.now() + TURN_MS;
    this.status = "playing";
  }

  private advanceTurn(): void {
    const idx = this.players.findIndex((p) => p.id === this.currentId);
    const next = (idx + 1) % this.players.length;
    this.currentId = this.players[next]!.id;
    this.turnEndsAt = Date.now() + TURN_MS;
  }

  // Remove the losing player and start a fresh round with everyone else (or idle if < 2 remain).
  private eliminate(id: string, reason: LiveReason): void {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const [gone] = this.players.splice(idx, 1);
    this.lastEliminated = { name: gone?.name ?? "Player", reason };
    this.beginRound(idx); // idx now points at the next player → they start the new round
    this.broadcast();
  }
}
