import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";

// Live Count Down 31 games. There is one always-on "practice" room (5 CPU players, rounds reset and
// eliminated players/CPUs rejoin), plus a room per tournament ("tour:<id>") in KNOCKOUT mode where
// an elimination puts the player OUT for good and the field shrinks until one winner remains.
//
// Players take turns saying 1–3 consecutive numbers up to 31. Breaking a rule — saying 31, repeating
// the previous count, skipping, picking >3, or timing out — eliminates them.
const TARGET = 31;
const TURN_MS = 7000; // the "hurry up" timer, started only once a player picks their first number
const IDLE_MS = 25000; // safety: auto-skip a player who never picks anything
const MIN_PLAYERS = 2;
const BOT_REJOIN_MS = 3500;
const PRACTICE_BOTS = ["Ava", "Leo", "Mia", "Max", "Zoe"];
const KNOCKOUT_FILLERS = ["Rex", "Nova", "Kai", "Zara", "Milo", "Ivy"]; // test opponents in a tournament
// Fallback player colours (used when a player's card has no colour). Kept visually distinct.
const PALETTE = ["#f4b942", "#5aa8ff", "#c87bff", "#5adc8c", "#ff6b7f", "#26c6da", "#9b6bff", "#ff8a3d", "#7dd3fc", "#f472b6", "#a3e635", "#fca5a5"];

export type LiveReason = "31" | "repeat" | "over3" | "skip" | "timeout" | "left";
type Mode = "practice" | "knockout";

interface Cosmetics {
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
}
interface Player {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
}
export interface LivePlayer {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
}
export interface LiveState {
  mode: Mode;
  count: number;
  players: LivePlayer[];
  currentId: string | null;
  lastK: number | null;
  turnEndsAt: number | null;
  round: number;
  status: "waiting" | "playing" | "over";
  winner: { name: string; color: string } | null;
  lastEliminated: { name: string; reason: LiveReason } | null;
  taken: Record<number, string>; // number -> colour of the player who took it (this round)
}

function isBot(id: string): boolean {
  return id.startsWith("bot:");
}
function hexOk(v: unknown): v is string {
  return typeof v === "string" && /^#?[0-9a-fA-F]{6}$/.test(v);
}

class Room {
  players: Player[] = [];
  count = 0;
  lastK: number | null = null;
  currentId: string | null = null;
  turnEndsAt: number | null = null; // null until the current human "arms" the timer with a first pick
  idleEndsAt: number | null = null;
  botActAt: number | null = null;
  round = 0;
  status: "waiting" | "playing" | "over" = "waiting";
  winner: { name: string; color: string } | null = null;
  lastEliminated: { name: string; reason: LiveReason } | null = null;
  taken: Record<number, string> = {};

  constructor(
    readonly mode: Mode,
    private readonly onChange: () => void,
  ) {
    // The practice room is always populated with CPU players and running.
    if (mode === "practice") {
      this.seedFillers();
      this.beginRound(0);
    }
  }

  private colorFor(index: number, card?: Record<string, unknown>): string {
    const c = card?.color;
    if (hexOk(c)) return (c as string).startsWith("#") ? (c as string) : `#${c}`;
    return PALETTE[index % PALETTE.length]!;
  }

  private addBot(name: string): void {
    const id = `bot:${name}`;
    if (this.players.some((p) => p.id === id)) return;
    this.players.push({ id, name, cpu: true, color: this.colorFor(this.players.length) });
  }

  private seedFillers(): void {
    if (this.mode === "practice") {
      for (const n of PRACTICE_BOTS) this.addBot(n);
    } else {
      // knockout: seed a handful of test opponents so a solo tester can watch the field shrink.
      for (const n of KNOCKOUT_FILLERS) this.addBot(n);
    }
  }

