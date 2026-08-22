import { createHash, randomBytes } from "node:crypto";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { isSolanaAddress } from "../../common/crypto/solana-address";
import { LedgerService } from "./ledger.service";
import { SolanaService } from "./solana.service";
import { BalanceGateway } from "../realtime/balance.gateway";
import { AuditService } from "../../common/audit/audit.service";
import { AccountSecurityService } from "../../common/account-security/account-security.service";
import { MailService } from "../../common/mail/mail.service";

type TxClient = Prisma.TransactionClient;

/** A stand-in for a real Solana transaction signature (base58, ~88 chars). Replaced by the
 * actual on-chain signature when the live integration is wired up. */
function mockTxSignature(): string {
  return randomBytes(32).toString("hex");
}

export interface MoneyMovementResult {
  balance: string;
  amount: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  transferId: string;
  txSignature: string;
  address: string;
}

export interface WalletSnapshot {
  balance: string;
  reconciled: boolean;
  currency: string;
  asset: string;
  network: string;
  /** The platform address players send USDT to when depositing. */
  depositAddress: string;
  /** true = real on-chain devnet flow (send from your wallet + verify); false = instant mock. */
  live: boolean;
}

export interface TransactionPage {
  entries: Array<{
    id: string;
    amount: string;
    type: string;
    refType: string | null;
    refId: string | null;
    createdAt: Date;
    transfer: { direction: string; address: string; txSignature: string | null; status: string } | null;
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
    private readonly solana: SolanaService,
    private readonly audit: AuditService,
    private readonly accountSecurity: AccountSecurityService,
    private readonly mail: MailService,
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

  /** Cap how much a single user can withdraw per UTC day, to bound the damage from a compromised
   * account or a treasury-drain attempt. MAX_WITHDRAWAL_PER_DAY is in USDT base units; 0 disables. */
  private async assertDailyWithdrawalCap(userId: string, amount: bigint): Promise<void> {
    const cap = BigInt(this.config.get<string>("MAX_WITHDRAWAL_PER_DAY") ?? "1000000000"); // default 1,000 USDT/day
    if (cap <= 0n) return;
    if (amount > cap) throw new BadRequestException("Amount exceeds the daily withdrawal limit");
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) return;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const agg = await this.prisma.ledgerEntry.aggregate({
      where: { walletId: wallet.id, type: "WITHDRAWAL", createdAt: { gte: since } },
      _sum: { amount: true },
    });
    const alreadyOut = -(agg._sum.amount ?? 0n); // WITHDRAWAL rows are stored as negative amounts
    if (alreadyOut + amount > cap) {
      throw new BadRequestException("Daily withdrawal limit reached — try again tomorrow or contact support");
    }
  }

  /** The instant, un-verified "mock money" path exists ONLY for local dev/test. It is a faucet, so
   * it must never be reachable in production: it requires a non-production NODE_ENV plus an explicit
   * ALLOW_MOCK_MONEY=true opt-in (integration tests always run against it). */
  private mockMoneyAllowed(): boolean {
    if (process.env.NODE_ENV === "test") return true;
    return process.env.NODE_ENV !== "production" && this.config.get<string>("ALLOW_MOCK_MONEY") === "true";
  }

  /** On-ramp: real deposits are credited ONLY after the on-chain transfer is confirmed (see
   * verifyDeposit). The instant credit here is a dev/test faucet and is refused otherwise — this is
   * what stops anyone from minting balance out of thin air. */
  async deposit(userId: string, amount: bigint, idempotencyKey: string): Promise<MoneyMovementResult> {
    if (!this.mockMoneyAllowed()) {
      throw new BadRequestException("Direct deposits are disabled — send USDT on-chain to the deposit address, then verify it from your wallet.");
    }
    const depositAddress = this.config.getOrThrow<string>("SOLANA_TREASURY_ADDRESS");
    return this.moveMoney(userId, "wallet.deposit", idempotencyKey, amount, "DEPOSIT", depositAddress);
  }

  /** Off-ramp: debit the player's in-app USDT wallet and send USDT on-chain to their external
   * Solana address. In live mode this sends real USDT; the instant mock is dev/test only (a
   * misconfigured production must fail closed rather than silently swallow a withdrawal). */
  async withdraw(
    userId: string,
    amount: bigint,
    destinationAddress: string,
    idempotencyKey: string,
    stepUp: { password: string; mfaCode?: string },
  ): Promise<MoneyMovementResult> {
    if (!isSolanaAddress(destinationAddress)) {
      throw new BadRequestException("Enter a valid Solana (USDT) address");
    }
    // A withdrawal is the highest-value action: require a confirmed email AND a fresh re-auth
    // (password + MFA if enrolled) so a hijacked session with only an access token can't drain funds.
    await this.accountSecurity.assertEmailVerified(userId);
    await this.accountSecurity.assertReauthenticated(userId, stepUp.password, stepUp.mfaCode);
    await this.assertDailyWithdrawalCap(userId, amount);
    let result: MoneyMovementResult;
    if (this.solana.isLive) {
      result = await this.liveWithdraw(userId, amount, destinationAddress, idempotencyKey);
    } else {
      if (!this.mockMoneyAllowed()) {
        throw new BadRequestException("Withdrawals are temporarily unavailable (on-chain settlement is not enabled).");
      }
      result = await this.moveMoney(userId, "wallet.withdraw", idempotencyKey, amount, "WITHDRAWAL", destinationAddress);
    }
    this.audit.record("WITHDRAWAL", { actor: userId, detail: { amount: amount.toString(), address: destinationAddress, transferId: result.transferId } });
    // #19: notify the account owner of the withdrawal so an unauthorized cash-out is noticed fast.
    const owner = await this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (owner?.email) {
      const usdt = (Number(amount) / 1_000_000).toFixed(2);
      this.mail.sendSecurityNotice(owner.email, "Withdrawal requested", `A withdrawal of ${usdt} USDT to ${destinationAddress} was requested on your account. If this wasn't you, contact support immediately.`);
    }
    return result;
  }

