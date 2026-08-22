import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { BalanceGateway } from "./balance.gateway";

@Module({
  imports: [JwtModule.register({})],
  providers: [BalanceGateway],
  exports: [BalanceGateway],
})
export class RealtimeModule {}
