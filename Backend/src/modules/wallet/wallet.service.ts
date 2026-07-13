import { createHash } from "node:crypto";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LedgerService } from "./ledger.service";
import { BalanceGateway } from "../realtime/balance.gateway";

type TxClient = Prisma.TransactionClient;

export interface MoneyMovementResult {
  balance: string;
  amount: string;
  type: "DEPOSIT" | "WITHDRAWAL";
}

export interface WalletSnapshot {
  balance: string;
  reconciled: boolean;
}

export interface TransactionPage {
  entries: Array<{
    id: string;
    amount: string;
    type: string;
    refType: string | null;
    refId: string | null;
    createdAt: Date;
  }>;
  nextCursor: string | null;
}

function requestHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly config: ConfigService,
    private readonly balanceGateway: BalanceGateway,
  ) {}

  /** Called from within the same transaction that creates the User row, so a user can
   * never exist without a wallet (or vice versa). */
  async createWalletForNewUser(tx: TxClient, userId: string): Promise<void> {
    const startingBalance = BigInt(this.config.get<string>("STARTING_DEMO_BALANCE") ?? "0");

    const wallet = await tx.wallet.create({
      data: { userId, cachedBalance: startingBalance },
    });

    if (startingBalance > 0n) {
      await this.ledger.appendEntry(tx, {
        walletId: wallet.id,
        amount: startingBalance,
        type: "DEPOSIT",
        refType: "SIGNUP_BONUS",
      });
    }
  }

  async deposit(userId: string, amount: bigint, idempotencyKey: string): Promise<MoneyMovementResult> {
    return this.moveMoney(userId, "wallet.deposit", idempotencyKey, amount, "DEPOSIT");
  }

  async withdraw(userId: string, amount: bigint, idempotencyKey: string): Promise<MoneyMovementResult> {
    return this.moveMoney(userId, "wallet.withdraw", idempotencyKey, amount, "WITHDRAWAL");
  }

  async getWallet(userId: string): Promise<WalletSnapshot> {
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const ledgerSum = await this.ledger.sumEntries(wallet.id);
    return {
      balance: wallet.cachedBalance.toString(),
      reconciled: ledgerSum === wallet.cachedBalance,
    };
  }

  async getTransactions(userId: string, cursor?: string, limit = 20): Promise<TransactionPage> {
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });

    const entries = await this.prisma.ledgerEntry.findMany({
      where: { walletId: wallet.id },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const hasMore = entries.length > limit;
    const page = hasMore ? entries.slice(0, limit) : entries;

    return {
      entries: page.map((entry) => ({
        id: entry.id,
        amount: entry.amount.toString(),
        type: entry.type,
        refType: entry.refType,
        refId: entry.refId,
        createdAt: entry.createdAt,
      })),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  private async moveMoney(
    userId: string,
    endpoint: string,
    idempotencyKey: string,
    amount: bigint,
    type: "DEPOSIT" | "WITHDRAWAL",
  ): Promise<MoneyMovementResult> {
    const hash = requestHash({ userId, endpoint, amount: amount.toString() });

    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existing) {
      if (existing.requestHash !== hash) {
        throw new ConflictException(
          "This idempotency key was already used for a different request",
        );
      }
      return existing.responseJson as unknown as MoneyMovementResult;
    }

    const response = await this.prisma.$transaction(async (tx) => {
      // Lock the wallet row for the duration of this transaction so concurrent
      // deposit/withdraw calls for the same user serialize instead of racing.
      await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });

      const signedAmount = type === "DEPOSIT" ? amount : -amount;
      const newBalance = wallet.cachedBalance + signedAmount;

      if (newBalance < 0n) {
        throw new BadRequestException("Insufficient funds");
      }

      await this.ledger.appendEntry(tx, { walletId: wallet.id, amount: signedAmount, type });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { cachedBalance: newBalance, version: { increment: 1 } },
      });

      const response: MoneyMovementResult = {
        balance: newBalance.toString(),
        amount: amount.toString(),
        type,
      };

      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          userId,
          endpoint,
          requestHash: hash,
          responseJson: response as unknown as Prisma.InputJsonValue,
        },
      });

      return response;
    });

    this.balanceGateway.emitBalanceUpdate(userId, response.balance);
    return response;
  }
}
