import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// Wallet money is USDT on Solana, 6 decimals: 1 USDT = 1_000_000 base units.
const USDT = 1_000_000n;
const TREASURY_EMAIL = process.env.TREASURY_USER_EMAIL ?? "treasury@wm.system";
const TREASURY_FLOAT = 1_000_000n * USDT; // 1,000,000 USDT operating float
const ADMIN_BALANCE = 10_000n * USDT;
const PLAYER_BALANCE = 1_000n * USDT;

const PLAYER_EMAILS = ["alice@auroraways.demo", "bob@auroraways.demo", "carol@auroraways.demo"];

async function ensureUser(email: string, passwordHash: string, role: "ADMIN" | "PLAYER") {
  return prisma.user.upsert({
    where: { email },
    update: { passwordHash, role },
    create: { email, passwordHash, role },
  });
}

async function ensureWallet(userId: string): Promise<string> {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return existing.id;
  const wallet = await prisma.wallet.create({ data: { userId, cachedBalance: 0n, currency: "USDT" } });
  return wallet.id;
}

/** Set a wallet's balance to an exact USDT target, keeping the ledger append-only and
 * reconciled: append one ADJUSTMENT for the delta, then update the cached balance. */
async function setBalance(userId: string, targetBaseUnits: bigint): Promise<void> {
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) return;
  const agg = await prisma.ledgerEntry.aggregate({ where: { walletId: wallet.id }, _sum: { amount: true } });
  const sum = agg._sum.amount ?? 0n;
  const diff = targetBaseUnits - sum;
  if (diff !== 0n) {
    await prisma.ledgerEntry.create({ data: { walletId: wallet.id, amount: diff, type: "ADJUSTMENT", refType: "USDT_RESEED" } });
  }
  await prisma.wallet.update({ where: { id: wallet.id }, data: { cachedBalance: targetBaseUnits, currency: "USDT" } });
}

// Arcade shop catalog (coins & gems marketplace). Upserted by stable `key` so re-seeding is safe
// and admins can add more rows over time without this clobbering their additions.
const SHOP_CATALOG: Array<{
  key: string;
  name: string;
  category: string;
  rarity: string;
  price: number;
  currency: string;
  preview: string;
  description: string;
  unlocked?: boolean;
}> = [
  // Skins
  { key: "golden_emperor", name: "Golden Emperor Bull", category: "skins", rarity: "Mythic", price: 1500, currency: "coins", preview: "/assets/Avatar1.png", description: "Legendary gilded monarch bull with sovereign radiance.", unlocked: true },
  { key: "base_bull", name: "Classic Varsity Bull", category: "skins", rarity: "Common", price: 0, currency: "coins", preview: "/assets/Simple Avatar no background.png", description: "The iconic Barnaby varsity athlete bull.", unlocked: true },
  { key: "barnaby", name: "Barnaby Pasture Master", category: "skins", rarity: "Epic", price: 750, currency: "coins", preview: "/assets/barnaby/barnaby-field.jpg", description: "The fearless captain of the 31 counting pasture." },
  // Frames
  { key: "mythic_gold", name: "Sovereign Gold Crest", category: "frames", rarity: "Mythic", price: 1000, currency: "coins", preview: "border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.8)]", description: "Forged from pure pasture gold with radiant corner gems." },
  { key: "neon_glacier", name: "Neon Glacier Frame", category: "frames", rarity: "Epic", price: 500, currency: "coins", preview: "border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.7)]", description: "Sub-zero frozen crystal border with icy pulsations." },
  { key: "inferno", name: "Infernal Volcano Crest", category: "frames", rarity: "Epic", price: 600, currency: "coins", preview: "border-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.7)]", description: "Molten volcanic rock border with burning ember particles." },
  // Skills
  { key: "skill_rewind", name: "Chrono Rewind Pack (x5)", category: "skills", rarity: "Epic", price: 300, currency: "coins", preview: "🔄 -2 STEPS", description: "Rewinds live counter by 2 digits during tough countdowns." },
  { key: "skill_turbo", name: "Turbo Leap Pack (x5)", category: "skills", rarity: "Epic", price: 300, currency: "coins", preview: "⚡ +3 LEAP", description: "Instantly leaps forward +3 numbers in a surprise rush." },
  { key: "skill_shield", name: "Bovine Barrier (x5)", category: "skills", rarity: "Legendary", price: 450, currency: "coins", preview: "🛡️ SHIELD", description: "Grants Divine Shield immunity for 1 turn against blunders." },
  { key: "skill_snooze", name: "Pasture Snooze (x5)", category: "skills", rarity: "Legendary", price: 500, currency: "coins", preview: "🌙 SKIP", description: "Safely passes turn to the next player without picking cards." },
  // Vault
  { key: "vault_1", name: "Handful of Gold (500 Coins)", category: "vault", rarity: "Common", price: 5, currency: "gems", preview: "🪙 500", description: "Starter coin stash for pasture brawlers." },
  { key: "vault_2", name: "Barnaby Chest (2,500 Coins)", category: "vault", rarity: "Epic", price: 20, currency: "gems", preview: "🪙 2,500", description: "Heavy wooden chest packed with arcade gold." },
  { key: "vault_3", name: "Royal Bull Vault (10,000 Coins)", category: "vault", rarity: "Mythic", price: 60, currency: "gems", preview: "🪙 10,000", description: "Grand treasury of royal pasture coins with 20% bonus." },
];

