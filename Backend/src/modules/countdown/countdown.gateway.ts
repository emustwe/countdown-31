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
import type { Server, Socket } from "socket.io";
import { CountdownGameService } from "./countdown.service";
import { webOrigins } from "../../common/web-origins";

/**
 * Live Count Down 31 socket channel on its own "/countdown" namespace. Unlike the balance gateway
 * this allows ANONYMOUS (guest) connections — a visitor joins with just a display name. Every state
 * change is broadcast to all connected clients so the game is real-time for everyone.
 */
@WebSocketGateway({ namespace: "/countdown", cors: { origin: webOrigins() } })
export class CountdownGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly game: CountdownGameService) {}

  afterInit(): void {
    this.game.setBroadcaster((state) => this.server.emit("state", state));
  }

  handleConnection(@ConnectedSocket() client: Socket): void {
    client.emit("state", this.game.getState()); // send a snapshot immediately
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.game.leave(client.id);
  }

  @SubscribeMessage("join")
  onJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { name?: string }): void {
    this.game.join(client.id, typeof data?.name === "string" ? data.name : "Guest");
  }

  @SubscribeMessage("submit")
  onSubmit(@ConnectedSocket() client: Socket, @MessageBody() data: { picks?: unknown }): void {
    this.game.submit(client.id, data?.picks);
  }

  @SubscribeMessage("leave")
  onLeave(@ConnectedSocket() client: Socket): void {
    this.game.leave(client.id);
  }
}
