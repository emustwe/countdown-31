import { Logger } from "@nestjs/common";
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import type { Server, Socket } from "socket.io";
import type { AccessTokenPayload } from "../auth/token.types";

function userRoom(userId: string): string {
  return `user:${userId}`;
}

/**
 * Push channel for balance changes — a client connected here doesn't need to poll
 * /wallet after every deposit/withdraw/spin on ANOTHER tab or device to see its balance
 * move. TanStack Query's own refetch-after-mutation already keeps the tab that *made* the
 * change in sync; this is for everyone else watching the same account.
 */
@WebSocketGateway({ cors: { origin: process.env.WEB_ORIGIN ?? "http://localhost:3000" } })
export class BalanceGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(BalanceGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const token = client.handshake.auth?.token ?? client.handshake.query?.token;
    if (typeof token !== "string") {
      client.disconnect();
      return;
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      });
      await client.join(userRoom(payload.sub));
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  emitBalanceUpdate(userId: string, balance: string): void {
    this.server?.to(userRoom(userId)).emit("balance", { balance });
  }
}