async function seedShopCatalog(): Promise<void> {
  for (let i = 0; i < SHOP_CATALOG.length; i++) {
    const it = SHOP_CATALOG[i];
    const data = {
      name: it.name,
      category: it.category,
      rarity: it.rarity,
      price: it.price,
      currency: it.currency,
      preview: it.preview,
      description: it.description,
      unlocked: it.unlocked ?? false,
      active: true,
      sortOrder: i,
    };
    await prisma.shopCatalogItem.upsert({
      where: { key: it.key },
      update: data,
      create: { key: it.key, ...data },
    });
  }
}

async function main(): Promise<void> {
  // 1. Treasury system user + pre-funded operating float.
  const treasuryHash = await argon2.hash(process.env.TREASURY_PASSWORD ?? `treasury-${Math.random()}`);
  const treasury = await ensureUser(TREASURY_EMAIL, treasuryHash, "ADMIN");
  await ensureWallet(treasury.id);
  await setBalance(treasury.id, TREASURY_FLOAT);

  // 2. Admin + demo players, funded in USDT.
  const adminPasswordHash = await argon2.hash("Admin123!");
  const admin = await ensureUser("admin@auroraways.demo", adminPasswordHash, "ADMIN");
  await ensureWallet(admin.id);
  await setBalance(admin.id, ADMIN_BALANCE);

  const playerPasswordHash = await argon2.hash("Player123!");
  for (const email of PLAYER_EMAILS) {
    const player = await ensureUser(email, playerPasswordHash, "PLAYER");
    await ensureWallet(player.id);
    await setBalance(player.id, PLAYER_BALANCE);
  }

  // 3. Reset every remaining (non-treasury) wallet to a standard USDT test balance, so any
  //    pre-existing test accounts (e.g. the 100/500 tournament seed players) are funded and
  //    denominated in USDT. Reset was the chosen migration strategy.
  const otherWallets = await prisma.wallet.findMany({
    where: { userId: { notIn: [treasury.id] } },
    select: { userId: true },
  });
  for (const w of otherWallets) {
    const has = await prisma.ledgerEntry.count({ where: { wallet: { userId: w.userId }, refType: "USDT_RESEED" } });
    if (has === 0) await setBalance(w.userId, PLAYER_BALANCE);
  }



  // 4. Arcade shop catalog.
  await seedShopCatalog();

  console.log(`Treasury (${TREASURY_EMAIL}) funded with ${TREASURY_FLOAT / USDT} USDT.`);
  console.log(`Admin + ${PLAYER_EMAILS.length} demo players + ${otherWallets.length} other wallets set to USDT balances.`);
  console.log(`Shop catalog seeded with ${SHOP_CATALOG.length} items.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
