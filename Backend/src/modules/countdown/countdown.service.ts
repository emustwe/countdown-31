import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { PlatformConfigService } from "../platform-config/platform-config.service";
import type { GameConfig } from "../platform-config/game-config.schema";

// Live Count Down 31 games. There is one always-on "practice" room (5 CPU players, rounds reset and
// eliminated players/CPUs rejoin), plus a room per tournament ("tour:<id>") in KNOCKOUT mode where
// an elimination puts the player OUT for good and the field shrinks until one winner remains.
//
// Players take turns saying 1–3 consecutive numbers up to 31. Breaking a rule — saying 31, repeating
// the previous count, skipping, picking >3, or timing out — eliminates them.
const TARGET = 31;
const WHEEL_MS = 6500; // the kickoff wheel spins this long (for everyone at once) before turn 1
// On each knockout elimination the WHOLE game freezes this long for the cow dance — set to the lose
// clip's length (~8.0s) plus a hair of headroom. The client plays the clip ONCE (no loop), so the
// freeze should match the clip: too long and the cow holds its last frame ("extra" seconds); too
// short and the clip is cut off. Re-measure the clip (headless `<video>.duration`) if it changes.
const DANCE_MS = 8150;
const MIN_PLAYERS = 2;
const MAX_ROOMS = 2000; // backstop against unbounded room creation from watch/join floods
const BOT_REJOIN_MS = 3500;
// Fallback player colours (used when a player's card has no colour). Kept visually distinct.
const PALETTE = [
  "#f4b942",
  "#5aa8ff",
  "#c87bff",
  "#5adc8c",
  "#ff6b7f",
  "#26c6da",
  "#9b6bff",
  "#ff8a3d",
  "#7dd3fc",
  "#f472b6",
  "#a3e635",
  "#fca5a5",
];

export type LiveReason = "31" | "repeat" | "over3" | "skip" | "timeout" | "left";
type Mode = "practice" | "knockout";

interface Cosmetics {
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  startAt?: number; // tournament start time (ms) — the game holds in a lobby until then
  skills?: string[]; // the loadout the player LOCKED IN at join (0–2 skills), used all tournament
}
interface Player {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  skills?: Record<string, number>; // remaining charges per skill (1 charge each for the tournament)
  equippedSkills?: string[]; // the locked loadout (for display)
}
export interface LivePlayer {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  skills?: Record<string, number>;
  equippedSkills?: string[];
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
  winner: { id: string; name: string; color: string } | null;
  lastEliminated: { name: string; reason: LiveReason } | null;
  // The previous player's full move (all 1–3 numbers they took) so the next player sees exactly what
  // was picked — not just a single "PREV" tile.
  lastMove: { playerId: string; playerName: string; playerColor: string; picks: number[]; count: number } | null;
  taken: Record<number, string>; // number -> colour of the player who took it (this round)
  startsAt: number | null; // lobby: when the tournament begins (ms) — clients show a GMT countdown
  spinEndsAt: number | null; // kickoff wheel is spinning until this ms (turn 1 starts after)
  danceEndsAt: number | null; // elimination cow-dance: whole game frozen for everyone until this ms
}

