import { randomBytes } from "node:crypto";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LedgerService } from "../wallet/ledger.service";
import { BalanceGateway } from "../realtime/balance.gateway";
import {
  SHOP_CURRENCY,
  SHOP_ITEM_PRICE,
  catalogPrices,
  isBasicItem,
  priceForItem,
} from "../../common/shop-items";

// The in-app treasury: a dedicated system account whose wallet accrues all shop revenue. Created
// lazily so a fresh database "just works". Its email is unguessable-ish and it cannot be logged
// into (random password hash that argon2 will never match).
const TREASURY_EMAIL = "treasury@wm.internal";

@Injectable()
export class ShopService {
  private treasuryWalletId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly balanceGateway: BalanceGateway,
  ) {}

  /** Find (or create) the treasury wallet that receives shop payments. */
  private async ensureTreasuryWalletId(): Promise<string> {
    if (this.treasuryWalletId) return this.treasuryWalletId;
    const existing = await this.prisma.user.findUnique({
      where: { email: TREASURY_EMAIL },
      include: { wallet: true },
    });
    if (existing?.wallet) {
      this.treasuryWalletId = existing.wallet.id;
      return existing.wallet.id;
    }
    const created = await this.prisma.$transaction(async (tx) => {
      const user =
        (await tx.user.findUnique({ where: { email: TREASURY_EMAIL } })) ??
        (await tx.user.create({
          data: {
            email: TREASURY_EMAIL,
            fullName: "Treasury",
            // Random hash → not a valid argon2 hash, so this account can never be logged into.
            passwordHash: `disabled:${randomBytes(24).toString("hex")}`,
            // A plain PLAYER role + isSystem flag: it holds a balance but is NOT an admin and is
            // excluded from login and password-reset (see auth.service). Previously role:ADMIN, which
            // made a money-holding account a takeover target.
            role: "PLAYER",
            isSystem: true,
            status: "ACTIVE",
          },
        }));
      const wallet =
        (await tx.wallet.findUnique({ where: { userId: user.id } })) ??
        (await tx.wallet.create({ data: { userId: user.id, cachedBalance: 0n } }));
      return wallet;
    });
    this.treasuryWalletId = created.id;
    return created.id;
  }

  private async ownedOf(userId: string): Promise<Set<string>> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cosmeticsOwned: true },
    });
    if (!u) throw new NotFoundException();
    const arr = Array.isArray(u.cosmeticsOwned) ? (u.cosmeticsOwned as unknown[]) : [];
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  }

  async getShop(userId: string) {
    const owned = await this.ownedOf(userId);
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    return {
      price: SHOP_ITEM_PRICE.toString(),
      prices: catalogPrices(),
      currency: SHOP_CURRENCY,
      owned: [...owned],
      balance: (wallet?.cachedBalance ?? 0n).toString(),
    };
  }

  /** Buy an item at its catalog USDT price, credit the treasury, then grant ownership.
   * Basic/default items are free (no charge). Already-owned items are a no-op. */
  async purchase(
    userId: string,
    itemKey: string,
  ): Promise<{ owned: string[]; balance: string; charged: string }> {
    const itemPrice = priceForItem(itemKey);
    if (itemPrice === null) throw new BadRequestException("Unknown shop item");

    // Free/basic items are owned by everyone — nothing to charge.
    if (isBasicItem(itemKey)) {
      const owned = await this.ownedOf(userId);
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      return { owned: [...owned], balance: (wallet?.cachedBalance ?? 0n).toString(), charged: "0" };
    }

    const treasuryWalletId = await this.ensureTreasuryWalletId();

    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the buyer's wallet so concurrent purchases serialize.
      await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { cosmeticsOwned: true },
      });
      const owned = new Set(
        (Array.isArray(user.cosmeticsOwned) ? (user.cosmeticsOwned as unknown[]) : []).filter(
          (x): x is string => typeof x === "string",
        ),
      );

      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });

      // Already owned → no charge, idempotent.
      if (owned.has(itemKey)) {
        return { owned: [...owned], balance: wallet.cachedBalance.toString(), charged: "0" };
      }

      if (wallet.cachedBalance < itemPrice) {
        throw new BadRequestException("Insufficient funds — deposit USDT to buy shop items");
      }

      // Double-entry: debit the buyer, credit the treasury.
      const buyerBalance = wallet.cachedBalance - itemPrice;
      await this.ledger.appendEntry(tx, {
        walletId: wallet.id,
        amount: -itemPrice,
        type: "SHOP_PURCHASE",
        refType: "SHOP_ITEM",
        refId: itemKey,
      });
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { cachedBalance: buyerBalance, version: { increment: 1 } },
      });

      await this.ledger.appendEntry(tx, {
        walletId: treasuryWalletId,
        amount: itemPrice,
        type: "SHOP_REVENUE",
        refType: "SHOP_ITEM",
        refId: itemKey,
      });
      await tx.wallet.update({
        where: { id: treasuryWalletId },
        data: { cachedBalance: { increment: itemPrice }, version: { increment: 1 } },
      });

      owned.add(itemKey);
      await tx.user.update({ where: { id: userId }, data: { cosmeticsOwned: [...owned] } });

      return { owned: [...owned], balance: buyerBalance.toString(), charged: itemPrice.toString() };
    });

    this.balanceGateway.emitBalanceUpdate(userId, result.balance);
    return result;
  }
}
