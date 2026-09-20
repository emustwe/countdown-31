// Wipes ALL existing tournaments and seeds ONE always-enterable REGULAR knockout for flow testing.
// startAt is in the PAST (so the game is already "live" and you can enter the arena any time) while
// entryClosesAt is far in the FUTURE (so you can still JOIN any time). 30 active "bot:" cows are
// pre-joined and auto-played by the server, so you always face a full field.
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

const BOTS = Number(process.env.BOTS || 30);

async function createManyChunked(model, rows, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await model.createMany({ data: rows.slice(i, i + size), skipDuplicates: true });
  }
}

async function main() {
  // 1) Wipe every existing tournament (children first, then the tournaments themselves).
  await prisma.groupMember.deleteMany({});
  await prisma.tournamentGroup.deleteMany({});
  await prisma.promoEntry.deleteMany({});
  try { await prisma.tournamentTimeVote.deleteMany({}); } catch {}
  const del = await prisma.sponsorTournament.deleteMany({});
  console.log("wiped tournaments:", del.count);

  const now = new Date();
  const startAt = new Date(now.getTime() - 60 * 1000);          // 1 min in the PAST => already live
  const entryClosesAt = new Date(now.getTime() + 30 * 864e5);   // 30 days in the FUTURE => join anytime
  const startDate = new Date(now); startDate.setUTCHours(0, 0, 0, 0);
  const botHash = "disabled:" + crypto.randomBytes(16).toString("hex");

  // 2) The one always-open tournament.
  const t = await prisma.sponsorTournament.create({
    data: {
      title: "Flow Test — Wheel & Arena",
      description: "Always open. Join anytime, the wheel spins, then last cow standing wins.",
      type: "REGULAR", visibility: "PUBLIC", status: "APPROVED",
      startAt, startDate, entryClosesAt, timeOptions: [],
      minPlayers: 2, maxPlayers: 100, winnerCount: 1, prizePool: "Bragging rights", createdBy: "admin",
    },
  });
  const tid = t.id;

  // 3) 30 active bots (bot: ids => auto-played), all pre-joined.
  const names = ["Daisy Cow 🌸", "Bessie AI 🐮", "Barnaby Horns 👑", "Nova Moo ✨", "Luna Loop 🌙", "Rusty Bull 🤠", "Moss Guardian 🌿", "Clover Cow 🍀"];
  const botIds = Array.from({ length: BOTS }, (_, i) => `bot:ft-${i + 1}`);
  const users = botIds.map((id, i) => ({ id, email: `${id.replace(":", "-")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `${names[i % names.length]} ${i + 1}` }));
  await createManyChunked(prisma.user, users);
  let seq = 1;
  await createManyChunked(prisma.promoEntry, botIds.map((id) => ({ tournamentId: tid, userId: id, seq: seq++ })));

  console.log("TID=" + tid);
  console.log("startAt(past)=" + startAt.toISOString() + "  entryCloses(future)=" + entryClosesAt.toISOString());
  console.log("BOTS=" + BOTS);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
