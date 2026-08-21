import { Module } from "@nestjs/common";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { WalletModule } from "../wallet/wallet.module";
import { RealtimeModule } from "../realtime/realtime.module";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";

@Module({
  imports: [PrismaModule, WalletModule, RealtimeModule],
  controllers: [ShopController],
  providers: [ShopService],
  exports: [ShopService],
})
export class ShopModule {}
