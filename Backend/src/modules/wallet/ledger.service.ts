import { Injectable } from "@nestjs/common";
import type { LedgerEntryType, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";

type TxClient = Prisma.TransactionClient;

export interface AppendEntryParams {
  walletId: string;
  amount: bigint;
  type: LedgerEntryType;
  refType?: string;
  refId?: string;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Appends an immutable ledger row. Must be called within the same transaction that
   * updates the wallet's cachedBalance, so the two never drift apart. */
  async appendEntry(tx: TxClient, params: AppendEntryParams): Promise<void> {
    await tx.ledgerEntry.create({
      data: {
        walletId: params.walletId,
        amount: params.amount,
        type: params.type,
        refType: params.refType,
        refId: params.refId,
      },
    });
  }

  /** The source of truth for a wallet's balance — the sum of all its ledger entries. */
  async sumEntries(walletId: string, client: TxClient | PrismaService = this.prisma): Promise<bigint> {
    const result = await client.ledgerEntry.aggregate({
      where: { walletId },
      _sum: { amount: true },
    });
    return result._sum.amount ?? 0n;
  }
}