// What the room does once an elimination cow-dance finishes. `reset` = start a fresh count from 0 (a
// new lap — only when someone was forced to say 31); otherwise the count CONTINUES from where it was.
type PendingResume =
  | { type: "round"; idx: number; reset: boolean }
  | { type: "end"; winner: { id: string; name: string; color: string } | null };

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
  turnEndsAt: number | null = null; // every turn is on a 7s countdown; miss it → eliminated
  botActAt: number | null = null;
  round = 0;
  status: "waiting" | "playing" | "over" = "waiting";
  startAt: number | null = null; // tournament start (ms). Game holds in a lobby until then.
  spinEndsAt: number | null = null; // kickoff wheel spin phase (turn 1 arms after this)
  danceEndsAt: number | null = null; // elimination cow-dance freeze (game resumes after this)
  pendingResume: PendingResume | null = null; // what to do when the cow-dance ends
  winner: { id: string; name: string; color: string } | null = null;
  lastEliminated: { name: string; reason: LiveReason } | null = null;
  lastMove: { playerId: string; playerName: string; playerColor: string; picks: number[]; count: number } | null = null;
  taken: Record<number, string> = {};
  // Knockout only: ids of players eliminated for good. They may keep watching but can never rejoin.
  eliminated: Set<string> = new Set();

  constructor(
    readonly mode: Mode,
    private readonly onChange: () => void,
    private runtime: GameConfig,
  ) {
    // The practice room is always populated with CPU players and running.
    if (mode === "practice") {
      this.seedFillers();
      this.beginRound(0);
    }
  }

  updateConfig(config: GameConfig): void {
    this.runtime = config;
  }

  private colorFor(index: number, card?: Record<string, unknown>): string {
    const c = card?.color;
    if (hexOk(c)) return (c as string).startsWith("#") ? (c as string) : `#${c}`;
    return PALETTE[index % PALETTE.length]!;
  }

  private addBot(name: string, avatarVariantId?: string): void {
    const id = `bot:${name}`;
    if (this.players.some((p) => p.id === id)) return;
    this.players.push({
      id,
      name,
      cpu: true,
      color: this.colorFor(this.players.length),
      avatar: avatarVariantId ? { variantId: avatarVariantId } : undefined,
    });
  }

  private makeWinner(p: Player | undefined): { id: string; name: string; color: string } | null {
    return p ? { id: p.id, name: p.name, color: p.color } : null;
  }

  // CPU fillers exist ONLY in the always-on practice room. Real tournaments have no bots.
  private seedFillers(): void {
    if (this.mode === "practice") {
      for (const bot of this.runtime.bots
        .filter((item) => item.enabled)
        .sort((a, b) => a.order - b.order)
        .slice(0, this.runtime.gameplay.defaultBotCount)) {
        this.addBot(bot.name, bot.avatarVariantId);
      }
    }
  }

  join(id: string, rawName: string, cos?: Cosmetics): void {
    const name = (rawName || "Guest").trim().slice(0, 20) || "Guest";
    // Real tournament (knockout): once you're eliminated you're OUT for good — you may keep watching
    // but can never rejoin. Also, a finished knockout does not restart (no "play again").
    if (this.mode === "knockout") {
      if (this.eliminated.has(id)) return;
      if (this.status === "over") return;
    }
    // The first joiner carrying a start time schedules the room — everyone waits in a lobby with a
    // GMT countdown until then, and the game begins for all players at the same moment.
    if (this.mode === "knockout" && cos?.startAt && this.startAt === null)
      this.startAt = cos.startAt;
    // Build the player's skill inventory from their locked loadout (1 charge per equipped skill).
    const equippedSkills = Array.from(new Set(cos?.skills ?? [])).slice(0, 2);
    const skillCharges: Record<string, number> = {};
    for (const s of equippedSkills) skillCharges[s] = 1;

    const existing = this.players.find((p) => p.id === id);
    if (existing) {
      existing.name = name;
      if (cos?.card) existing.card = cos.card;
      if (cos?.avatar) existing.avatar = cos.avatar;
      existing.color = this.colorFor(this.players.indexOf(existing), cos?.card);
      // Only set the locked loadout the first time (it can't be changed after joining).
      if (existing.equippedSkills === undefined && equippedSkills.length) {
        existing.equippedSkills = equippedSkills;
        existing.skills = skillCharges;
      }
    } else {
      this.players.push({
        id,
        name,
        cpu: false,
        color: this.colorFor(this.players.length, cos?.card),
        card: cos?.card,
        avatar: cos?.avatar,
        equippedSkills,
        skills: skillCharges,
      });
    }
    if (this.status !== "playing") {
      if (this.mode === "knockout") {
        // Real tournament: the game is started by tick() ONLY — never here in join(). This matters
        // because we seed the whole registered roster with several join() calls in a row; if join()
        // could start the game it would fire as soon as the first 2 seats existed, dropping everyone
        // seeded afterwards. tick() starts it once the full roster is in place and the start time has
        // arrived (for everyone at once).
      } else {
        // Practice room: always-on, begins as soon as there's a field.
        if (this.players.length >= MIN_PLAYERS) this.beginRound(this.randomStart());
      }
    }
    this.onChange();
  }

  private randomStart(): number {
    return Math.floor(Math.random() * this.players.length);
  }

  leave(id: string): void {
    const idx = this.players.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const wasCurrent = this.currentId === id;
    const [gone] = this.players.splice(idx, 1);
    if (this.players.length < MIN_PLAYERS) {
      this.status = this.mode === "knockout" && this.players.length === 1 ? "over" : "waiting";
      if (this.status === "over") this.winner = this.makeWinner(this.players[0]);
      this.currentId = null;
      this.turnEndsAt = null;
      this.spinEndsAt = null;
      this.botActAt = null;
    } else if (wasCurrent) {
      this.lastEliminated = { name: gone?.name ?? "Player", reason: "left" };
      this.beginRound(idx);
    }
    this.onChange();
  }

  // Kept for client compatibility. Turns now auto-start their 7s countdown, so arming is a no-op
  // unless the countdown somehow hasn't started yet.
  arm(id: string): void {
    if (this.status !== "playing" || id !== this.currentId) return;
    if (this.turnEndsAt !== null || this.spinEndsAt !== null) return;
    this.turnEndsAt = Date.now() + this.runtime.gameplay.turnSeconds * 1000;
    this.onChange();
  }

  submit(id: string, rawPicks: unknown): void {
    if (this.status !== "playing" || id !== this.currentId) return;
    const picks = Array.isArray(rawPicks)
      ? [
          ...new Set(
            rawPicks.filter((n): n is number => Number.isInteger(n) && n >= 1 && n <= TARGET),
          ),
        ].sort((a, b) => a - b)
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
    // Record the FULL move so the next player sees every number this player took (not just one).
    this.lastMove = { playerId: id, playerName: player?.name ?? "Player", playerColor: color, picks, count: m };
    this.count = this.count + m;
    this.lastK = m;
    if (this.count >= TARGET) return this.eliminate(id, "31");
    this.advanceTurn();
    this.onChange();
  }

  /** Play a LOCKED skill on your turn. A skill IS your whole turn (you don't also submit numbers):
   * it applies its effect and passes the turn. Each skill has a single charge for the tournament and
   * is locked out once the count reaches the danger zone (>= 22). */
  useSkill(id: string, skill: string): void {
    if (this.status !== "playing" || id !== this.currentId) return;
    if (this.spinEndsAt !== null || this.turnEndsAt === null) return; // not mid-turn (spin/lobby)
    if (this.count >= 22) return; // skills lock in the danger zone
    const player = this.players.find((p) => p.id === id);
    if (!player?.skills || (player.skills[skill] ?? 0) <= 0) return;

    player.skills = { ...player.skills, [skill]: 0 }; // consume the single charge

    if (skill === "rewind") {
      const newCount = Math.max(0, this.count - 2);
      delete this.taken[this.count];
      delete this.taken[this.count - 1];
      this.count = newCount;
    } else if (skill === "turbo") {
      const newCount = Math.min(TARGET - 1, this.count + 3);
      for (let n = this.count + 1; n <= newCount; n++) this.taken[n] = player.color;
      this.count = newCount;
    } // "shield" / "nudge" change nothing on the board — they simply pass the turn.

    this.lastK = null; // a skill isn't a digit-count move, so it carries no repeat constraint
    this.lastMove = null; // and it isn't a number pick, so there's no "PREV" tiles to show
    this.advanceTurn();
    this.onChange();
  }

  tick(): void {
    const now = Date.now();
    // Lobby: once the scheduled start time arrives, begin the game for everyone at the same moment.
    if (
      this.mode === "knockout" &&
      this.status === "waiting" &&
      this.startAt !== null &&
      now >= this.startAt &&
      this.players.length >= MIN_PLAYERS
    ) {
      this.beginRound(this.randomStart());
      this.onChange();
      return;
    }
    // Elimination cow-dance: the WHOLE game is frozen (every client shows the cow centre-stage, no
    // timers run) until it ends; then apply the resume decided at elimination time.
    if (this.danceEndsAt !== null) {
      if (now >= this.danceEndsAt) {
        this.danceEndsAt = null;
        const r = this.pendingResume;
        this.pendingResume = null;
        if (r?.type === "end") this.endKnockout(r.winner);
        else if (r?.type === "round") {
          if (r.reset) this.beginRound(r.idx); // a completed lap (31) → fresh count from 0
          else this.continueRound(r.idx); // continue the count from where it was
        }
        this.onChange();
      }
      return;
    }
    if (this.status !== "playing" || !this.currentId) return;
    // Kickoff wheel is spinning for all players — no turns run until it finishes.
    if (this.spinEndsAt !== null) {
      if (now >= this.spinEndsAt) {
        this.spinEndsAt = null;
        this.armTurn(); // start turn 1's 7s countdown once the wheel has landed
        this.onChange();
      }
      return;
    }
    if (isBot(this.currentId) && this.botActAt && now >= this.botActAt) {
      this.botActAt = null;
      this.submit(this.currentId, this.botPicks());
      return;
    }
    // Every turn is on a 7-second countdown; running out eliminates the player.
    if (this.turnEndsAt && now > this.turnEndsAt) return this.eliminate(this.currentId, "timeout");
  }

  private botPicks(): number[] {
    const opts = [1, 2, 3].filter((mm) => mm !== this.lastK && this.count + mm <= TARGET);
    const safe = opts.filter((mm) => this.count + mm < TARGET);
    const pool = safe.length ? safe : opts.length ? opts : [1];
    const m = pool[Math.floor(Math.random() * pool.length)]!;
    return Array.from({ length: m }, (_, i) => this.count + 1 + i);
  }

  private armTurn(): void {
    // Every turn (human or bot) starts a visible 7-second countdown. If the player doesn't complete
    // their turn within those 7 seconds, they're eliminated — no one is cut instantly.
    this.turnEndsAt = Date.now() + this.runtime.gameplay.turnSeconds * 1000;
    this.botActAt = isBot(this.currentId ?? "")
      ? Date.now() +
        this.runtime.gameplay.botThinkMinMs +
        Math.floor(
          Math.random() *
            (this.runtime.gameplay.botThinkMaxMs - this.runtime.gameplay.botThinkMinMs + 1),
        )
      : null;
  }

  /** Continue the SAME count (no reset) after a non-31 elimination — the field just shrank. Keeps
   * count/taken/lastK/lastMove and passes the turn to the next surviving player (the one now sitting
   * at `starterIndex` after the eliminated player was spliced out). */
  private continueRound(starterIndex: number): void {
    if (this.players.length < MIN_PLAYERS) {
      this.status = this.mode === "knockout" && this.players.length === 1 ? "over" : "waiting";
      if (this.status === "over") this.winner = this.makeWinner(this.players[0]);
      this.currentId = null;
      this.turnEndsAt = null;
      this.spinEndsAt = null;
      this.botActAt = null;
      return;
    }
    const idx = ((starterIndex % this.players.length) + this.players.length) % this.players.length;
    this.currentId = this.players[idx]!.id;
    this.status = "playing";
    this.spinEndsAt = null;
    this.armTurn();
  }

  private beginRound(starterIndex: number): void {
    this.count = 0;
    this.lastK = null;
    this.taken = {};
    this.lastMove = null;
    this.round += 1;
    if (this.players.length < MIN_PLAYERS) {
      this.status = this.mode === "knockout" && this.players.length === 1 ? "over" : "waiting";
      if (this.status === "over") this.winner = this.makeWinner(this.players[0]);
      this.currentId = null;
      this.turnEndsAt = null;
      this.spinEndsAt = null;
      this.botActAt = null;
      return;
    }
    const idx = ((starterIndex % this.players.length) + this.players.length) % this.players.length;
    this.currentId = this.players[idx]!.id;
    this.status = "playing";
    // Round 1 of a knockout opens with the kickoff wheel spinning for everyone; the first turn's
    // countdown only starts once the wheel has landed (handled in tick()).
    if (this.mode === "knockout" && this.round === 1) {
      this.spinEndsAt = Date.now() + WHEEL_MS;
      this.turnEndsAt = null;
      this.botActAt = null;
    } else {
      this.spinEndsAt = null;
      this.armTurn();
    }
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
          const configured = this.runtime.bots.find((bot) => bot.name === gone.name);
          this.addBot(gone.name, configured?.avatarVariantId);
          if (this.status !== "playing" && this.players.length >= MIN_PLAYERS) this.beginRound(0);
          this.onChange();
        }, BOT_REJOIN_MS);
      }
      this.beginRound(idx);
    } else {
      // Knockout: the player is OUT for good — the field shrinks. They may keep watching but can
      // never rejoin. FIRST, freeze the WHOLE game for the elimination cow-dance (every player sees
      // the cow centre-stage; no timers run). What happens after the dance is decided now and stored
      // in `pendingResume`, then applied by tick() once `danceEndsAt` passes.
      this.eliminated.add(id);
      if (this.players.length <= 1) {
        this.pendingResume = { type: "end", winner: this.makeWinner(this.players[0]) };
      } else {
        // Only a "31" (someone forced to say 31) starts a fresh count; every other elimination
        // (timeout / repeat / skip / over-3) CONTINUES the count from where it was.
        this.pendingResume = { type: "round", idx, reset: reason === "31" || this.count >= TARGET };
      }
      this.danceEndsAt = Date.now() + DANCE_MS;
      this.currentId = null; // no active turn during the dance
      this.turnEndsAt = null;
      this.botActAt = null;
    }
    this.onChange();
  }

  private endKnockout(winner: { id: string; name: string; color: string } | null): void {
    this.status = "over";
    this.winner = winner;
    this.currentId = null;
    this.turnEndsAt = null;
    this.spinEndsAt = null;
    this.botActAt = null;
  }

  getState(): LiveState {
    return {
      mode: this.mode,
      count: this.count,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        cpu: p.cpu,
        color: p.color,
        card: p.card,
        avatar: p.avatar,
        skills: p.skills,
        equippedSkills: p.equippedSkills,
      })),
      currentId: this.currentId,
      lastK: this.lastK,
      turnEndsAt: this.turnEndsAt,
      round: this.round,
      status: this.status,
      winner: this.winner,
      lastEliminated: this.lastEliminated,
      lastMove: this.lastMove,
      taken: this.taken,
      startsAt: this.startAt,
      spinEndsAt: this.spinEndsAt,
      danceEndsAt: this.danceEndsAt,
    };
  }
}

