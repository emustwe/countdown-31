import { Injectable, type OnModuleInit } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { AuditService } from "../../common/audit/audit.service";
import { DEFAULT_GAME_CONFIG, GameConfigSchema, type GameConfig } from "./game-config.schema";

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
}
