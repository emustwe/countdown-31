import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const PLAYER_EMAILS = ["alice@auroraways.demo", "bob@auroraways.demo", "carol@auroraways.demo"];
const STARTING_DEMO_BALANCE = BigInt(process.env.STARTING_DEMO_BALANCE ?? "100000");

async function ensureFundedWallet(userId: string): Promise<void> {
  const existing = await prisma.wallet.findUnique({ where: { userId } });
  if (existing) return;

  await prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.create({
      data: { userId, cachedBalance: STARTING_DEMO_BALANCE },
    });
    if (STARTING_DEMO_BALANCE > 0n) {
      await tx.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          amount: STARTING_DEMO_BALANCE,
          type: "DEPOSIT",
          refType: "SIGNUP_BONUS",
        },
      });
    }
  });
}

async function main(): Promise<void> {
  const adminPasswordHash = await argon2.hash("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@auroraways.demo" },
    update: {},
    create: { email: "admin@auroraways.demo", passwordHash: adminPasswordHash, role: "ADMIN" },
  });
  await ensureFundedWallet(admin.id);

  const playerPasswordHash = await argon2.hash("Player123!");
  for (const email of PLAYER_EMAILS) {
    const player = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: playerPasswordHash, role: "PLAYER" },
    });
    await ensureFundedWallet(player.id);
  }

  await prisma.gameConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", activeModelId: "aurora-ways-96", updatedBy: admin.id },
  });

  console.log(`Seeded admin (${admin.email}) and ${PLAYER_EMAILS.length} players.`);
  console.log(`Each wallet funded with ${STARTING_DEMO_BALANCE} minor units via a DEPOSIT ledger entry.`);
  console.log("Active math model: aurora-ways-96.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
