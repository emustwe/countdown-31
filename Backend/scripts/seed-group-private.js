// Seeds a PRIVATE (admin-only) GROUP tournament of 3131 players -> 101 groups + a final.
// Group 1 = 30 ACTIVE "bot:" cows (auto-played) + the ADMIN account (seat 31). Group 1 is scheduled
// in the PAST so it is enterable IMMEDIATELY. PRIVATE visibility keeps it out of the public list, so
// only someone with the direct link (you, as admin) can reach it.
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

async function createManyChunked(model, rows, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await model.createMany({ data: rows.slice(i, i + size), skipDuplicates: true });
  }
}

async function main() {
  const now = new Date();
  const scheduledAt = new Date(now.getTime() - 60 * 1000);        // Group 1 already "live"
  const startAt = scheduledAt;                                    // tournament start = group 1 time
  const startDate = new Date(now); startDate.setUTCHours(0, 0, 0, 0);
  const finalAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);  // final on day 2
  const botHash = "disabled:" + crypto.randomBytes(16).toString("hex");

  const admin = await prisma.user.findUnique({ where: { email: "admin@auroraways.demo" } });
  if (!admin) throw new Error("admin@auroraways.demo not found — run the base seed first");

  const t = await prisma.sponsorTournament.create({
    data: {
      title: "Admin Test — 3131 Group Arena",
      description: "PRIVATE test. 3131 players across 101 groups. Group 1 = 30 live cows + you (admin). Enterable now.",
      type: "GROUP", durationDays: 2, visibility: "PRIVATE", status: "APPROVED",
      startAt, startDate, entryClosesAt: now, groupsAssignedAt: now,
      timeOptions: [], minPlayers: 2, maxPlayers: 4000, winnerCount: 1, prizePool: "Bragging rights", createdBy: "admin",
    },
  });
  const tid = t.id;

  // Users: 30 active group-1 bots + 3100 filler bots.
  const G1 = 30, FILL = 3100;
  const names = ["Daisy Cow 🌸", "Bessie AI 🐮", "Barnaby Horns 👑", "Nova Moo ✨", "Luna Loop 🌙", "Rusty Bull 🤠", "Moss Guardian 🌿", "Clover Cow 🍀"];
  const g1Ids = Array.from({ length: G1 }, (_, i) => `bot:pg1-${i + 1}`);
  const fillIds = Array.from({ length: FILL }, () => crypto.randomUUID());
  const users = [];
  g1Ids.forEach((id, i) => users.push({ id, email: `${id.replace(":", "-")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `${names[i % names.length]} ${i + 1}` }));
  fillIds.forEach((id, i) => users.push({ id, email: `pfill-${i + 1}-${crypto.randomBytes(3).toString("hex")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `Player ${i + 1}` }));
  await createManyChunked(prisma.user, users);

  // Entries (3131): g1 bots, then admin, then fillers.
  let seq = 1;
  const entries = [];
  g1Ids.forEach((id) => entries.push({ tournamentId: tid, userId: id, seq: seq++ }));
  entries.push({ tournamentId: tid, userId: admin.id, seq: seq++ });
  fillIds.forEach((id) => entries.push({ tournamentId: tid, userId: id, seq: seq++ }));
  await createManyChunked(prisma.promoEntry, entries);

  // Group 1: 30 active bots + admin (seat 31), scheduled in the PAST => enterable now.
  const g1 = await prisma.tournamentGroup.create({ data: { tournamentId: tid, index: 1, day: 1, scheduledAt, status: "PENDING" } });
  const g1m = g1Ids.map((id, i) => ({ groupId: g1.id, userId: id, seat: i + 1 }));
  g1m.push({ groupId: g1.id, userId: admin.id, seat: 31 });
  await createManyChunked(prisma.groupMember, g1m);

  // Groups 2..101 (100 groups x 31 fillers).
  for (let gi = 0; gi < 100; gi++) {
    const g = await prisma.tournamentGroup.create({ data: { tournamentId: tid, index: gi + 2, day: 1, scheduledAt, status: "PENDING" } });
    const chunk = fillIds.slice(gi * 31, gi * 31 + 31);
    await createManyChunked(prisma.groupMember, chunk.map((id, i) => ({ groupId: g.id, userId: id, seat: i + 1 })));
  }

  // Final group (day 2).
  await prisma.tournamentGroup.create({ data: { tournamentId: tid, index: 102, isFinal: true, day: 2, scheduledAt: finalAt, status: "PENDING" } });

  console.log("TID=" + tid);
  console.log("G1=" + g1.id);
  console.log("scheduledAt(past)=" + scheduledAt.toISOString());
  console.log("ENTRIES=" + entries.length);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
