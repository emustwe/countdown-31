import { Module } from "@nestjs/common";
import { CountdownGameService } from "./countdown.service";
import { CountdownGateway } from "./countdown.gateway";

@Module({
  providers: [CountdownGameService, CountdownGateway],
  exports: [CountdownGameService],
})
export class CountdownModule {}
