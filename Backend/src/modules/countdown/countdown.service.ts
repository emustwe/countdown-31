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

interface Team {
  name: string;
  color: string;
}
interface Cosmetics {
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  team?: Team; // the player's own team (INFLUENCER tournaments)
  teams?: Team[]; // the two team definitions (so CPU fillers can be split across them)
  captain?: boolean; // this player is the team captain (influencer) — special card
  startAt?: number; // tournament start time (ms) — the game holds in a lobby until then
}
interface Player {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  team?: Team;
  captain?: boolean;
}
export interface LivePlayer {
  id: string;
  name: string;
  cpu: boolean;
  color: string;
  card?: Record<string, unknown>;
  avatar?: Record<string, string>;
  team?: Team;
  captain?: boolean;
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
  winner: { name: string; color: string; team?: Team } | null;
  lastEliminated: { name: string; reason: LiveReason } | null;
  taken: Record<number, string>; // number -> colour of the player who took it (this round)
  teamStandings: { name: string; color: string; alive: number }[]; // per-team survivors (INFLUENCER)
  startsAt: number | null; // lobby: when the tournament begins (ms) — clients show a GMT countdown
  spinEndsAt: number | null; // kickoff wheel is spinning until this ms (turn 1 starts after)
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
  turnEndsAt: number | null = null; // every turn is on a 7s countdown; miss it → eliminated
  botActAt: number | null = null;
  round = 0;
  status: "waiting" | "playing" | "over" = "waiting";
  startAt: number | null = null; // tournament start (ms). Game holds in a lobby until then.
  spinEndsAt: number | null = null; // kickoff wheel spin phase (turn 1 arms after this)
  winner: { name: string; color: string; team?: Team } | null = null;
  lastEliminated: { name: string; reason: LiveReason } | null = null;
  taken: Record<number, string> = {};
  teamDefs: Team[] = []; // the teams for an INFLUENCER tournament room
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
    // In an influencer room, split CPU fillers evenly across the two teams.
    const team = this.teamDefs.length
      ? this.teamDefs[this.players.filter((p) => p.cpu).length % this.teamDefs.length]
      : undefined;
    this.players.push({
      id,
      name,
      cpu: true,
      color: this.colorFor(this.players.length),
      team,
      avatar: avatarVariantId ? { variantId: avatarVariantId } : undefined,
    });
  }

  private makeWinner(p: Player | undefined): { name: string; color: string; team?: Team } | null {
    return p ? { name: p.name, color: p.color, team: p.team } : null;
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
    // The first joiner carrying team definitions themes the room (and its CPU fillers). Supports any
    // number of teams/groups (influencer tournaments may have 2..6).
    if (cos?.teams && cos.teams.length >= 2 && this.teamDefs.length === 0)
      this.teamDefs = cos.teams.slice();
    // The first joiner carrying a start time schedules the room — everyone waits in a lobby with a
    // GMT countdown until then, and the game begins for all players at the same moment.
    if (this.mode === "knockout" && cos?.startAt && this.startAt === null)
      this.startAt = cos.startAt;
    const existing = this.players.find((p) => p.id === id);
    if (existing) {
      existing.name = name;
      if (cos?.card) existing.card = cos.card;
      if (cos?.avatar) existing.avatar = cos.avatar;
      if (cos?.team) existing.team = cos.team;
      if (cos?.captain !== undefined) existing.captain = cos.captain;
      existing.color = this.colorFor(this.players.indexOf(existing), cos?.card);
    } else {
      this.players.push({
        id,
        name,
        cpu: false,
        color: this.colorFor(this.players.length, cos?.card),
        card: cos?.card,
        avatar: cos?.avatar,
        team: cos?.team,
        captain: cos?.captain,
      });
    }
    if (this.status !== "playing") {
      if (this.mode === "knockout") {
        // Real tournament: REAL players only (no CPU fillers). Players wait in a LOBBY; the game
        // begins only when the scheduled start time has arrived (tick() fires it for everyone at
        // once). It never starts early, and never at all until a start time is scheduled.
        const dueToStart = this.startAt !== null && Date.now() >= this.startAt;
        if (dueToStart && this.players.length >= MIN_PLAYERS) this.beginRound(this.randomStart());
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
    } else {
      // If a departure leaves only one team standing, that team wins the knockout now.
      const teamWin = this.mode === "knockout" ? this.soleRemainingTeam() : null;
      if (teamWin) {
        this.lastEliminated = { name: gone?.name ?? "Player", reason: "left" };
        this.endKnockout({ name: teamWin.name, color: teamWin.color, team: teamWin });
      } else if (wasCurrent) {
        this.lastEliminated = { name: gone?.name ?? "Player", reason: "left" };
        this.beginRound(idx);
      }
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
    this.count = this.count + m;
    this.lastK = m;
    if (this.count >= TARGET) return this.eliminate(id, "31");
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

  private beginRound(starterIndex: number): void {
    this.count = 0;
    this.lastK = null;
    this.taken = {};
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
      // never rejoin.
      this.eliminated.add(id);
      const teamWin = this.soleRemainingTeam();
      if (this.players.length <= 1) {
        // Last one standing wins.
        this.endKnockout(this.makeWinner(this.players[0]));
      } else if (teamWin) {
        // Every remaining player belongs to the same team — no rival team survives, so that team
        // wins now and the tournament stops even though several of its players are still in.
        this.endKnockout({ name: teamWin.name, color: teamWin.color, team: teamWin });
      } else {
        this.beginRound(idx);
      }
    }
    this.onChange();
  }

  /** Knockout: if the room is a team battle and every surviving player is on the SAME team (no rival
   * team has anyone left), return that team — it has won. Otherwise null. */
  private soleRemainingTeam(): Team | null {
    if (!this.teamDefs.length || this.players.length === 0) return null;
    const first = this.players[0]!.team;
    if (!first) return null;
    return this.players.every((p) => p.team && p.team.name === first.name) ? first : null;
  }

  private endKnockout(winner: { name: string; color: string; team?: Team } | null): void {
    this.status = "over";
    this.winner = winner;
    this.currentId = null;
    this.turnEndsAt = null;
    this.spinEndsAt = null;
    this.botActAt = null;
  }

  private teamStandings(): { name: string; color: string; alive: number }[] {
    if (!this.teamDefs.length) return [];
    return this.teamDefs.map((t) => ({
      name: t.name,
      color: t.color,
      alive: this.players.filter((p) => p.team?.name === t.name).length,
    }));
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
        team: p.team,
        captain: p.captain,
      })),
      currentId: this.currentId,
      lastK: this.lastK,
      turnEndsAt: this.turnEndsAt,
      round: this.round,
      status: this.status,
      winner: this.winner,
      lastEliminated: this.lastEliminated,
      taken: this.taken,
      teamStandings: this.teamStandings(),
      startsAt: this.startAt,
      spinEndsAt: this.spinEndsAt,
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