  join(id: string, rawName: string, cos?: Cosmetics): void {
    const name = (rawName || "Guest").trim().slice(0, 20) || "Guest";
    const existing = this.players.find((p) => p.id === id);
    if (existing) {
      existing.name = name;
      if (cos?.card) existing.card = cos.card;
      if (cos?.avatar) existing.avatar = cos.avatar;
      existing.color = this.colorFor(this.players.indexOf(existing), cos?.card);
    } else {
      this.players.push({ id, name, cpu: false, color: this.colorFor(this.players.length, cos?.card), card: cos?.card, avatar: cos?.avatar });
    }
    // (Re)start when there's a field to play. Knockout rooms seed test opponents on first join / restart.
    if (this.status !== "playing") {
      if (this.mode === "knockout" && this.status === "over") this.reset();
      if (this.mode === "knockout" && this.players.filter((p) => p.cpu).length === 0) this.seedFillers();
      if (this.players.length >= MIN_PLAYERS) this.beginRound(0);
    }
    this.onChange();
  }

  leave(id: string): void {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const wasCurrent = this.currentId === id;
    const [gone] = this.players.splice(idx, 1);
    if (this.players.length < MIN_PLAYERS) {
      this.status = this.mode === "knockout" && this.players.length === 1 ? "over" : "waiting";
      if (this.status === "over") this.winner = this.players[0] ? { name: this.players[0].name, color: this.players[0].color } : null;
      this.currentId = null;
      this.turnEndsAt = null;
      this.idleEndsAt = null;
      this.botActAt = null;
    } else if (wasCurrent) {
      this.lastEliminated = { name: gone?.name ?? "Player", reason: "left" };
      this.beginRound(idx);
    }
    this.onChange();
  }

  arm(id: string): void {
    if (this.status !== "playing" || id !== this.currentId) return;
    if (this.turnEndsAt !== null) return; // already armed
    if (isBot(id)) return;
    this.turnEndsAt = Date.now() + TURN_MS;
    this.idleEndsAt = null;
    this.onChange();
  }

  submit(id: string, rawPicks: unknown): void {
    if (this.status !== "playing" || id !== this.currentId) return;
    const picks = Array.isArray(rawPicks)
      ? [...new Set(rawPicks.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= TARGET))].sort((a, b) => a - b)
      : [];
    const m = picks.length;
    if (m === 0) return;
    const consecutive = picks.every((v, i) => v === this.count + 1 + i);
    if (!consecutive) return this.eliminate(id, "skip");
    if (m > 3) return this.eliminate(id, "over3");
    if (this.lastK !== null && m === this.lastK) return this.eliminate(id, "repeat");
    const player = this.players.find((p) => p.id === id);
    const color = player?.color ?? PALETTE[0]!;
    for (const n of picks) this.taken[n] = color;
    this.count = this.count + m;
    this.lastK = m;
    if (this.count >= TARGET) return this.eliminate(id, "31");
    this.advanceTurn();
    this.onChange();
  }

  tick(): void {
    if (this.status !== "playing" || !this.currentId) return;
    if (isBot(this.currentId) && this.botActAt && Date.now() >= this.botActAt) {
      this.botActAt = null;
      this.submit(this.currentId, this.botPicks());
      return;
    }
    if (this.turnEndsAt && Date.now() > this.turnEndsAt) return this.eliminate(this.currentId, "timeout");
    if (this.idleEndsAt && Date.now() > this.idleEndsAt) return this.eliminate(this.currentId, "timeout");
  }

  private botPicks(): number[] {
    const opts = [1, 2, 3].filter((mm) => mm !== this.lastK && this.count + mm <= TARGET);
    const safe = opts.filter((mm) => this.count + mm < TARGET);
    const pool = safe.length ? safe : opts.length ? opts : [1];
    const m = pool[Math.floor(Math.random() * pool.length)]!;
    return Array.from({ length: m }, (_, i) => this.count + 1 + i);
  }

  private armTurn(): void {
    // Bots get an immediate think-timer; humans start with NO timer until they pick (arm).
    if (isBot(this.currentId ?? "")) {
      this.turnEndsAt = Date.now() + TURN_MS;
      this.idleEndsAt = null;
      this.botActAt = Date.now() + 900 + Math.floor(Math.random() * 1400);
    } else {
      this.turnEndsAt = null;
      this.idleEndsAt = Date.now() + IDLE_MS;
      this.botActAt = null;
    }
  }

  private beginRound(starterIndex: number): void {
    this.count = 0;
    this.lastK = null;
    this.taken = {};
    this.round += 1;
    if (this.players.length < MIN_PLAYERS) {
      this.status = this.mode === "knockout" && this.players.length === 1 ? "over" : "waiting";
      if (this.status === "over") this.winner = this.players[0] ? { name: this.players[0].name, color: this.players[0].color } : null;
      this.currentId = null;
      this.turnEndsAt = null;
      this.idleEndsAt = null;
      this.botActAt = null;
      return;
    }
    const idx = ((starterIndex % this.players.length) + this.players.length) % this.players.length;
    this.currentId = this.players[idx]!.id;
    this.status = "playing";
    this.armTurn();
  }

  private advanceTurn(): void {
    const idx = this.players.findIndex((p) => p.id === this.currentId);
    const next = (idx + 1) % this.players.length;
    this.currentId = this.players[next]!.id;
    this.armTurn();
  }

  private eliminate(id: string, reason: LiveReason): void {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const [gone] = this.players.splice(idx, 1);
    this.lastEliminated = { name: gone?.name ?? "Player", reason };

    if (this.mode === "practice") {
      // Practice: eliminated CPUs rejoin so the game stays populated.
      if (gone && gone.cpu) {
        setTimeout(() => {
          this.addBot(gone.name);
          if (this.status !== "playing" && this.players.length >= MIN_PLAYERS) this.beginRound(0);
          this.onChange();
        }, BOT_REJOIN_MS);
      }
      this.beginRound(idx);
    } else {
      // Knockout: the player is OUT for good — the field shrinks. Last one standing wins.
      if (this.players.length <= 1) {
        this.status = "over";
        this.winner = this.players[0] ? { name: this.players[0].name, color: this.players[0].color } : null;
        this.currentId = null;
        this.turnEndsAt = null;
        this.idleEndsAt = null;
        this.botActAt = null;
      } else {
        this.beginRound(idx);
      }
    }
    this.onChange();
  }

  // Reset a finished knockout room for a fresh game (test opponents re-seeded on next join).
  private reset(): void {
    this.players = this.players.filter((p) => !p.cpu);
    this.status = "waiting";
    this.winner = null;
    this.lastEliminated = null;
    this.count = 0;
    this.lastK = null;
    this.taken = {};
    this.currentId = null;
    this.turnEndsAt = null;
    this.idleEndsAt = null;
    this.botActAt = null;
  }

  getState(): LiveState {
    return {
      mode: this.mode,
      count: this.count,
      players: this.players.map((p) => ({ id: p.id, name: p.name, cpu: p.cpu, color: p.color, card: p.card, avatar: p.avatar })),
      currentId: this.currentId,
      lastK: this.lastK,
      turnEndsAt: this.turnEndsAt,
      round: this.round,
      status: this.status,
      winner: this.winner,
      lastEliminated: this.lastEliminated,
      taken: this.taken,
    };
  }
}

