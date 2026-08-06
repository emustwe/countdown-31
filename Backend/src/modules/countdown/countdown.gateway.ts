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

// Live Count Down 31 socket channel ("/countdown" namespace). Anonymous (guest) connections are
// allowed. Each game is a "room": "practice" (always-on) or "tour:<id>" (a tournament knockout).
// A client first WATCHES a room (spectate), then JOINs it to play, ARMs its timer on first pick,
// and SUBMITs a move. State for a room is broadcast only to sockets in that socket.io room.
function roomOf(data: { roomId?: string } | undefined): string {
  const r = (data?.roomId ?? "practice").toString();
  return /^(practice|tour:[a-zA-Z0-9-]{1,64})$/.test(r) ? r : "practice";
}

@WebSocketGateway({ namespace: "/countdown", cors: { origin: webOrigins() } })
export class CountdownGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly game: CountdownGameService) {}

  afterInit(): void {
    this.game.setBroadcaster((roomId, state) => this.server.to(roomId).emit("state", state));
  }

  handleConnection(): void {
    /* nothing until the client watches a room */
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.game.leaveAll(client.id);
  }

  @SubscribeMessage("watch")
  onWatch(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }): void {
    const room = roomOf(data);
    void client.join(room);
    client.emit("state", this.game.getState(room)); // immediate snapshot
  }

  @SubscribeMessage("join")
  onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId?: string; name?: string; card?: Record<string, unknown>; avatar?: Record<string, string> },
  ): void {
    const room = roomOf(data);
    void client.join(room);
    this.game.join(room, client.id, typeof data?.name === "string" ? data.name : "Guest", { card: data?.card, avatar: data?.avatar });
  }

  @SubscribeMessage("arm")
  onArm(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }): void {
    this.game.arm(roomOf(data), client.id);
  }

  @SubscribeMessage("submit")
  onSubmit(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string; picks?: unknown }): void {
    this.game.submit(roomOf(data), client.id, data?.picks);
  }

  @SubscribeMessage("leave")
  onLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId?: string }): void {
    this.game.leave(roomOf(data), client.id);
  }
}
