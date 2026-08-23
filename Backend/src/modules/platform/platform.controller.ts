import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { PlatformService } from "./platform.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";

const ThemeDtoSchema = z.object({ themeFamily: z.enum(["desert", "monster"]) }).strict();
type ThemeDto = z.infer<typeof ThemeDtoSchema>;

// Public read of the platform theme family — needed on pre-login pages, so no auth.
@Controller("game")
export class PublicThemeController {
  constructor(private readonly platform: PlatformService) {}

  @Get("theme")
  getTheme() {
    return this.platform.getThemeFamily();
  }
}

// Admin-only theme switch.
@Controller("admin/config")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminConfigController {
  constructor(private readonly platform: PlatformService) {}

  @Patch("theme")
  setTheme(@Body(new ZodValidationPipe(ThemeDtoSchema)) dto: ThemeDto) {
    return this.platform.setThemeFamily(dto.themeFamily);
  }
}
