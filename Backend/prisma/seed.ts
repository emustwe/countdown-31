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
    update: {},
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



  console.log(`Treasury (${TREASURY_EMAIL}) funded with ${TREASURY_FLOAT / USDT} USDT.`);
  console.log(`Admin + ${PLAYER_EMAILS.length} demo players + ${otherWallets.length} other wallets set to USDT balances.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
