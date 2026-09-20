// SANDBOX ONLY — wipe the sandbox tournament's results so every group is freshly playable and the
// admin is alive again. Use it whenever you've been knocked out and want another run.
//
//   node scripts/sandbox-reset.js
//   ./services.sh restart-backend      # clears the in-memory rooms so the games restart clean
//
// Hard-scoped to the sandbox id — real tournaments can never be reset by this.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TID = "sandbox-admin-arena";

async function main() {
  const t = await prisma.sponsorTournament.findUnique({ where: { id: TID } });
  if (!t) throw new Error("sandbox tournament not found — run scripts/seed-sandbox.js first");

  const groups = await prisma.tournamentGroup.findMany({ where: { tournamentId: TID }, select: { id: true } });
  const ids = groups.map((g) => g.id);
  const past = new Date(Date.now() - 60_000);

  await prisma.$transaction([
    prisma.groupMember.updateMany({ where: { groupId: { in: ids } }, data: { result: "PENDING" } }),
    prisma.tournamentGroup.updateMany({
      where: { id: { in: ids } },
      data: { status: "PENDING", winnerUserId: null, winnerName: null, scheduledAt: past },
    }),
    prisma.sponsorTournament.update({ where: { id: TID }, data: { completedAt: null, winnerName: null } }),
  ]);

  console.log(`sandbox reset — ${ids.length} groups playable again, everyone alive`);
  console.log("now run:  ./services.sh restart-backend");
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
