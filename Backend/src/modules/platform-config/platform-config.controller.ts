import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { Roles } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AccessTokenPayload } from "../auth/token.types";
import { GameConfigSchema, type GameConfig } from "./game-config.schema";
import { PlatformConfigService } from "./platform-config.service";

@Controller("game")
export class PublicGameConfigController {
  constructor(private readonly config: PlatformConfigService) {}

  @Get("config")
  getConfig() {
    return this.config.getGameConfig();
  }

  @Get("theme")
  getTheme() {
    return { themeFamily: this.config.getGameConfig().branding.themeFamily };
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
@Controller("admin/config")
export class AdminGameConfigController {
  constructor(private readonly config: PlatformConfigService) {}

  @Get("game")
  getConfig() {
    return this.config.getGameConfig();
  }

  @Patch("game")
  update(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(GameConfigSchema)) body: GameConfig,
  ) {
    return this.config.setGameConfig(body, user.sub);
  }

  @Post("game/reset")
  reset(@CurrentUser() user: AccessTokenPayload) {
    return this.config.resetGameConfig(user.sub);
  }

  @Patch("theme")
  async updateTheme(
    @CurrentUser() user: AccessTokenPayload,
    @Body(new ZodValidationPipe(z.object({ themeFamily: z.enum(["monster", "desert"]) }).strict()))
    body: { themeFamily: "monster" | "desert" },
  ) {
    const current = this.config.getGameConfig();
    current.branding.themeFamily = body.themeFamily;
    const saved = await this.config.setGameConfig(current, user.sub);
    return { themeFamily: saved.branding.themeFamily };
  }
}
