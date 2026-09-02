import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { CountdownGameService } from "./countdown.service";
import { CountdownGateway } from "./countdown.gateway";
import { PlatformConfigModule } from "../platform-config/platform-config.module";
import { SponsorsModule } from "../sponsors/sponsors.module";

@Module({
  imports: [PrismaModule, JwtModule.register({}), PlatformConfigModule, SponsorsModule],
  providers: [CountdownGameService, CountdownGateway],
  exports: [CountdownGameService],
})
export class CountdownModule {}
