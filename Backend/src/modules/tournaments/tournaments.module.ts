import { Module } from "@nestjs/common";
import { TournamentsController, TournamentsAdminController } from "./tournaments.controller";
import { TournamentsService } from "./tournaments.service";
import { TournamentEngineService } from "./tournament-engine.service";
import { AuditLogService } from "../admin/audit-log.service";
import { GameModule } from "../game/game.module";
import { WalletModule } from "../wallet/wallet.module";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [GameModule, WalletModule, RealtimeModule],
  controllers: [TournamentsController, TournamentsAdminController],
  providers: [TournamentsService, TournamentEngineService, AuditLogService],
  exports: [TournamentsService],
})
export class TournamentsModule {}
