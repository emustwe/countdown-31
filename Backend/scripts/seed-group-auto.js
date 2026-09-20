// Seeds a PRIVATE 7-day GROUP tournament with 3131 entrants but NO groups yet — the groups are drawn
// + auto-scheduled by calling the real POST /assign-groups endpoint afterward (see the run block).
// Admin is entrant #1 so they land in Group 1 (day 1); entrants 2..31 are active "bot:" cows so
// Group 1 is a full auto-played field. Start is ~25 min out so the lobby shows a live countdown.
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();

const MIN = Number(process.env.START_MIN || 25);
const DAYS = Number(process.env.DAYS || 7);
const FILL = Number(process.env.FILL || 3100);
const HUMAN_EMAIL = process.env.HUMAN_EMAIL || "admin@auroraways.demo";
const VIS = process.env.VIS || "PRIVATE";
const TITLE = process.env.TITLE || "Admin Test — 7-Day Auto Schedule";

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

  const admin = await prisma.user.findUnique({ where: { email: HUMAN_EMAIL } });
  if (!admin) throw new Error(HUMAN_EMAIL + " not found");

  const t = await prisma.sponsorTournament.create({
    data: {
      title: TITLE,
      description: "3131 players auto-split into groups, auto-spread across 6 days, final on day 7.",
      type: "GROUP", durationDays: DAYS, visibility: VIS, status: "APPROVED",
      startAt, startDate, entryClosesAt: now, timeOptions: [],
      minPlayers: 2, maxPlayers: 4000, winnerCount: 1, prizePool: "Bragging rights", createdBy: "admin",
    },
  });
  const tid = t.id;

  const names = ["Daisy Cow 🌸", "Bessie AI 🐮", "Barnaby Horns 👑", "Nova Moo ✨", "Luna Loop 🌙", "Rusty Bull 🤠", "Moss Guardian 🌿", "Clover Cow 🍀"];
  const g1Ids = Array.from({ length: 30 }, (_, i) => `bot:ga-${i + 1}`);
  const fillIds = Array.from({ length: FILL }, () => crypto.randomUUID());
  const users = [];
  g1Ids.forEach((id, i) => users.push({ id, email: `${id.replace(":", "-")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `${names[i % names.length]} ${i + 1}` }));
  fillIds.forEach((id, i) => users.push({ id, email: `afill-${i + 1}-${crypto.randomBytes(3).toString("hex")}@t31.bot`, passwordHash: botHash, role: "PLAYER", fullName: `Player ${i + 1}` }));
  await createManyChunked(prisma.user, users);

  // Entries: admin first (seq 1 => Group 1), then 30 active bots, then fillers. NO groups created here.
  let seq = 1;
  const entries = [{ tournamentId: tid, userId: admin.id, seq: seq++ }];
  g1Ids.forEach((id) => entries.push({ tournamentId: tid, userId: id, seq: seq++ }));
  fillIds.forEach((id) => entries.push({ tournamentId: tid, userId: id, seq: seq++ }));
  await createManyChunked(prisma.promoEntry, entries);

  console.log("TID=" + tid);
  console.log("startAt=" + startAt.toISOString() + "  days=" + DAYS);
  console.log("ENTRIES=" + entries.length);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
