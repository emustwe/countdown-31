import { Module } from "@nestjs/common";
import { PlatformConfigService } from "./platform-config.service";
import {
  AdminGameConfigController,
  PublicGameConfigController,
} from "./platform-config.controller";

@Module({
  controllers: [PublicGameConfigController, AdminGameConfigController],
  providers: [PlatformConfigService],
  exports: [PlatformConfigService],
})
export class PlatformConfigModule {}
