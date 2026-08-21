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
import { corsOrigin } from "../../common/web-origins";
import type { AccessTokenPayload } from "../auth/token.types";

// Live Count Down 31 socket channel ("/countdown" namespace).
//
// Trust model: the "practice" room is open to guests. A tournament room ("tour:<id>") is
// SERVER-AUTHORITATIVE — the connection must be authenticated, the user must be a registered
// entrant, and their team / captaincy / the start time are read from the database, NOT from the
// client. This closes the old holes where a client could self-declare captain, inject teams, or
// set the room's start time.
function roomOf(data: { roomId?: string } | undefined): string {
  const r = (data?.roomId ?? "practice").toString();
  return /^(practice|tour:[a-zA-Z0-9-]{1,64})$/.test(r) ? r : "practice";
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
  ) {}

  afterInit(): void {
    this.game.setBroadcaster((roomId, state) => this.server.to(roomId).emit("state", state));
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
    data: { roomId?: string; name?: string; card?: Record<string, unknown>; avatar?: Record<string, string> },
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
    });
  }

  /** Server-authoritative tournament join: identity, entry, team, captaincy and start time all come
   * from the database. The client only supplies its cosmetics (card/avatar). */
  private async joinTournament(client: Socket, room: string, data: { card?: Record<string, unknown>; avatar?: Record<string, string> }): Promise<void> {
    const userId = (client.data as SocketData).userId;
    if (!userId) {
      client.emit("joinError", "Sign in to join this tournament.");
      return;
    }
    const tournamentId = room.slice("tour:".length);
    const entry = await this.prisma.promoEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
      include: { team: true, user: { select: { fullName: true, email: true } } },
    });
    if (!entry) {
      client.emit("joinError", "You are not registered for this tournament.");
      return;
    }
    const t = await this.prisma.sponsorTournament.findUnique({
      where: { id: tournamentId },
      include: { teams: { select: { name: true, color: true } } },
    });
    if (!t) {
      client.emit("joinError", "Tournament not found.");
      return;
    }

    const name = (entry.user.fullName || entry.user.email.split("@")[0] || "Player").slice(0, 20);
    const isInfluencer = t.type === "INFLUENCER";
    void client.join(room);
    this.game.join(room, client.id, name, {
      card: data?.card,
      avatar: data?.avatar,
      team: entry.team ? { name: entry.team.name, color: entry.team.color } : undefined,
      teams: isInfluencer ? t.teams.map((tm) => ({ name: tm.name, color: tm.color })) : undefined,
      captain: entry.isCaptain,
      startAt: t.startAt ? t.startAt.getTime() : undefined,
    });
  }

  @SubscribeMessage("arm")
  onArm(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }): void {
    if (!this.rateOk(client)) return;
    this.game.arm(roomOf(data), client.id);
  }

  @SubscribeMessage("submit")
  onSubmit(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string; picks?: unknown }): void {
    if (!this.rateOk(client)) return;
    this.game.submit(roomOf(data), client.id, data?.picks);
  }

  @SubscribeMessage("leave")
  onLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }): void {
    if (!this.rateOk(client)) return;
    this.game.leave(roomOf(data), client.id);
  }
}
