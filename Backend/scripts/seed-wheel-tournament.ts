/**
 * Seeds a large PUBLIC test tournament for the Grand Starting Wheel.
 *
 *   npx tsx scripts/seed-wheel-tournament.ts
 *
 * Creates 3,130 dummy entrants + a PUBLIC, APPROVED "Grand Wheel Test" tournament that STARTS IN 5
 * MINUTES. Log in as admin@auroraways.demo (or any player), open /events/<id>, join, and when the
 * countdown hits zero the wheel spins the whole field down to one spotlight, then drops into the
 * arena. Re-run any time for a fresh 5-minute window. Idempotent on the dummy users (email-keyed);
 * each run makes a NEW tournament id.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const N = 3130;

const FIRST = ["Daisy", "Rusty", "Nova", "Luna", "Moss", "Champion", "Bessie", "Barnaby", "Clover", "Buttercup", "Angus", "Milky", "Bramble", "Pepper", "Hazel", "Otis", "Maple", "Ginger", "Duke", "Willow", "Ferdinand", "Cocoa", "Biscuit", "Nutmeg", "Basil", "Olive", "Rosie", "Tank", "Blaze", "Sundae"];
const LAST = ["Moo", "Horns", "Hooves", "Loop", "McSteer", "Grazer", "Longhorn", "Bellow", "Chews", "Stampede", "Pastureson", "Bovine", "Udderly", "Ranch", "Mudd", "Meadows", "Clarabelle", "Stomp", "Galloway", "Holstein"];

async function main(): Promise<void> {
  const admin = await prisma.user.findUnique({ where: { email: "admin@auroraways.demo" }, select: { id: true } });
  const createdBy = admin?.id ?? "system";

  // 1. Dummy entrants (bulk, idempotent on email). No wallets/logins needed — they only populate the
  //    wheel's roster.
  const users = Array.from({ length: N }, (_, i) => ({
    email: `wheel-p${String(i).padStart(4, "0")}@seed.demo`,
    passwordHash: "seed",
    role: "PLAYER" as const,
    fullName: `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`,
  }));
  await prisma.user.createMany({ data: users, skipDuplicates: true });
  const rows = await prisma.user.findMany({ where: { email: { startsWith: "wheel-p" } }, select: { id: true } });

  // 2. PUBLIC, APPROVED tournament that starts in 5 minutes (override with WHEEL_START_SEC).
  const startSec = Number(process.env.WHEEL_START_SEC ?? 300) || 300;
  const startAt = new Date(Date.now() + startSec * 1000);
  const nowUtc = new Date();
  const startDate = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()));
  const t = await prisma.sponsorTournament.create({
    data: {
      title: "Grand Wheel Test 🎡",
      description: "3,130 seeded cows + you. Watch the Grand Starting Wheel spin the whole field across 31 groups down to one spotlight, then drop into the arena.",
      visibility: "PUBLIC",
      status: "APPROVED",
      type: "REGULAR",
      groupCount: 31,
      prizePool: "1,000 USDT",
      winnerCount: 1,
      maxPlayers: 5000,
      startDate,
      startAt,
      timeOptions: [],
      createdBy,
    },
  });

  // 3. Entries (bulk).
  await prisma.promoEntry.createMany({
    data: rows.map((u) => ({ tournamentId: t.id, userId: u.id, skills: [] as string[] })),
    skipDuplicates: true,
  });

  console.log("");
  console.log("=========================================================");
  console.log("  TOURNAMENT_ID = " + t.id);
  console.log("  Open:           /events/" + t.id);
  console.log("  Entrants:       " + rows.length + " seeded (join to be #" + (rows.length + 1) + ")");
  console.log("  Starts at:      " + startAt.toISOString() + "  (in 5 min)");
  console.log("=========================================================");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
