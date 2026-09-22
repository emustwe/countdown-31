import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Server, Socket } from "socket.io";
import { CountdownGameService } from "./countdown.service";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SponsorsService } from "../sponsors/sponsors.service";
import { corsOrigin } from "../../common/web-origins";
import type { AccessTokenPayload } from "../auth/token.types";

// Live Count Down 31 socket channel ("/countdown" namespace).
//
// Trust model: the "practice" room is open to guests. A tournament room is SERVER-AUTHORITATIVE —
// the connection must be authenticated, the user must be a registered entrant (and, for a group
// room, a member of that group), and the start time is read from the database, NOT from the client.
//
// Room ids:
//   practice                    the always-on practice room
//   tour:<tournamentId>         a REGULAR tournament (single knockout — every entrant)
//   tour:<tournamentId>:<gid>   one GROUP of a GROUP tournament (only that group's 31 players)
function roomOf(data: { roomId?: string } | undefined): string {
  const r = (data?.roomId ?? "practice").toString();
  return /^(practice|tour:[a-zA-Z0-9-]{1,64}(:[a-zA-Z0-9-]{1,64})?)$/.test(r) ? r : "practice";
}

/** Parse a `tour:<tid>` or `tour:<tid>:<gid>` room id into its parts. */
function parseTourRoom(room: string): { tournamentId: string; groupId: string | null } | null {
  if (!room.startsWith("tour:")) return null;
  const rest = room.slice("tour:".length);
  const sep = rest.indexOf(":");
  if (sep === -1) return { tournamentId: rest, groupId: null };
  return { tournamentId: rest.slice(0, sep), groupId: rest.slice(sep + 1) };
}

// Per-socket message rate limit (sliding window) to stop floods.
const RATE_WINDOW_MS = 5_000;
const RATE_MAX = 40;

interface SocketData {
  userId?: string;
  msgs?: number[];
}

