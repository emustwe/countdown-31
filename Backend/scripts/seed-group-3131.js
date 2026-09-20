// Seeds a REAL GROUP tournament: 3131 players -> 101 groups. Group 1 = 30 ACTIVE bots (userId
// "bot:..." so the server auto-plays them) + one slot for a real account, scheduled to start in 5 min.
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

const MIN = Number(process.env.START_MIN || 6); // start in N minutes

async function createManyChunked(model, rows, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await model.createMany({ data: rows.slice(i, i + size), skipDuplicates: true });
  }
}

async function main() {
  const now = new Date();
  const startAt = new Date(now.getTime() + MIN * 60 * 1000);
  const startDate = new Date(now); startDate.setUTCHours(0, 0, 0, 0);
  const finalAt = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  const botHash = "disabled:" + crypto.randomBytes(16).toString("hex");

  const alice = await prisma.user.findUnique({ where: { email: "alice@auroraways.demo" } });
  if (!alice) throw new Error("alice@auroraways.demo not found — run the seed first");

  // Tournament
  const t = await prisma.sponsorTournament.create({
    data: {
      title: "Group Arena 3131", description: "3131 players across 101 groups. Group 1 = 30 live cows + your seat.",
      type: "GROUP", durationDays: 2, visibility: "PUBLIC", status: "APPROVED",
      startAt, startDate, entryClosesAt: now, groupsAssignedAt: now,
      timeOptions: ["18:00"], minPlayers: 2, maxPlayers: 4000, winnerCount: 1, prizePool: "Bragging rights", createdBy: "admin",
    },
  });
  const tid = t.id;

  // Users: 30 active group-1 bots (bot: ids => server auto-plays) + 3100 filler bots
  const G1 = 30, FILL = 3100;
  const names = ["Daisy Cow 🌸", "Bessie AI 🐮", "Barnaby Horns 👑", "Nova Moo ✨", "Luna Loop 🌙", "Rusty Bull 🤠", "Moss Guardian 🌿", "Clover Cow 🍀"];
  const g1Ids = Array.from({ length: G1 }, (_, i) => `bot:g1-${i + 1}`);
  const fillIds = Array.from({ length: FILL }, () => crypto.randomUUID());

  const users = [];
  g1Ids.forEach((id, i) => users.push({ id, email: `${id.replace(":", "-")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `${names[i % names.length]} ${i + 1}` }));
  fillIds.forEach((id, i) => users.push({ id, email: `fill-${i + 1}-${crypto.randomBytes(3).toString("hex")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `Player ${i + 1}` }));
  await createManyChunked(prisma.user, users);

  // Entries (drives displayed count): g1 bots, then alice, then fillers
  let seq = 1;
  const entries = [];
  g1Ids.forEach((id) => entries.push({ tournamentId: tid, userId: id, seq: seq++ }));
  entries.push({ tournamentId: tid, userId: alice.id, seq: seq++ });
  fillIds.forEach((id) => entries.push({ tournamentId: tid, userId: id, seq: seq++ }));
  await createManyChunked(prisma.promoEntry, entries);

  // Group 1: 30 active bots + alice (seat 31)
  const g1 = await prisma.tournamentGroup.create({ data: { tournamentId: tid, index: 1, day: 1, scheduledAt: startAt, status: "PENDING" } });
  const g1m = g1Ids.map((id, i) => ({ groupId: g1.id, userId: id, seat: i + 1 }));
  g1m.push({ groupId: g1.id, userId: alice.id, seat: 31 });
  await createManyChunked(prisma.groupMember, g1m);

  // Groups 2..101 (100 groups x 31 fillers)
  for (let gi = 0; gi < 100; gi++) {
    const g = await prisma.tournamentGroup.create({ data: { tournamentId: tid, index: gi + 2, day: 1, scheduledAt: startAt, status: "PENDING" } });
    const chunk = fillIds.slice(gi * 31, gi * 31 + 31);
    await createManyChunked(prisma.groupMember, chunk.map((id, i) => ({ groupId: g.id, userId: id, seat: i + 1 })));
  }

  // Final group (day 2)
  await prisma.tournamentGroup.create({ data: { tournamentId: tid, index: 102, isFinal: true, day: 2, scheduledAt: finalAt, status: "PENDING" } });

  console.log("TID=" + tid);
  console.log("G1=" + g1.id);
  console.log("STARTAT=" + startAt.toISOString());
  console.log("ENTRIES=" + entries.length);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
