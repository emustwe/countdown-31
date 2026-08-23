import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request } from "express";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
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

  @Post("assets/background")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 8 * 1024 * 1024 } }))
  async uploadBackground(
    @CurrentUser() user: AccessTokenPayload,
    @UploadedFile()
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined,
    @Req() request: Request,
  ) {
    if (!file) throw new BadRequestException("Choose an image to upload");
    const extensions: Record<string, string> = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
    };
    const extension = extensions[file.mimetype];
    if (!extension) throw new BadRequestException("Use a JPG, PNG, WebP, or GIF image");

    const directory = resolve(process.cwd(), "uploads", "game-config");
    await mkdir(directory, { recursive: true });
    const fileName = `${randomUUID()}${extension}`;
    await writeFile(resolve(directory, fileName), file.buffer);
    this.config.recordAssetUpload(user.sub, fileName, file.size);

    return {
      url: `${request.protocol}://${request.get("host")}/uploads/game-config/${fileName}`,
    };
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