@WebSocketGateway({ namespace: "/countdown", cors: { origin: corsOrigin() } })
export class CountdownGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly game: CountdownGameService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sponsors: SponsorsService,
  ) {}

  // Tournament rooms whose winner we've already persisted (so we write it exactly once).
  private readonly recordedWinners = new Set<string>();
  // GROUP rooms → userIds whose ELIMINATED result we've already written to the DB (so a returning
  // knocked-out player is recognised as out even if the in-memory game is later lost).
  private readonly persistedElims = new Map<string, Set<string>>();

  afterInit(): void {
    this.game.setBroadcaster((roomId, state) => {
      this.server.to(roomId).emit("state", state);
      const parsed = parseTourRoom(roomId);
      if (!parsed) return;

      // Persist eliminations AS THEY HAPPEN (GROUP rooms). Without this, a mid-game elimination lives
      // only in server memory; if the server restarts, the room re-seeds from the DB (everyone still
      // "playing") and the eliminated player is revived into a fresh game. Writing ELIMINATED here
      // means they instead land on the spectator page, and re-seeded rooms exclude them.
      if (parsed.groupId) {
        const already = this.persistedElims.get(roomId) ?? new Set<string>();
        const fresh = this.game.eliminatedIds(roomId).filter((uid) => !already.has(uid));
        if (fresh.length) {
          for (const uid of fresh) already.add(uid);
          this.persistedElims.set(roomId, already);
          this.prisma.groupMember
            .updateMany({ where: { groupId: parsed.groupId, userId: { in: fresh }, result: "PENDING" }, data: { result: "ELIMINATED" } })
            .catch(() => { for (const uid of fresh) already.delete(uid); }); // retry on next tick if the write fails
        }
      }

      // When a tournament game ends, persist its result exactly once.
      if (state.status === "over" && state.winner && !this.recordedWinners.has(roomId)) {
        this.recordedWinners.add(roomId);
        this.persistedElims.delete(roomId);
        const winner = state.winner;
        if (parsed.groupId) {
          // A GROUP match: record the group winner (advances them to the final, or crowns the
          // champion if this WAS the final).
          this.sponsors
            .recordGroupResult(parsed.groupId, winner.id, winner.name)
            .catch(() => this.recordedWinners.delete(roomId));
        } else {
          // A REGULAR single-knockout tournament: the winner is the champion.
          this.sponsors
            .recordTournamentWinner(parsed.tournamentId, winner.name)
            .catch(() => this.recordedWinners.delete(roomId));
        }
      }
    });
  }

  // Verify the access token from the socket handshake (if any). Guests (no/invalid token) may still
  // connect — they just can't join tournament rooms.
  async handleConnection(client: Socket): Promise<void> {
    const token = (client.handshake?.auth?.token ?? client.handshake?.query?.token) as string | undefined;
    if (typeof token === "string" && token) {
      try {
        const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
          secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        });
        (client.data as SocketData).userId = payload.sub;
      } catch {
        /* invalid token → treated as a guest */
      }
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.game.leaveAll(client.id);
  }

  private rateOk(client: Socket): boolean {
    const data = client.data as SocketData;
    const now = Date.now();
    data.msgs = (data.msgs ?? []).filter((t) => now - t < RATE_WINDOW_MS);
    if (data.msgs.length >= RATE_MAX) return false;
    data.msgs.push(now);
    return true;
  }

  @SubscribeMessage("watch")
  onWatch(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }): void {
    if (!this.rateOk(client)) return;
    const room = roomOf(data);
    void client.join(room);
    client.emit("state", this.game.getState(room)); // immediate snapshot
  }

  @SubscribeMessage("join")
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomId?: string;
      name?: string;
      card?: Record<string, unknown>;
      avatar?: Record<string, string>;
      country?: string;
    },
  ): Promise<void> {
    if (!this.rateOk(client)) return;
    const room = roomOf(data);

    if (room.startsWith("tour:")) {
      await this.joinTournament(client, room, data);
      return;
    }

    // Practice room: open to guests, cosmetics are the player's own display choice.
    void client.join(room);
    this.game.join(room, client.id, typeof data?.name === "string" ? data.name : "Guest", {
      card: data?.card,
      avatar: data?.avatar,
      country: normalizeCountry(data?.country),
    });
  }

  /** Server-authoritative tournament join. Players are identified by USER ID (stable), and we seed
   * the room with the whole roster up front — so at start time the field already contains everyone and
   * the game begins for all at once (a player whose client never connects simply times out their
   * turns). Identity, skills and start time come from the DB; the connecting client only supplies its
   * own cosmetics (card/avatar). A GROUP room (`tour:<tid>:<gid>`) is seeded with ONLY that group's
   * members; a REGULAR room (`tour:<tid>`) with every entrant. */
  private async joinTournament(client: Socket, room: string, data: { card?: Record<string, unknown>; avatar?: Record<string, string> }): Promise<void> {
    const userId = (client.data as SocketData).userId;
    if (!userId) {
      client.emit("joinError", "Sign in to join this tournament.");
      return;
    }
    const parsed = parseTourRoom(room);
    if (!parsed) {
      client.emit("joinError", "Tournament not found.");
      return;
    }
    const t = await this.prisma.sponsorTournament.findUnique({ where: { id: parsed.tournamentId } });
    if (!t) {
      client.emit("joinError", "Tournament not found.");
      return;
    }

    // Build the roster of {userId, name, skills, cosmetics, startAt} to seed the room.
    let roster: {
      userId: string;
      name: string;
      country?: string;
      skills: string[];
      card?: Record<string, unknown>;
      avatar?: Record<string, string>;
    }[];
    let startAt: number | undefined;

    if (parsed.groupId) {
      // GROUP room: seed only this group's members; the game holds until the group's scheduled time.
      const info = await this.sponsors.getGroupForRoom(parsed.tournamentId, parsed.groupId);
      if (!info) {
        client.emit("joinError", "Group not found.");
        return;
      }
      type GroupPlayer = (typeof info.players)[number];
      if (!info.players.some((p: GroupPlayer) => p.userId === userId)) {
        client.emit("joinError", "You are not in this group.");
        return;
      }
      startAt = info.group.scheduledAt ? new Date(info.group.scheduledAt).getTime() : undefined;
      roster = info.players.map((p: GroupPlayer) => ({
        userId: p.userId,
        name: p.name.slice(0, 20),
        country: p.country,
        skills: Array.isArray(p.skills) ? p.skills : [],
        card: (p.cosmetics?.card as Record<string, unknown>) ?? undefined,
        avatar: (p.cosmetics?.avatar as Record<string, string>) ?? undefined,
      }));
    } else {
      // REGULAR room: every registered entrant plays in one knockout.
      const entries = await this.prisma.promoEntry.findMany({
        where: { tournamentId: parsed.tournamentId },
        include: { user: { select: { fullName: true, email: true, country: true } } },
      });
      if (!entries.some((e) => e.userId === userId)) {
        client.emit("joinError", "You are not registered for this tournament.");
        return;
      }
      startAt = t.startAt ? t.startAt.getTime() : undefined;
      roster = entries.map((e) => ({
        userId: e.userId,
        name: (e.user.fullName || e.user.email.split("@")[0] || "Player").slice(0, 20),
        country: e.user.country ?? undefined,
        skills: Array.isArray(e.skills) ? (e.skills as string[]) : [],
      }));
    }

    void client.join(room);
    // Seed the whole roster (by userId) so the field is complete before the game begins.
    for (const p of roster) {
      this.game.join(room, p.userId, p.name, {
        startAt,
        skills: p.skills,
        card: p.card,
        avatar: p.avatar,
        country: p.country,
      });
    }
    // Then mark THIS player present with their live cosmetics (their seat already exists from the seed).
    const me = roster.find((p) => p.userId === userId)!;
    this.game.join(room, userId, me.name, {
      card: data?.card ?? me.card,
      avatar: data?.avatar ?? me.avatar,
      startAt,
      skills: me.skills,
      country: me.country,
    });
  }

  // Tournament players are identified by USER ID (their DB-seeded seat); practice players by socket id.
  private playerId(client: Socket, room: string): string {
    return room.startsWith("tour:") ? ((client.data as SocketData).userId ?? client.id) : client.id;
  }

  @SubscribeMessage("useSkill")
  onUseSkill(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string; skill?: string }): void {
    if (!this.rateOk(client)) return;
    const room = roomOf(data);
    if (typeof data?.skill === "string") this.game.useSkill(room, this.playerId(client, room), data.skill);
  }

  @SubscribeMessage("arm")
  onArm(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }): void {
    if (!this.rateOk(client)) return;
    const room = roomOf(data);
    this.game.arm(room, this.playerId(client, room));
  }

  @SubscribeMessage("submit")
  onSubmit(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string; picks?: unknown }): void {
    if (!this.rateOk(client)) return;
    const room = roomOf(data);
    this.game.submit(room, this.playerId(client, room), data?.picks);
  }

  @SubscribeMessage("leave")
  onLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }): void {
    if (!this.rateOk(client)) return;
    this.game.leave(roomOf(data), client.id);
  }
}

/** Practice players self-report their country, so never trust the wire: accept exactly two ASCII
 *  letters and upper-case them, or nothing at all. (Tournament players get theirs from the DB.) */
function normalizeCountry(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}
