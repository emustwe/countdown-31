/**
 * Delete a user (and their dependent rows) by email, so the signup flow can be re-tested with a
 * fresh address. Usage:  npx tsx scripts/delete-user.ts <email>
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2] || "emustwe@gmail.com";

async function main() {
  const prisma = new PrismaClient();
  const u = await prisma.user.findUnique({ where: { email } });
  if (!u) {
    console.log(`No user found for ${email} — nothing to delete.`);
    await prisma.$disconnect();
    return;
  }
  // MatchPlayer.userId has no cascading FK, so clear those rows first; the User's other relations
  // (wallet, ledger, gameRounds, entries, rebuys, notifications, refresh tokens…) all cascade.
  await prisma.$transaction(async (tx) => {
    await tx.matchPlayer.deleteMany({ where: { userId: u.id } });
    await tx.user.delete({ where: { id: u.id } });
  });
  console.log(`Deleted user ${email} (${u.id}).`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("DELETE ERROR:", e);
  process.exit(1);
});
