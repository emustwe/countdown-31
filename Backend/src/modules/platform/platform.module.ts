import { Module } from "@nestjs/common";
import { PlatformService } from "./platform.service";
import { PublicThemeController, AdminConfigController } from "./platform.controller";

@Module({
  controllers: [PublicThemeController, AdminConfigController],
  providers: [PlatformService],
})
export class PlatformModule {}
