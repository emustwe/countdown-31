/**
 * (Re)create a fresh "Weekly Go" WEEKLY tournament with 99 dummy players ALREADY JOINED and
 * ONE open slot, so the real user can join the last seat and test the re-buy flow.
 *
 * Mirrors production exactly: the WEEKLY template (100 players, 3 rounds) and the SEQUENTIAL
 * seating that `TournamentsService.join()` now performs — each registering player is seated
 * into the first Round 1 group with space (group 1 fills to 10, then group 2, …). 99 players
 * → groups 1–9 full (10 each) and group 10 holds 9, leaving exactly one open seat in group 10.
 *
 * Run: npx tsx scripts/seed-weekly-go.ts
 */
import { PrismaClient } from "@prisma/client";

const ADMIN_EMAIL = "admin@auroraways.demo";
// Tournament name + dummy-email namespace come from argv so each run makes a distinct
// tournament with its own dummy pool: npx tsx scripts/seed-weekly-go.ts "Weekly Go 2"
const NAME = process.argv[2] || "Weekly Go";
const DUMMY_PREFIX = `${NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-`;
const STARTING_CREDITS = 5_000_000n; // 50,000 coins
const MIN = 60_000;
// Production timing: every group match is 5 minutes, with a 10-minute gap before the next
// group, and each ROUND is one day after the previous. All argv-tunable for faster testing:
//   npx tsx scripts/seed-weekly-go.ts "<name>" <matchSec> <gapSec> <round1DelayMin> <dummies> <daysBetweenRounds>
const DURATION_SEC = Number(process.argv[3] || 300); // 5-minute match window per group
const GAP_SEC = Number(process.argv[4] || 600); // 10-minute gap between groups
const ROUND1_DELAY_MIN = Number(process.argv[5] || 10); // round 1 starts in 10 min (join window)
const DUMMIES = Number(process.argv[6] || 98); // fewer dummies → the real user lands earlier
const DAYS_BETWEEN_ROUNDS = Number(process.argv[7] || 1); // each round is 1 day after the last
const BRAND = (process.argv[8] || "WM") as "WM" | "VA"; // co-branding skin
const PREJOIN_EMAIL = process.argv[9] || ""; // optionally pre-seat this real user into group 1
// VA tournaments carry an entry fee so the dynamic 2× prize pool is demonstrable.
const ENTRY_FEE = BRAND === "VA" ? 10_000_000n : 0n; // VA = $10 fixed

// WEEKLY template (matches GROUP_TEMPLATES.WEEKLY in tournaments.service.ts).
const ROUNDS = [
  { groupCount: 10, playersPerGroup: 10, advancePerGroup: 5 }, // 100 -> 50
  { groupCount: 10, playersPerGroup: 5, advancePerGroup: 2 }, //  50 -> 20
  { groupCount: 1, playersPerGroup: 20, advancePerGroup: 10 }, // 20 -> top 10
];
const PRIZE_SPLIT = [30, 20, 15, 10, 5, 4, 4, 4, 4, 4];

