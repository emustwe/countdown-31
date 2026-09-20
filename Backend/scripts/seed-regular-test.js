// Seeds a REGULAR knockout tournament for END-TO-END flow testing: 30 ACTIVE bots (userId "bot:..."
// so the server auto-plays them) pre-joined, entry OPEN, starting in ~6 min. YOU join yourself
// through the UI to test the real flow: entry -> lobby countdown -> the WHEEL -> the arena.
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

const MIN = Number(process.env.START_MIN || 6); // start in N minutes
const BOTS = Number(process.env.BOTS || 30);

async function createManyChunked(model, rows, size = 1000) {
  for (let i = 0; i < rows.length; i += size) {
    await model.createMany({ data: rows.slice(i, i + size), skipDuplicates: true });
  }
}

async function main() {
  const now = new Date();
  const startAt = new Date(now.getTime() + MIN * 60 * 1000);
  const startDate = new Date(now); startDate.setUTCHours(0, 0, 0, 0);
  const botHash = "disabled:" + crypto.randomBytes(16).toString("hex");

  // REGULAR tournament: single knockout, entry closes AT start, no GMT time-vote (startAt fixed).
  const t = await prisma.sponsorTournament.create({
    data: {
      title: "Flow Test — Wheel & Arena", description: "Join now, watch the lobby countdown, the wheel spins at start, then last cow standing wins.",
      type: "REGULAR", visibility: "PUBLIC", status: "APPROVED",
      startAt, startDate, entryClosesAt: startAt, timeOptions: [],
      minPlayers: 2, maxPlayers: 100, winnerCount: 1, prizePool: "Bragging rights", createdBy: "admin",
    },
  });
  const tid = t.id;

  // 30 active bots (bot: ids => server auto-plays them), all pre-joined as entrants.
  const names = ["Daisy Cow 🌸", "Bessie AI 🐮", "Barnaby Horns 👑", "Nova Moo ✨", "Luna Loop 🌙", "Rusty Bull 🤠", "Moss Guardian 🌿", "Clover Cow 🍀"];
  const botIds = Array.from({ length: BOTS }, (_, i) => `bot:ft-${i + 1}`);
  const users = botIds.map((id, i) => ({ id, email: `${id.replace(":", "-")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `${names[i % names.length]} ${i + 1}` }));
  await createManyChunked(prisma.user, users);

  let seq = 1;
  const entries = botIds.map((id) => ({ tournamentId: tid, userId: id, seq: seq++ }));
  await createManyChunked(prisma.promoEntry, entries);

  console.log("TID=" + tid);
  console.log("STARTAT=" + startAt.toISOString());
  console.log("BOTS=" + BOTS);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
