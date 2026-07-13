import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { LedgerEntryType } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LedgerService } from "../wallet/ledger.service";
import { GameService } from "../game/game.service";
import { MATH_MODELS, MATH_MODELS_BY_ID } from "../../engine";
import { AuditLogService } from "./audit-log.service";
import type { ListUsersDto } from "./dto/list-users.dto";
import type { UpdateUserDto } from "./dto/update-user.dto";
import type { ListTransactionsAdminDto } from "./dto/list-transactions-admin.dto";

const GAME_CONFIG_ID = "singleton";

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly auditLog: AuditLogService,
    private readonly gameService: GameService,
  ) {}

  async listUsers(query: ListUsersDto) {
    const limit = query.limit ?? 20;
    const users = await this.prisma.user.findMany({
      where: query.search
        ? { email: { contains: query.search, mode: "insensitive" } }
        : undefined,
      include: { wallet: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = users.length > limit;
    const page = hasMore ? users.slice(0, limit) : users;

    return {
      users: page.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt,
        balance: u.wallet?.cachedBalance.toString() ?? "0",
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async updateUser(adminId: string, targetUserId: string, dto: UpdateUserDto) {
    const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      throw new NotFoundException("User not found");
    }

    if (dto.status && dto.status !== target.status) {
      await this.prisma.user.update({ where: { id: targetUserId }, data: { status: dto.status } });
      await this.auditLog.record(this.prisma, {
        actorUserId: adminId,
        action: dto.status === "BANNED" ? "USER_BANNED" : "USER_UNBANNED",
        targetType: "User",
        targetId: targetUserId,
        data: { previousStatus: target.status, newStatus: dto.status },
      });
    }

    if (dto.balanceAdjustment) {
      const amount = BigInt(dto.balanceAdjustment.amount);
      const reason = dto.balanceAdjustment.reason;

      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${targetUserId} FOR UPDATE`;
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: targetUserId } });
        const newBalance = wallet.cachedBalance + amount;
        if (newBalance < 0n) {
          throw new BadRequestException("Adjustment would make the balance negative");
        }

        await this.ledger.appendEntry(tx, {
          walletId: wallet.id,
          amount,
          type: "ADJUSTMENT",
          refType: "ADMIN_ADJUSTMENT",
          refId: adminId,
        });
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { cachedBalance: newBalance, version: { increment: 1 } },
        });
        await this.auditLog.record(tx, {
          actorUserId: adminId,
          action: "BALANCE_ADJUSTMENT",
          targetType: "User",
          targetId: targetUserId,
          data: { amount: amount.toString(), reason, newBalance: newBalance.toString() },
        });
      });
    }

    const updated = await this.prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
      include: { wallet: true },
    });
    return {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      balance: updated.wallet?.cachedBalance.toString() ?? "0",
    };
  }

  async listModels() {
    const config = await this.prisma.gameConfig.findUnique({ where: { id: GAME_CONFIG_ID } });
    return MATH_MODELS.map((model) => ({
      id: model.id,
      version: model.version,
      displayName: model.displayName,
      targetRtp: model.targetRtp,
      computed: model.computed ?? null,
      active: model.id === config?.activeModelId,
    }));
  }

  async setActiveModel(adminId: string, modelId: string) {
    if (!MATH_MODELS_BY_ID.has(modelId)) {
      throw new BadRequestException(`Unknown model id: ${modelId}`);
    }

    const previous = await this.prisma.gameConfig.findUnique({ where: { id: GAME_CONFIG_ID } });
    await this.prisma.gameConfig.upsert({
      where: { id: GAME_CONFIG_ID },
      update: { activeModelId: modelId, updatedBy: adminId },
      create: { id: GAME_CONFIG_ID, activeModelId: modelId, updatedBy: adminId },
    });
    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: "ACTIVE_MODEL_CHANGED",
      targetType: "GameConfig",
      targetId: GAME_CONFIG_ID,
      data: { previous: previous?.activeModelId ?? null, next: modelId },
    });

    return { activeModelId: modelId };
  }

  async listTransactions(query: ListTransactionsAdminDto) {
    const limit = query.limit ?? 20;
    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        ...(query.type ? { type: query.type as LedgerEntryType } : {}),
        ...(query.userId ? { wallet: { userId: query.userId } } : {}),
      },
      include: { wallet: { include: { user: { select: { email: true } } } } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;

    return {
      entries: page.map((entry) => ({
        id: entry.id,
        userEmail: entry.wallet.user.email,
        amount: entry.amount.toString(),
        type: entry.type,
        refType: entry.refType,
        refId: entry.refId,
        createdAt: entry.createdAt,
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async getAnalytics(days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rounds = await this.prisma.gameRound.findMany({
      where: { createdAt: { gte: since } },
      select: {
        id: true,
        userId: true,
        totalBet: true,
        totalWin: true,
        createdAt: true,
        modelId: true,
        user: { select: { email: true } },
      },
    });

    const totalSpins = rounds.length;
    const totalStaked = rounds.reduce((sum, r) => sum + r.totalBet, 0n);
    const totalReturned = rounds.reduce((sum, r) => sum + r.totalWin, 0n);
    const ggr = totalStaked - totalReturned;
    const activeUsers = new Set(rounds.map((r) => r.userId)).size;
    const observedRtp = totalStaked > 0n ? Number(totalReturned) / Number(totalStaked) : 0;

    const topWins = [...rounds]
      .sort((a, b) => (a.totalWin < b.totalWin ? 1 : a.totalWin > b.totalWin ? -1 : 0))
      .slice(0, 10)
      .map((r) => ({
        roundId: r.id,
        userEmail: r.user.email,
        modelId: r.modelId,
        totalBet: r.totalBet.toString(),
        totalWin: r.totalWin.toString(),
        createdAt: r.createdAt,
      }));

    return {
      windowDays: days,
      totalSpins,
      totalStaked: totalStaked.toString(),
      totalReturned: totalReturned.toString(),
      ggr: ggr.toString(),
      activeUsers,
      observedRtp,
      topWins,
    };
  }

  async listAuditLog(cursor?: string, limit = 20) {
    const entries = await this.prisma.auditLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;

    return {
      entries: page,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /** Reconstructs a round byte-for-byte from its stored rngTrace and asserts it matches. */
  async replaySpin(spinId: string) {
    return this.gameService.replaySpin(spinId);
  }
}
