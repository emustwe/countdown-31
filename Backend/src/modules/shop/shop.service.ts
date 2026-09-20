import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { isValidItemKey } from "../../common/shop-items";

// The shop is now entirely FREE — there is no wallet, currency, price, or treasury. "Buying" an
// item simply grants ownership (adds its key to the user's cosmeticsOwned), idempotently.
@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public arcade marketplace catalog. Active items, display-ordered. Everything is free. */
  async getCatalog() {
    const items = await this.prisma.shopCatalogItem.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    });
    return items.map((i) => ({
      id: i.key,
      name: i.name,
      category: i.category,
      rarity: i.rarity,
      preview: i.preview,
      description: i.description,
      unlocked: i.unlocked,
    }));
  }

  private async ownedOf(userId: string): Promise<Set<string>> {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { cosmeticsOwned: true } });
    if (!u) throw new NotFoundException();
    const arr = Array.isArray(u.cosmeticsOwned) ? (u.cosmeticsOwned as unknown[]) : [];
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  }

  async getShop(userId: string) {
    const owned = await this.ownedOf(userId);
    return { owned: [...owned] };
  }

  /** Claim a cosmetic item — free. Already-owned is a no-op (idempotent). */
  async purchase(userId: string, itemKey: string): Promise<{ owned: string[] }> {
    if (!isValidItemKey(itemKey)) throw new BadRequestException("Unknown shop item");
    const owned = await this.ownedOf(userId);
    if (!owned.has(itemKey)) {
      owned.add(itemKey);
      await this.prisma.user.update({ where: { id: userId }, data: { cosmeticsOwned: [...owned] } });
    }
    return { owned: [...owned] };
  }
}