@Injectable()
export class CountdownGameService implements OnModuleInit, OnModuleDestroy {
  private rooms = new Map<string, Room>();
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private broadcaster: ((roomId: string, state: LiveState) => void) | null = null;
  private unsubscribeConfig: (() => void) | null = null;

  constructor(private readonly platformConfig: PlatformConfigService) {}

  onModuleInit(): void {
    this.unsubscribeConfig = this.platformConfig.onGameConfigChange((config) => {
      for (const room of this.rooms.values()) room.updateConfig(config);
    });
    this.getRoom("practice"); // the always-on practice room
    this.tickHandle = setInterval(() => {
      for (const room of this.rooms.values()) room.tick();
    }, 300);
  }
  onModuleDestroy(): void {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.unsubscribeConfig?.();
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
      // Cap total rooms so a flood of watch/join to random tour:<id>s can't exhaust memory. When the
      // cap is hit, reuse a transient shared room rather than spawning unbounded new ones.
      if (this.rooms.size >= MAX_ROOMS)
        return this.rooms.get("practice") ?? this.forceCreate(roomId);
      room = this.forceCreate(roomId);
    }
    return room;
  }

  private forceCreate(roomId: string): Room {
    const created = new Room(
      this.modeFor(roomId),
      () => this.broadcaster?.(roomId, created.getState()),
      this.platformConfig.getGameConfig(),
    );
    this.rooms.set(roomId, created);
    return created;
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
  useSkill(roomId: string, socketId: string, skill: string): void {
    this.getRoom(roomId).useSkill(socketId, skill);
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