  /** Live withdrawal: reserve funds (debit + PENDING transfer), send USDT on-chain, then
   * mark COMPLETED with the real signature. If the on-chain send fails, the debit is
   * refunded and the transfer marked FAILED — the player never loses funds to a failed send. */
  private async liveWithdraw(userId: string, amount: bigint, destinationAddress: string, idempotencyKey: string): Promise<MoneyMovementResult> {
    const hash = requestHash({ userId, endpoint: "wallet.withdraw", amount: amount.toString(), address: destinationAddress });
    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } });
    if (existing) {
      if (existing.requestHash !== hash) throw new ConflictException("This idempotency key was already used for a different request");
      return existing.responseJson as unknown as MoneyMovementResult;
    }

    // Phase 1 — reserve: debit the wallet and open a PENDING transfer, atomically.
    const reserved = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      if (wallet.cachedBalance < amount) throw new BadRequestException("Insufficient funds");
      const transfer = await tx.cryptoTransfer.create({
        data: { userId, direction: "WITHDRAWAL", amount, asset: "USDT", network: "SOLANA", address: destinationAddress, status: "PENDING" },
      });
      await this.ledger.appendEntry(tx, { walletId: wallet.id, amount: -amount, type: "WITHDRAWAL", refType: "CRYPTO_TRANSFER", refId: transfer.id });
      const newBalance = wallet.cachedBalance - amount;
      await tx.wallet.update({ where: { id: wallet.id }, data: { cachedBalance: newBalance, version: { increment: 1 } } });
      return { walletId: wallet.id, transferId: transfer.id, newBalance };
    });
    this.balanceGateway.emitBalanceUpdate(userId, reserved.newBalance.toString());

    // Phase 2 — settle on-chain. On failure, refund and surface the error.
    let txSignature: string;
    try {
      txSignature = await this.solana.sendUsdt(destinationAddress, amount);
    } catch (err) {
      const refunded = await this.prisma.$transaction(async (tx) => {
        await tx.cryptoTransfer.update({ where: { id: reserved.transferId }, data: { status: "FAILED" } });
        await this.ledger.appendEntry(tx, { walletId: reserved.walletId, amount, type: "ADJUSTMENT", refType: "WITHDRAWAL_REVERSAL", refId: reserved.transferId });
        const w = await tx.wallet.update({ where: { id: reserved.walletId }, data: { cachedBalance: { increment: amount }, version: { increment: 1 } } });
        return w.cachedBalance;
      });
      this.balanceGateway.emitBalanceUpdate(userId, refunded.toString());
      throw new BadRequestException(`On-chain transfer failed — your funds were returned. (${(err as Error).message.slice(0, 120)})`);
    }

    await this.prisma.cryptoTransfer.update({ where: { id: reserved.transferId }, data: { status: "COMPLETED", txSignature } });
    const response: MoneyMovementResult = {
      balance: reserved.newBalance.toString(),
      amount: amount.toString(),
      type: "WITHDRAWAL",
      transferId: reserved.transferId,
      txSignature,
      address: destinationAddress,
    };
    await this.prisma.idempotencyKey.create({
      data: { key: idempotencyKey, userId, endpoint: "wallet.withdraw", requestHash: hash, responseJson: response as unknown as Prisma.InputJsonValue },
    });
    return response;
  }

  /** Live deposit: scan the chain for USDT the player actually sent from `fromAddress` to
   * the treasury, and credit any transfers not yet credited (deduped by signature). */
  async verifyDeposit(userId: string, fromAddress: string): Promise<{ credited: { amount: string; txSignature: string }[]; balance: string }> {
    if (!this.solana.isLive) throw new BadRequestException("Live deposits are not enabled");
    if (!isSolanaAddress(fromAddress)) throw new BadRequestException("Enter a valid Solana address");
    // Funds only move for a confirmed account.
    await this.accountSecurity.assertEmailVerified(userId);

    // IDOR fix: a source address is bound to exactly one user (first-claim-wins, enforced by the
    // unique index). We only credit transfers from an address that belongs to THIS caller — so a
    // user can never claim an on-chain deposit that another user actually sent. If the address is
    // unclaimed we bind it now; if it's already claimed by someone else, refuse.
    await this.claimDepositAddress(userId, fromAddress);

    const incoming = await this.solana.findIncomingTransfers(fromAddress);
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const credited: { amount: string; txSignature: string }[] = [];

    for (const t of incoming) {
      const already = await this.prisma.cryptoTransfer.findFirst({ where: { txSignature: t.signature } });
      if (already) continue; // deduped — this transfer was credited before
      await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT id FROM "Wallet" WHERE id = ${wallet.id} FOR UPDATE`;
        const transfer = await tx.cryptoTransfer.create({
          data: { userId, direction: "DEPOSIT", amount: BigInt(t.amount), asset: "USDT", network: "SOLANA", address: fromAddress, txSignature: t.signature, status: "COMPLETED" },
        });
        await this.ledger.appendEntry(tx, { walletId: wallet.id, amount: BigInt(t.amount), type: "DEPOSIT", refType: "CRYPTO_TRANSFER", refId: transfer.id });
        await tx.wallet.update({ where: { id: wallet.id }, data: { cachedBalance: { increment: BigInt(t.amount) }, version: { increment: 1 } } });
      });
      credited.push({ amount: t.amount, txSignature: t.signature });
    }

    const updated = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
    if (credited.length) this.balanceGateway.emitBalanceUpdate(userId, updated.cachedBalance.toString());
    return { credited, balance: updated.cachedBalance.toString() };
  }

  /** Bind a source address to this user, or verify it's already theirs. Throws if another user
   * owns it. Uses the unique index to make the first claim atomic under races. */
  private async claimDepositAddress(userId: string, address: string): Promise<void> {
    const existing = await this.prisma.depositBinding.findUnique({ where: { address } });
    if (existing) {
      if (existing.userId !== userId) {
        this.audit.record("DEPOSIT_ADDRESS_CONFLICT", { actor: userId, detail: { address } });
        throw new BadRequestException("This sending address is already linked to another account.");
      }
      return;
    }
    try {
      await this.prisma.depositBinding.create({ data: { userId, address } });
    } catch {
      // Lost the race to bind — re-read; only OK if the winner was us.
      const now = await this.prisma.depositBinding.findUnique({ where: { address } });
      if (!now || now.userId !== userId) {
        throw new BadRequestException("This sending address is already linked to another account.");
      }
    }
  }

  async getWallet(userId: string): Promise<WalletSnapshot> {
    const wallet = await this.prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const ledgerSum = await this.ledger.sumEntries(wallet.id);
    return {
      balance: wallet.cachedBalance.toString(),
      reconciled: ledgerSum === wallet.cachedBalance,
      currency: wallet.currency,
      asset: "USDT",
      network: "Solana",
      depositAddress: this.config.getOrThrow<string>("SOLANA_TREASURY_ADDRESS"),
      live: this.solana.isLive,
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

    // Attach the crypto-transfer detail (address / signature / status) for deposit and
    // withdrawal rows so the history UI can show where the money went on-chain.
    const transferIds = page.filter((e) => e.refType === "CRYPTO_TRANSFER" && e.refId).map((e) => e.refId!);
    const transfers = transferIds.length
      ? await this.prisma.cryptoTransfer.findMany({ where: { id: { in: transferIds } } })
      : [];
    const transferById = new Map(transfers.map((t) => [t.id, t]));

    return {
      entries: page.map((entry) => {
        const t = entry.refType === "CRYPTO_TRANSFER" && entry.refId ? transferById.get(entry.refId) : undefined;
        return {
          id: entry.id,
          amount: entry.amount.toString(),
          type: entry.type,
          refType: entry.refType,
          refId: entry.refId,
          createdAt: entry.createdAt,
          transfer: t ? { direction: t.direction, address: t.address, txSignature: t.txSignature, status: t.status } : null,
        };
      }),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  private async moveMoney(
    userId: string,
    endpoint: string,
    idempotencyKey: string,
    amount: bigint,
    type: "DEPOSIT" | "WITHDRAWAL",
    address: string,
  ): Promise<MoneyMovementResult> {
    const hash = requestHash({ userId, endpoint, amount: amount.toString(), address });

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

      // Record the on/off-ramp movement. On-chain settlement is stubbed for now: the
      // transfer is created COMPLETED with a mock signature. When the real Solana
      // integration lands, this becomes PENDING until the chain confirms.
      const txSignature = mockTxSignature();
      const transfer = await tx.cryptoTransfer.create({
        data: {
          userId,
          direction: type,
          amount,
          asset: "USDT",
          network: "SOLANA",
          address,
          txSignature,
          status: "COMPLETED",
        },
      });

      await this.ledger.appendEntry(tx, { walletId: wallet.id, amount: signedAmount, type, refType: "CRYPTO_TRANSFER", refId: transfer.id });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { cachedBalance: newBalance, version: { increment: 1 } },
      });

      const response: MoneyMovementResult = {
        balance: newBalance.toString(),
        amount: amount.toString(),
        type,
        transferId: transfer.id,
        txSignature,
        address,
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
