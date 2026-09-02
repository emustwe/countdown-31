import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import {
  DEFAULT_GAME_CONFIG,
  GameConfigSchema,
  GameThemesSchema,
  type GameConfig,
  type GameTheme,
} from "./game-config.schema";

@Injectable()
export class PlatformConfigService implements OnModuleInit {
  private gameConfig: GameConfig = structuredClone(DEFAULT_GAME_CONFIG);
  private readonly listeners = new Set<(config: GameConfig) => void>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    const stored = await this.prisma.platformConfig.findUnique({ where: { key: "game" } });
    const parsed = GameConfigSchema.safeParse(stored?.value);
    if (parsed.success) this.gameConfig = parsed.data;
  }

  getGameConfig(): GameConfig {
    return structuredClone(this.gameConfig);
  }

  onGameConfigChange(listener: (config: GameConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  recordAssetUpload(actor: string, fileName: string, bytes: number): void {
    this.audit.record("ADMIN_GAME_ASSET_UPLOADED", { actor, detail: { fileName, bytes } });
  }

  async setGameConfig(config: GameConfig, actor: string): Promise<GameConfig> {
    const parsed = GameConfigSchema.parse(config);
    await this.prisma.platformConfig.upsert({
      where: { key: "game" },
      create: { key: "game", value: parsed as Prisma.InputJsonValue },
      update: { value: parsed as Prisma.InputJsonValue },
    });
    this.gameConfig = parsed;
    for (const listener of this.listeners) listener(this.getGameConfig());
    this.audit.record("ADMIN_GAME_CONFIG_UPDATED", { actor });
    return this.getGameConfig();
  }

  async resetGameConfig(actor: string): Promise<GameConfig> {
    this.audit.record("ADMIN_GAME_CONFIG_RESET", { actor });
    return this.setGameConfig(structuredClone(DEFAULT_GAME_CONFIG), actor);
  }

  // --- Sponsor themes (named, reusable; picked at tournament creation) ---------------------------
  async getThemes(): Promise<GameTheme[]> {
    const row = await this.prisma.platformConfig.findUnique({ where: { key: "themes" } });
    const parsed = GameThemesSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : [];
  }

  async getTheme(id: string): Promise<GameTheme | null> {
    return (await this.getThemes()).find((theme) => theme.id === id) ?? null;
  }

  private async writeThemes(themes: GameTheme[]): Promise<GameTheme[]> {
    await this.prisma.platformConfig.upsert({
      where: { key: "themes" },
      create: { key: "themes", value: themes as Prisma.InputJsonValue },
      update: { value: themes as Prisma.InputJsonValue },
    });
    return themes;
  }

  async saveTheme(theme: GameTheme, actor: string): Promise<GameTheme[]> {
    const themes = await this.getThemes();
    const index = themes.findIndex((t) => t.id === theme.id);
    if (index >= 0) themes[index] = theme;
    else themes.push(theme);
    this.audit.record("ADMIN_GAME_THEME_SAVED", { actor, detail: { id: theme.id, name: theme.name } });
    return this.writeThemes(themes);
  }

  async deleteTheme(id: string, actor: string): Promise<GameTheme[]> {
    const themes = (await this.getThemes()).filter((t) => t.id !== id);
    this.audit.record("ADMIN_GAME_THEME_DELETED", { actor, detail: { id } });
    return this.writeThemes(themes);
  }
}
