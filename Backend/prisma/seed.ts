import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const PLAYER_EMAILS = ["alice@auroraways.demo", "bob@auroraways.demo", "carol@auroraways.demo"];

async function main(): Promise<void> {
  const adminPasswordHash = await argon2.hash("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@auroraways.demo" },
    update: {},
    create: { email: "admin@auroraways.demo", passwordHash: adminPasswordHash, role: "ADMIN" },
  });

  const playerPasswordHash = await argon2.hash("Player123!");
  for (const email of PLAYER_EMAILS) {
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: playerPasswordHash, role: "PLAYER" },
    });
  }

  console.log(`Seeded admin (${admin.email}) and ${PLAYER_EMAILS.length} players.`);
  console.log("Demo wallets funded via the ledger are added in M4.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