async function main() {
  const prisma = new PrismaClient();
  const admin = await prisma.user.findFirstOrThrow({ where: { email: ADMIN_EMAIL } });

  // 1. Remove any previous tournament with the same name (cascades entries/rounds/matches).
  const old = await prisma.tournament.findMany({ where: { name: NAME } });
  for (const t of old) {
    await prisma.tournament.delete({ where: { id: t.id } });
    console.log(`Deleted old "${NAME}" ${t.id}`);
  }

  // 2. Ensure 99 dummy players exist (reuse across runs), each with a wallet.
  const dummies: string[] = [];
  for (let i = 1; i <= DUMMIES; i++) {
    const email = `${DUMMY_PREFIX}${String(i).padStart(3, "0")}@seed.demo`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email, passwordHash: "seed", role: "PLAYER", fullName: `Player ${i}`, wallet: { create: { cachedBalance: 0n } } },
    });
    dummies.push(u.id);
  }
  console.log(`${dummies.length} dummy players ready.`);

  // 3. Create the tournament + rounds + STAGGERED groups. Groups within a round play one after
  //    another: group g starts stride*g after the round's start, stride = match + gap. Round
  //    start times are FIXED here and never recomputed — each round is spaced comfortably after
  //    the previous round's last group finishes.
  const now = Date.now();
  const strideMs = (DURATION_SEC + GAP_SEC) * 1000;
  const roundSpanMs = (gc: number) => (gc - 1) * strideMs + DURATION_SEC * 1000; // start → last group's end
  const DAY_MS = 24 * 60 * MIN;
  // Round 1 opens shortly; each later round is a fixed number of days after Round 1 — and never
  // moved. (Guard: the day gap must exceed a round's own staggered span so groups don't overlap.)
  const round1Start = now + ROUND1_DELAY_MIN * MIN;
  const roundStarts = ROUNDS.map((_, r) => new Date(round1Start + r * DAYS_BETWEEN_ROUNDS * DAY_MS));
  for (let r = 1; r < ROUNDS.length; r++) {
    const prevEnd = roundStarts[r - 1]!.getTime() + roundSpanMs(ROUNDS[r - 1]!.groupCount);
    if (roundStarts[r]!.getTime() < prevEnd) throw new Error(`Round ${r + 1} would overlap Round ${r}; increase daysBetweenRounds.`);
  }
  const lastCfg = ROUNDS[ROUNDS.length - 1]!;
  const endAt = new Date(roundStarts[ROUNDS.length - 1]!.getTime() + (lastCfg.groupCount - 1) * strideMs + DURATION_SEC * 1000);
  const pool = 1_000_000_000n; // 1,000 USDT
  const prizeJson = PRIZE_SPLIT.map((pct, i) => ({ rank: i + 1, amount: ((pool * BigInt(pct)) / 100n).toString() }));

  const t = await prisma.tournament.create({
    data: {
      name: NAME,
      modelId: "aurora-ways-tournament",
      format: "WEEKLY",
      brand: BRAND,
      state: "SCHEDULED",
      entryFee: ENTRY_FEE,
      startingCredits: STARTING_CREDITS,
      startAt: roundStarts[0]!,
      endAt,
      maxEntries: 100,
      capacity: 100,
      roundsCount: ROUNDS.length,
      matchDurationSec: DURATION_SEC,
      roundGapSec: GAP_SEC,
      prizeJson,
      createdBy: admin.id,
    },
  });

  const round1Matches: string[] = [];
  for (let r = 0; r < ROUNDS.length; r++) {
    const cfg = ROUNDS[r]!;
    const round = await prisma.tournamentRound.create({
      data: { tournamentId: t.id, index: r + 1, startAt: roundStarts[r]!, groupCount: cfg.groupCount, playersPerGroup: cfg.playersPerGroup, advancePerGroup: cfg.advancePerGroup },
    });
    for (let g = 0; g < cfg.groupCount; g++) {
      // Staggered: group g plays stride*g after the round starts.
      const m = await prisma.match.create({ data: { tournamentId: t.id, roundId: round.id, index: g, startAt: new Date(round.startAt.getTime() + g * strideMs) } });
      if (r === 0) round1Matches.push(m.id);
    }
  }
  console.log(`Created "${NAME}" ${t.id}`);
  console.log(`  match ${DURATION_SEC}s · gap ${GAP_SEC}s · stride ${(DURATION_SEC + GAP_SEC)}s between groups`);
  roundStarts.forEach((d, i) => console.log(`  Round ${i + 1} starts ${d.toLocaleString()} (${ROUNDS[i]!.groupCount} groups play through ${new Date(d.getTime() + (ROUNDS[i]!.groupCount - 1) * strideMs + DURATION_SEC * 1000).toLocaleString()})`));

  // 4. Register 99 dummies one-by-one, seating each sequentially (exactly as join() does now):
  //    entry created, then player placed into the first Round 1 group with a free seat.
  const per = ROUNDS[0]!.playersPerGroup;
  for (let i = 0; i < dummies.length; i++) {
    await prisma.$transaction(async (tx) => {
      await tx.tournamentEntry.create({ data: { tournamentId: t.id, userId: dummies[i]!, credits: STARTING_CREDITS, score: STARTING_CREDITS } });
      const g = Math.floor(i / per); // sequential: group 1 fills first, then group 2, …
      const seat = i % per;
      await tx.matchPlayer.create({ data: { tournamentId: t.id, matchId: round1Matches[g]!, userId: dummies[i]!, seat, coins: STARTING_CREDITS, score: STARTING_CREDITS } });
    });
    if ((i + 1) % 20 === 0) console.log(`  joined ${i + 1}/${dummies.length}`);
  }

  // 4b. Optionally pre-seat a real user (so they can play immediately even when registration is
  //     locked — e.g. VA locks a day before Round 1). Seated into the first group with space.
  if (PREJOIN_EMAIL) {
    const u = await prisma.user.findUnique({ where: { email: PREJOIN_EMAIL } });
    if (!u) {
      console.log(`  ⚠ pre-join user ${PREJOIN_EMAIL} not found — skipped`);
    } else {
      const existing = await prisma.tournamentEntry.findUnique({ where: { tournamentId_userId: { tournamentId: t.id, userId: u.id } } });
      if (!existing) {
        const idx = dummies.length; // next sequential seat
        const g = Math.floor(idx / per);
        const seat = idx % per;
        await prisma.$transaction(async (tx) => {
          await tx.tournamentEntry.create({ data: { tournamentId: t.id, userId: u.id, credits: STARTING_CREDITS, score: STARTING_CREDITS } });
          await tx.matchPlayer.create({ data: { tournamentId: t.id, matchId: round1Matches[g]!, userId: u.id, seat, coins: STARTING_CREDITS, score: STARTING_CREDITS } });
        });
        console.log(`  pre-seated ${PREJOIN_EMAIL} into Group ${g + 1}`);
      } else {
        console.log(`  ${PREJOIN_EMAIL} already entered`);
      }
    }
  }

  // 5. Report the live group fill (proof it distributed automatically, one-by-one).
  const round = await prisma.tournamentRound.findFirstOrThrow({
    where: { tournamentId: t.id, index: 1 },
    include: { matches: { orderBy: { index: "asc" }, include: { players: true } } },
  });
  console.log("\nRound 1 group fill (sequential, no admin action):");
  round.matches.forEach((m) => console.log(`  Group ${m.index + 1}: ${m.players.length}/${round.playersPerGroup}`));
  const total = round.matches.reduce((a, m) => a + m.players.length, 0);
  console.log(`\nSeated ${total}/100 · ${100 - total} open slot(s) → join the last seat as emustwe@gmail.com to test re-buy.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("SEED ERROR:", e);
  process.exit(1);
});