@Injectable()
export class CountdownGameService implements OnModuleInit, OnModuleDestroy {
  private rooms = new Map<string, Room>();
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private broadcaster: ((roomId: string, state: LiveState) => void) | null = null;

  onModuleInit(): void {
    this.getRoom("practice"); // the always-on practice room
    this.tickHandle = setInterval(() => {
      for (const room of this.rooms.values()) room.tick();
    }, 300);
  }
  onModuleDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
  }

  setBroadcaster(fn: (roomId: string, state: LiveState) => void): void {
    this.broadcaster = fn;
  }

  private modeFor(roomId: string): Mode {
    return roomId === "practice" ? "practice" : "knockout";
  }

  private getRoom(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      const created = new Room(this.modeFor(roomId), () => this.broadcaster?.(roomId, created.getState()));
      room = created;
      this.rooms.set(roomId, room);
    }
    return room;
  }

  getState(roomId: string): LiveState {
    return this.getRoom(roomId).getState();
  }

  join(roomId: string, socketId: string, name: string, cos?: Cosmetics): void {
    this.getRoom(roomId).join(socketId, name, cos);
  }
  submit(roomId: string, socketId: string, picks: unknown): void {
    this.getRoom(roomId).submit(socketId, picks);
  }
  arm(roomId: string, socketId: string): void {
    this.getRoom(roomId).arm(socketId);
  }
  // A disconnecting socket may be in any room — remove it from all.
  leaveAll(socketId: string): void {
    for (const room of this.rooms.values()) room.leave(socketId);
  }
  leave(roomId: string, socketId: string): void {
    this.rooms.get(roomId)?.leave(socketId);
  }
}
