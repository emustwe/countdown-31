import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";
import { LedgerService } from "./ledger.service";
import { SolanaService } from "./solana.service";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [RealtimeModule],
  controllers: [WalletController],
  providers: [WalletService, LedgerService, SolanaService],
  exports: [WalletService, LedgerService, SolanaService],
})
export class WalletModule {}
