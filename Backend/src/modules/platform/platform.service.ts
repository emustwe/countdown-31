import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

export type ThemeFamily = "desert" | "monster";
const SINGLETON = "singleton";

/** Platform-wide configuration (currently just the admin-selected theme family). Stored as a single
 * row so a change applies to everyone. */
@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(v: string | undefined): ThemeFamily {
    return v === "desert" ? "desert" : "monster";
  }

  async getThemeFamily(): Promise<{ themeFamily: ThemeFamily }> {
    const row = await this.prisma.platformConfig.findUnique({ where: { id: SINGLETON } });
    return { themeFamily: this.normalize(row?.themeFamily) };
  }

  async setThemeFamily(themeFamily: string): Promise<{ themeFamily: ThemeFamily }> {
    const value = this.normalize(themeFamily);
    await this.prisma.platformConfig.upsert({
      where: { id: SINGLETON },
      create: { id: SINGLETON, themeFamily: value },
      update: { themeFamily: value },
    });
    return { themeFamily: value };
  }
}
