/**
 * (Re)create a fresh "VA Tournament Style" VA-branded WEEKLY tournament with 99 dummy players
 * seeded so that GROUP 1 has exactly ONE open seat and groups 2–10 are full. When the real user
 * registers through the UI, `join()` seats them into the first group with space — group 1 — so
 * they land in the first group as requested.
 *
 *   group 1  → 9 seeded + 1 OPEN  (the user takes this seat)
 *   groups 2-10 → 10 each (full)
 *   total seeded = 9 + 90 = 99
 *
 * VA rules: $10 entry fee, dynamic 2× prize pool, and registration LOCKS 24h before Round 1.
 * So Round 1 is scheduled ~2 days out — registration stays open for ~1 day so the user can join.
 *
 * Run:  npx tsx scripts/seed-va-style.ts
 */
import { PrismaClient } from "@prisma/client";

const ADMIN_EMAIL = "admin@auroraways.demo";
const NAME = "VA Tournament Style";
const BRAND = "VA" as const;
const DUMMY_PREFIX = `${NAME.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-`;
const STARTING_CREDITS = 5_000_000n; // 50,000 coins
const ENTRY_FEE = 10_000_000n; // VA = $10 fixed
const MIN = 60_000;

// Production VA timing: 5-minute group matches, 10-minute gaps, each round one day apart.
const DURATION_SEC = 300;
const GAP_SEC = 600;
const DAYS_BETWEEN_ROUNDS = 1;
// Round 1 must be > 24h out or VA registration (locks 24h before) would already be closed and the
// user could not join. Schedule it 2 days out → registration open for ~1 day.
const ROUND1_DELAY_MIN = 2 * 24 * 60;

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
  const DUMMIES = 99;
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

  // 3. Create the tournament + rounds + STAGGERED groups (group g starts stride*g after the
  //    round start). Round start times are FIXED here and never recomputed.
  const now = Date.now();
  const strideMs = (DURATION_SEC + GAP_SEC) * 1000;
  const roundSpanMs = (gc: number) => (gc - 1) * strideMs + DURATION_SEC * 1000;
  const DAY_MS = 24 * 60 * MIN;
  const round1Start = now + ROUND1_DELAY_MIN * MIN;
  const roundStarts = ROUNDS.map((_, r) => new Date(round1Start + r * DAYS_BETWEEN_ROUNDS * DAY_MS));
  for (let r = 1; r < ROUNDS.length; r++) {
    const prevEnd = roundStarts[r - 1]!.getTime() + roundSpanMs(ROUNDS[r - 1]!.groupCount);
    if (roundStarts[r]!.getTime() < prevEnd) throw new Error(`Round ${r + 1} would overlap Round ${r}.`);
  }
  const lastCfg = ROUNDS[ROUNDS.length - 1]!;
  const endAt = new Date(roundStarts[ROUNDS.length - 1]!.getTime() + (lastCfg.groupCount - 1) * strideMs + DURATION_SEC * 1000);
  const pool = 1_000_000_000n; // fallback prize table; VA recomputes a dynamic 2× pool at payout
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
      const m = await prisma.match.create({ data: { tournamentId: t.id, roundId: round.id, index: g, startAt: new Date(round.startAt.getTime() + g * strideMs) } });
      if (r === 0) round1Matches.push(m.id);
    }
  }
  console.log(`Created "${NAME}" ${t.id}  (brand ${BRAND}, entry $10)`);
  roundStarts.forEach((d, i) => console.log(`  Round ${i + 1} starts ${d.toLocaleString()}`));
  console.log(`  Registration closes ${new Date(round1Start - DAY_MS).toLocaleString()} (24h before Round 1)`);

  // 4. Seat 99 dummies so GROUP 1 keeps one open seat and groups 2-10 are full.
  //    Fill groups 2-10 (indices 1..9) fully first, then group 1 (index 0) with 9 — leaving
  //    seat #10 in group 1 open. join() will seat the real user there.
  const per = ROUNDS[0]!.playersPerGroup; // 10
  let idx = 0;
  const seatOne = async (userId: string, g: number, seat: number) => {
    await prisma.$transaction(async (tx) => {
      await tx.tournamentEntry.create({ data: { tournamentId: t.id, userId, credits: STARTING_CREDITS, score: STARTING_CREDITS } });
      await tx.matchPlayer.create({ data: { tournamentId: t.id, matchId: round1Matches[g]!, userId, seat, coins: STARTING_CREDITS, score: STARTING_CREDITS } });
    });
  };
  for (let g = 1; g <= 9; g++) {
    for (let s = 0; s < per; s++) await seatOne(dummies[idx++]!, g, s);
  }
  for (let s = 0; s < per - 1; s++) await seatOne(dummies[idx++]!, 0, s); // group 1: 9 seated, seat #10 open
  console.log(`Seated ${idx} dummies.`);

  // 5. Report the live group fill.
  const round = await prisma.tournamentRound.findFirstOrThrow({
    where: { tournamentId: t.id, index: 1 },
    include: { matches: { orderBy: { index: "asc" }, include: { players: true } } },
  });
  console.log("\nRound 1 group fill:");
  round.matches.forEach((m) => console.log(`  Group ${m.index + 1}: ${m.players.length}/${round.playersPerGroup}${m.players.length < round.playersPerGroup ? "  ← open seat" : ""}`));
  const total = round.matches.reduce((a, m) => a + m.players.length, 0);
  console.log(`\nSeated ${total}/100 · ${100 - total} open slot in Group 1 → register through the UI to take it.`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("SEED ERROR:", e);
  process.exit(1);
});
