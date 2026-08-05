import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

// A single live, always-on Count Down 31 game (practice). Five CPU players are always in the game so
// it is active 24/7; real visitors (identified by socket id) join on top by choosing a name. Players
// take turns saying 1–3 consecutive numbers counting up to 31. Breaking a rule — saying 31,
// repeating the previous player's count, skipping/non-consecutive, picking more than 3, or timing
// out (7s) — eliminates that player and starts a fresh round. An eliminated CPU rejoins shortly (so
// there are always ~5 CPUs); an eliminated visitor can rejoin with one click.
const TARGET = 31;
const TURN_MS = 7000;
const MIN_PLAYERS = 2;
const BOT_NAMES = ["Ava", "Leo", "Mia", "Max", "Zoe"]; // 5 always-on CPU players
const BOT_REJOIN_MS = 3500;

export interface LivePlayer {
  id: string;
  name: string;
  cpu?: boolean;
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
  private botActAt: number | null = null; // when the current CPU player should move
  private round = 0;
  private status: "waiting" | "playing" = "waiting";
  private lastEliminated: { name: string; reason: LiveReason } | null = null;
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private broadcaster: ((state: LiveState) => void) | null = null;

  onModuleInit(): void {
    for (const name of BOT_NAMES) this.addBot(name);
    this.beginRound(0);
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
      players: this.players.map((p) => ({ id: p.id, name: p.name, cpu: p.cpu })),
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

  private isBot(id: string | null): boolean {
    return !!id && id.startsWith("bot:");
  }
  private addBot(name: string): void {
    const id = `bot:${name}`;
    if (!this.players.some((p) => p.id === id)) this.players.push({ id, name, cpu: true });
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
      this.botActAt = null;
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
    // CPU turn: play after a short, human-ish "think" delay.
    if (this.isBot(this.currentId) && this.botActAt && Date.now() >= this.botActAt) {
      this.botActAt = null;
      this.submit(this.currentId, this.botPicks());
      return;
    }
    if (Date.now() > this.turnEndsAt) this.eliminate(this.currentId, "timeout");
  }

  // A valid CPU move: 1–3 consecutive numbers, not repeating the last count, preferring not to hit
  // 31 (so it usually survives, but will be forced to lose near the end — creating natural turnover).
  private botPicks(): number[] {
    const opts = [1, 2, 3].filter((mm) => mm !== this.lastK && this.count + mm <= TARGET);
    const safe = opts.filter((mm) => this.count + mm < TARGET);
    const pool = safe.length ? safe : opts.length ? opts : [1];
    const m = pool[Math.floor(Math.random() * pool.length)]!;
    return Array.from({ length: m }, (_, i) => this.count + 1 + i);
  }

  private armBotTimer(): void {
    this.botActAt = this.isBot(this.currentId) ? Date.now() + 900 + Math.floor(Math.random() * 1400) : null;
  }

  private beginRound(starterIndex: number): void {
    this.count = 0;
    this.lastK = null;
    this.round += 1;
    if (this.players.length < MIN_PLAYERS) {
      this.status = "waiting";
      this.currentId = null;
      this.turnEndsAt = null;
      this.botActAt = null;
      return;
    }
    const idx = ((starterIndex % this.players.length) + this.players.length) % this.players.length;
    this.currentId = this.players[idx]!.id;
    this.turnEndsAt = Date.now() + TURN_MS;
    this.status = "playing";
    this.armBotTimer();
  }

  private advanceTurn(): void {
    const idx = this.players.findIndex((p) => p.id === this.currentId);
    const next = (idx + 1) % this.players.length;
    this.currentId = this.players[next]!.id;
    this.turnEndsAt = Date.now() + TURN_MS;
    this.armBotTimer();
  }

  // Remove the losing player and start a fresh round with everyone else (or idle if < 2 remain). A
  // CPU rejoins after a short delay so the game always stays populated.
  private eliminate(id: string, reason: LiveReason): void {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const [gone] = this.players.splice(idx, 1);
    this.lastEliminated = { name: gone?.name ?? "Player", reason };
    if (gone && this.isBot(gone.id)) {
      setTimeout(() => {
        this.addBot(gone.name);
        if (this.status === "waiting" && this.players.length >= MIN_PLAYERS) this.beginRound(0);
        this.broadcast();
      }, BOT_REJOIN_MS);
    }
    this.beginRound(idx); // idx now points at the next player → they start the new round
    this.broadcast();
  }
}
