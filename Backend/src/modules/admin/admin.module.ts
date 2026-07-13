import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AuditLogService } from "./audit-log.service";
import { GameModule } from "../game/game.module";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [GameModule, WalletModule],
  controllers: [AdminController],
  providers: [AdminService, AuditLogService],
})
export class AdminModule {}
