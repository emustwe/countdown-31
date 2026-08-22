import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { CountdownGameService } from "./countdown.service";
import { CountdownGateway } from "./countdown.gateway";

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  providers: [CountdownGameService, CountdownGateway],
  exports: [CountdownGameService],
})
export class CountdownModule {}
