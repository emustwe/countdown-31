import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { GameController } from "./game.controller";
import { GameService } from "./game.service";
import { SideEffectsProcessor } from "./side-effects.processor";
import { WalletModule } from "../wallet/wallet.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { SIDE_EFFECTS_QUEUE } from "../../common/queue/queue.constants";

@Module({
  imports: [WalletModule, RealtimeModule, BullModule.registerQueue({ name: SIDE_EFFECTS_QUEUE })],
  controllers: [GameController],
  providers: [GameService, SideEffectsProcessor],
  exports: [GameService],
})
export class GameModule {}
