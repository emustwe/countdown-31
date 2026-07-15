import { randomUUID, createHash } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LedgerService } from "../wallet/ledger.service";
import { createSecureRng, createTraceRng, getMathModel, resolveSpin, type MathModel } from "../../engine";
import { toPublicMathModel, type PublicMathModel } from "./public-model.mapper";
import { serializeLine, toSpinApiResponse, type SpinApiResponse } from "./spin-response.mapper";
import { SIDE_EFFECTS_JOBS, SIDE_EFFECTS_QUEUE, type SpinCompletedJobData } from "../../common/queue/queue.constants";
import { BalanceGateway } from "../realtime/balance.gateway";

const GAME_CONFIG_ID = "singleton";

function requestHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

@Injectable()
export class GameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly config: ConfigService,
    @InjectQueue(SIDE_EFFECTS_QUEUE) private readonly sideEffectsQueue: Queue<SpinCompletedJobData>,
    private readonly balanceGateway: BalanceGateway,
  ) {}

  async getActiveModel(): Promise<MathModel> {
    const gameConfig = await this.prisma.gameConfig.findUnique({ where: { id: GAME_CONFIG_ID } });
    if (!gameConfig) {
      throw new NotFoundException("No active math model is configured");
    }
    return getMathModel(gameConfig.activeModelId);
  }

  async getPublicConfig(): Promise<PublicMathModel> {
    return toPublicMathModel(await this.getActiveModel());
  }

  async spin(userId: string, totalBet: bigint, idempotencyKey: string): Promise<SpinApiResponse> {
    const hash = requestHash({ userId, endpoint: "game.spin", totalBet: totalBet.toString() });

    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existing) {
      if (existing.requestHash !== hash) {
        throw new ConflictException(
          "This idempotency key was already used for a different request",
        );
      }
      return existing.responseJson as unknown as SpinApiResponse;
    }

    const minBet = BigInt(this.config.get<string>("MIN_BET") ?? "1");
    const maxBet = BigInt(this.config.get<string>("MAX_BET") ?? "1000000000");
    if (totalBet < minBet || totalBet > maxBet) {
      throw new BadRequestException(`totalBet must be between ${minBet} and ${maxBet} minor units`);
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.status !== "ACTIVE") {
      throw new ForbiddenException("Account is not active");
    }

    const model = await this.getActiveModel();
    const roundId = randomUUID();

    const response = await this.prisma.$transaction(async (tx) => {
      // Row lock: concurrent spins for the same user serialize instead of racing on balance.
      await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });

      if (wallet.cachedBalance < totalBet) {
        throw new BadRequestException("Insufficient funds");
      }

      // Debit first, per the spec's spin algorithm — the stake is charged before the
      // outcome is even known.
      await this.ledger.appendEntry(tx, {
        walletId: wallet.id,
        amount: -totalBet,
        type: "BET_STAKE",
        refType: "GAME_ROUND",
        refId: roundId,
      });

      const rng = createSecureRng();
      const result = resolveSpin({ model, totalBet }, rng);

      const featureSpinCount = result.feature?.spins.length ?? 0;
      const state = featureSpinCount > 0 ? "FEATURE" : "COMPLETE";
      const baseWin = result.totalWin - (result.feature?.featureWin ?? 0n);

      await tx.gameRound.create({
        data: {
          id: roundId,
          userId,
          walletId: wallet.id,
          modelId: model.id,
          modelVersion: model.version,
          totalBet,
          state,
          freeSpinsRemaining: featureSpinCount,
          totalWin: result.totalWin,
          completedAt: state === "COMPLETE" ? new Date() : null,
        },
      });

      // The base spin row carries the FULL rngTrace for the round (base + every free
      // spin) — resolveSpin draws continuously from one rng, so replaying this one trace
      // reconstructs the entire round. Feature-step rows don't need their own trace.
      await tx.spin.create({
        data: {
          roundId,
          index: 0,
          gridJson: result.grid,
          resultJson: {
            lines: result.lines.map(serializeLine),
            scatterCount: result.scatterCount,
            ...(result.jackpot ? { jackpot: { tier: result.jackpot.tier, pay: result.jackpot.pay.toString() } } : {}),
          },
          rngTraceJson: result.rngTrace,
          win: baseWin,
        },
      });

      if (result.feature) {
        for (const [i, step] of result.feature.spins.entries()) {
          await tx.spin.create({
            data: {
              roundId,
              index: i + 1,
              gridJson: step.grid,
              resultJson: {
                lines: step.lines.map(serializeLine),
                scatterCount: step.scatterCount,
                multiplier: step.multiplier,
                retriggered: step.retriggered,
                ...(step.jackpot ? { jackpot: { tier: step.jackpot.tier, pay: step.jackpot.pay.toString() } } : {}),
              },
              rngTraceJson: [],
              win: step.win,
            },
          });
        }
      }

      // Jackpot wins are booked as their own ledger entry, separate from ordinary line/
      // scatter wins, so BET_WIN + JACKPOT_WIN always sums to exactly totalWin — the
      // audit trail stays able to distinguish "won on the reels" from "hit the jackpot."
      const jackpotTotal =
        (result.jackpot?.pay ?? 0n) +
        (result.feature?.spins.reduce((sum, step) => sum + (step.jackpot?.pay ?? 0n), 0n) ?? 0n);
      const ordinaryWin = result.totalWin - jackpotTotal;

      if (ordinaryWin > 0n) {
        await this.ledger.appendEntry(tx, {
          walletId: wallet.id,
          amount: ordinaryWin,
          type: "BET_WIN",
          refType: "GAME_ROUND",
          refId: roundId,
        });
      }
      if (jackpotTotal > 0n) {
        await this.ledger.appendEntry(tx, {
          walletId: wallet.id,
          amount: jackpotTotal,
          type: "JACKPOT_WIN",
          refType: "GAME_ROUND",
          refId: roundId,
        });
      }

      const newBalance = wallet.cachedBalance - totalBet + result.totalWin;
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { cachedBalance: newBalance, version: { increment: 1 } },
      });

      const response = toSpinApiResponse(roundId, newBalance, totalBet, result);

      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          userId,
          endpoint: "game.spin",
          requestHash: hash,
          responseJson: response as unknown as Prisma.InputJsonValue,
        },
      });

      return response;
    });

    // Fire-and-forget: never let a queue hiccup delay or fail the spin response — the
    // money and round are already durably committed above.
    await this.sideEffectsQueue
      .add(SIDE_EFFECTS_JOBS.SPIN_COMPLETED, {
        roundId,
        userId,
        totalBet: totalBet.toString(),
        totalWin: response.totalWin,
      })
      .catch(() => undefined);

    this.balanceGateway.emitBalanceUpdate(userId, response.newBalance);
    return response;
  }

  async playNextFreeSpin(userId: string, roundId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "GameRound" WHERE id = ${roundId} FOR UPDATE`;
      const round = await tx.gameRound.findUnique({ where: { id: roundId } });

      if (!round) throw new NotFoundException("Round not found");
      if (round.userId !== userId) throw new ForbiddenException("This round does not belong to you");
      if (round.state !== "FEATURE" || round.freeSpinsRemaining <= 0) {
        throw new BadRequestException("This round has no free spins left to reveal");
      }

      const totalFeatureSpins = await tx.spin.count({ where: { roundId, index: { gt: 0 } } });
      const nextIndex = totalFeatureSpins - round.freeSpinsRemaining + 1;
      const spinRow = await tx.spin.findUniqueOrThrow({
        where: { roundId_index: { roundId, index: nextIndex } },
      });

      const remaining = round.freeSpinsRemaining - 1;
      const nextState = remaining === 0 ? "COMPLETE" : "FEATURE";

      await tx.gameRound.update({
        where: { id: roundId },
        data: {
          freeSpinsRemaining: remaining,
          state: nextState,
          completedAt: nextState === "COMPLETE" ? new Date() : null,
        },
      });

      return {
        roundId,
        index: spinRow.index,
        grid: spinRow.gridJson,
        result: spinRow.resultJson,
        win: spinRow.win.toString(),
        freeSpinsRemaining: remaining,
        state: nextState,
      };
    });
  }

  async listRounds(userId: string, cursor?: string, limit = 20) {
    const rounds = await this.prisma.gameRound.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = rounds.length > limit;
    const page = hasMore ? rounds.slice(0, limit) : rounds;

    return {
      rounds: page.map((round) => ({
        id: round.id,
        modelId: round.modelId,
        totalBet: round.totalBet.toString(),
        totalWin: round.totalWin.toString(),
        state: round.state,
        createdAt: round.createdAt,
        completedAt: round.completedAt,
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async getRound(userId: string, roundId: string) {
    const round = await this.prisma.gameRound.findUnique({
      where: { id: roundId },
      include: { spins: { orderBy: { index: "asc" } } },
    });
    if (!round || round.userId !== userId) {
      throw new NotFoundException("Round not found");
    }

    return {
      id: round.id,
      modelId: round.modelId,
      modelVersion: round.modelVersion,
      totalBet: round.totalBet.toString(),
      totalWin: round.totalWin.toString(),
      state: round.state,
      freeSpinsRemaining: round.freeSpinsRemaining,
      createdAt: round.createdAt,
      completedAt: round.completedAt,
      spins: round.spins.map((spin) => ({
        index: spin.index,
        grid: spin.gridJson,
        result: spin.resultJson,
        win: spin.win.toString(),
      })),
    };
  }

  /** Reconstructs a round byte-for-byte from its stored rngTrace and asserts it matches
   * what was persisted. Assumes the model JSON for round.modelId hasn't changed since the
   * round was created — this demo keeps one live copy per model id rather than a full
   * historical archive of every model revision. */
  async replaySpin(spinId: string) {
    const spin = await this.prisma.spin.findUnique({ where: { id: spinId }, include: { round: true } });
    if (!spin) {
      throw new NotFoundException("Spin not found");
    }
    if (spin.index !== 0) {
      throw new BadRequestException(
        "Replay a round via its base spin (index 0) — it reconstructs the whole round",
      );
    }

    const model = getMathModel(spin.round.modelId);
    const trace = spin.rngTraceJson as unknown as number[];
    const recomputed = resolveSpin({ model, totalBet: spin.round.totalBet }, createTraceRng(trace));

    const gridMatches = JSON.stringify(recomputed.grid) === JSON.stringify(spin.gridJson);
    const winMatches = recomputed.totalWin === spin.round.totalWin;

    return {
      match: gridMatches && winMatches,
      stored: { grid: spin.gridJson, totalWin: spin.round.totalWin.toString() },
      recomputed: { grid: recomputed.grid, totalWin: recomputed.totalWin.toString() },
    };
  }
}
