// SANDBOX ONLY — reseat the admin into another group of the sandbox tournament.
// The target group's LAST seat is auto-eliminated to free a place, the admin's previous seat is
// released, and the target group is reset to PENDING so it is immediately playable again.
//
//   node scripts/sandbox-rejoin.js 3     # hop into group 3
//   node scripts/sandbox-rejoin.js       # hop into the next group after the current one
//
// Refuses to run on anything except the sandbox tournament, so real events can never be altered.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TID = "sandbox-admin-arena";

async function main() {
  const target = process.argv[2] ? Number(process.argv[2]) : null;
  const admin = await prisma.user.findUnique({ where: { email: "admin@auroraways.demo" } });
  if (!admin) throw new Error("admin not found");
  const t = await prisma.sponsorTournament.findUnique({ where: { id: TID } });
  if (!t) throw new Error("sandbox tournament not found — run scripts/seed-sandbox.js first");

  const groups = await prisma.tournamentGroup.findMany({
    where: { tournamentId: TID, isFinal: false },
    orderBy: { index: "asc" },
    include: { members: { orderBy: { seat: "asc" } } },
  });
  const current = groups.find((g) => g.members.some((m) => m.userId === admin.id));
  const idx = target ?? ((current ? current.index : 0) % groups.length) + 1;
  const dest = groups.find((g) => g.index === idx);
  if (!dest) throw new Error(`group ${idx} not found (1..${groups.length})`);
  if (current?.id === dest.id) {
    console.log(`already in group ${idx}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    // leave the old seat
    if (current) await tx.groupMember.deleteMany({ where: { groupId: current.id, userId: admin.id } });
    // evict the last seat of the destination to make room
    const occupants = dest.members.filter((m) => m.userId !== admin.id);
    const evicted = occupants[occupants.length - 1];
    if (occupants.length >= 31 && evicted) {
      await tx.groupMember.delete({ where: { id: evicted.id } });
    }
    const seat = evicted ? evicted.seat : occupants.length + 1;
    await tx.groupMember.create({ data: { groupId: dest.id, userId: admin.id, seat, result: "PENDING" } });
    // the destination becomes freshly playable, and everyone in it is alive again
    await tx.tournamentGroup.update({
      where: { id: dest.id },
      data: { status: "PENDING", winnerUserId: null, winnerName: null, scheduledAt: new Date(Date.now() - 60_000) },
    });
    await tx.groupMember.updateMany({ where: { groupId: dest.id }, data: { result: "PENDING" } });
  });

  console.log(`admin reseated into group ${idx} (last seat evicted, group reset to PENDING)`);
  console.log("restart the backend to clear the old in-memory room:  ./services.sh restart-backend");
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => prisma.$disconnect());
