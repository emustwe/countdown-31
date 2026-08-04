import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../../../common/testing/create-test-app";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { TournamentsService } from "../tournaments.service";

// Exercises the automatic-engine building blocks directly (no timers): round-robin
// auto-grouping, settle ranking with tie-break by TOURNAMENT ENTRY time, and automatic
// re-buy (pay → reinstate → APPROVED record → placed next round).
describe("Tournament engine (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let svc: TournamentsService;
  const prefix = `enginetest-${randomUUID()}`;
  let tournamentId: string;
  const players: { id: string; email: string }[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    svc = app.get(TournamentsService);

    // 6 players, registered in a known order (entry time = registration order).
    for (let i = 0; i < 6; i++) {
      const email = `${prefix}-p${i}@example.com`;
      const res = await prisma.user.create({ data: { email, passwordHash: "x", role: "PLAYER", wallet: { create: { cachedBalance: 0n } } } });
      players.push({ id: res.id, email });
      await new Promise((r) => setTimeout(r, 5)); // stagger joinedAt below
    }

    // A 3-round group tournament: R1 = 2 groups × 3, top 1 advances; R2 (semi) 1 group; R3 final.
    const t = await prisma.tournament.create({
      data: {
        name: `${prefix}-cup`, modelId: "aurora-ways-tournament", format: "WEEKLY", state: "SCHEDULED",
        entryFee: 0n, startingCredits: 5_000_000n, startAt: new Date(), endAt: new Date(Date.now() + 3_600_000),
        capacity: 6, roundsCount: 3, matchDurationSec: 300, roundGapSec: 600, prizeJson: [], createdBy: "test",
      },
    });
    tournamentId = t.id;
    const roundCfg = [
      { index: 1, groups: 2, per: 3, adv: 1 },
      { index: 2, groups: 1, per: 2, adv: 2 }, // 2 advancers exactly fill it → a re-buy overflows it
      { index: 3, groups: 1, per: 10, adv: 10 },
    ];
    for (const rc of roundCfg) {
      // Round 1 is open now; later rounds are in the future so the re-buy window stays open.
      const startAt = new Date(Date.now() + (rc.index - 1) * 3_600_000);
      const round = await prisma.tournamentRound.create({
        data: { tournamentId: t.id, index: rc.index, startAt, groupCount: rc.groups, playersPerGroup: rc.per, advancePerGroup: rc.adv },
      });
      for (let g = 0; g < rc.groups; g++) {
        await prisma.match.create({ data: { tournamentId: t.id, roundId: round.id, index: g, startAt } });
      }
    }
    // Register the 6 players in order, with strictly increasing joinedAt.
    for (let i = 0; i < players.length; i++) {
      await prisma.tournamentEntry.create({
        data: { tournamentId: t.id, userId: players[i]!.id, credits: 5_000_000n, score: 5_000_000n, joinedAt: new Date(Date.now() + i * 1000) },
      });
    }
  });

  afterAll(async () => {
    await prisma.tournament.deleteMany({ where: { id: tournamentId } });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  it("auto-groups the pool round-robin into the round's groups", async () => {
    const { grouped } = await svc.autoAssignGroups(tournamentId, 1);
    expect(grouped).toBe(6);
    const round = await prisma.tournamentRound.findFirstOrThrow({ where: { tournamentId, index: 1 }, include: { matches: { include: { players: true } } } });
    // 6 players, 2 groups, round-robin → 3 each.
    expect(round.matches.map((m) => m.players.length).sort()).toEqual([3, 3]);
    // Idempotent: a second call doesn't duplicate.
    expect((await svc.autoAssignGroups(tournamentId, 1)).grouped).toBe(0);
  });

  it("settles by score then TOURNAMENT ENTRY time — with equal (unplayed) scores the earliest entrant advances", async () => {
    // All scores are equal (nobody spun), so the tie-break is entry time.
    await svc.settleRound("system", tournamentId, 1);
    const advanced = await prisma.tournamentEntry.findMany({ where: { tournamentId, currentRound: 2, eliminated: false } });
    // Sequential fill: group 1 = first 3 entrants (p0,p1,p2), group 2 = next 3 (p3,p4,p5).
    // advancePerGroup 1 → the earliest entrant of each group advances → p0 and p3.
    expect(advanced).toHaveLength(2);
    const advancedIds = new Set(advanced.map((e) => e.userId));
    expect(advancedIds.has(players[0]!.id)).toBe(true);
    expect(advancedIds.has(players[3]!.id)).toBe(true);
  });

  it("auto re-buy reinstates an eliminated player for the next round and records placement order", async () => {
    const eliminated = await prisma.tournamentEntry.findFirst({ where: { tournamentId, eliminated: true } });
    expect(eliminated).toBeTruthy();
    const res = await svc.rebuy(eliminated!.userId, tournamentId);
    expect(res.rebought).toBe(true);
    expect(res.round).toBe(2);
    const entry = await prisma.tournamentEntry.findUniqueOrThrow({ where: { tournamentId_userId: { tournamentId, userId: eliminated!.userId } } });
    expect(entry.eliminated).toBe(false);
    expect(entry.currentRound).toBe(2);
    expect(entry.rebuysUsed).toBe(1);
    const req = await prisma.rebuyRequest.findFirst({ where: { tournamentId, userId: eliminated!.userId, round: 2 } });
    expect(req?.status).toBe("APPROVED");
  });

  it("auto-groups round 2 seating the re-bought player even though the group is already full", async () => {
    const { grouped } = await svc.autoAssignGroups(tournamentId, 2);
    expect(grouped).toBe(3); // 2 advancers + 1 re-buy
    const round = await prisma.tournamentRound.findFirstOrThrow({ where: { tournamentId, index: 2 }, include: { matches: { include: { players: true } } } });
    // playersPerGroup is 2, but the re-buy is an extra competitor → the group holds 3 (no cap).
    expect(round.playersPerGroup).toBe(2);
    expect(round.matches[0]!.players).toHaveLength(3);
  });

  it("staggers groups within a round and settles each group independently when its own window ends", async () => {
    const p = `stagger-${randomUUID()}`;
    // 2 groups × 2, top 1 advances; match 120s, gap 60s → stride 180s between group starts.
    const t = await prisma.tournament.create({
      data: {
        name: `${p}-cup`, modelId: "aurora-ways-tournament", format: "WEEKLY", state: "SCHEDULED",
        entryFee: 0n, startingCredits: 5_000_000n, startAt: new Date(), endAt: new Date(Date.now() + 3_600_000),
        capacity: 4, roundsCount: 2, matchDurationSec: 120, roundGapSec: 60, prizeJson: [], createdBy: "test",
      },
    });
    const strideMs = (120 + 60) * 1000;
    // Group 0 started 200s ago → its 120s window has ended. Group 1 starts one stride later
    // (200s - 180s = 20s ago) → its 120s window is still open. So only group 0 should settle.
    const base = Date.now() - 200_000;
    const round1 = await prisma.tournamentRound.create({ data: { tournamentId: t.id, index: 1, startAt: new Date(base), groupCount: 2, playersPerGroup: 2, advancePerGroup: 1 } });
    const g0 = await prisma.match.create({ data: { tournamentId: t.id, roundId: round1.id, index: 0, startAt: new Date(base) } });
    const g1 = await prisma.match.create({ data: { tournamentId: t.id, roundId: round1.id, index: 1, startAt: new Date(base + strideMs) } });
    const round2 = await prisma.tournamentRound.create({ data: { tournamentId: t.id, index: 2, startAt: new Date(Date.now() + 3_600_000), groupCount: 1, playersPerGroup: 10, advancePerGroup: 10 } });
    await prisma.match.create({ data: { tournamentId: t.id, roundId: round2.id, index: 0, startAt: round2.startAt } });

    const users: string[] = [];
    for (let i = 0; i < 4; i++) {
      const u = await prisma.user.create({ data: { email: `${p}-${i}@e.com`, passwordHash: "x", role: "PLAYER", wallet: { create: { cachedBalance: 0n } } } });
      users.push(u.id);
      await prisma.tournamentEntry.create({ data: { tournamentId: t.id, userId: u.id, credits: 5_000_000n, score: 5_000_000n, currentRound: 1, joinedAt: new Date(Date.now() + i * 1000) } });
    }
    // Seat 2 per group.
    await prisma.matchPlayer.createMany({ data: [
      { tournamentId: t.id, matchId: g0.id, userId: users[0]!, seat: 0, coins: 5_000_000n, score: 5_000_000n },
      { tournamentId: t.id, matchId: g0.id, userId: users[1]!, seat: 1, coins: 5_000_000n, score: 5_000_000n },
      { tournamentId: t.id, matchId: g1.id, userId: users[2]!, seat: 0, coins: 5_000_000n, score: 5_000_000n },
      { tournamentId: t.id, matchId: g1.id, userId: users[3]!, seat: 1, coins: 5_000_000n, score: 5_000_000n },
    ] });

    // Group 0's window has ended; group 1's hasn't. Settle only the ended group.
    await svc.settleGroupMatch(t.id, 1, g0.id);
    const after0 = await prisma.tournamentRound.findFirstOrThrow({ where: { tournamentId: t.id, index: 1 }, include: { matches: { orderBy: { index: "asc" } } } });
    expect(after0.matches[0]!.state).toBe("DONE"); // group 0 settled
    expect(after0.matches[1]!.state).toBe("PENDING"); // group 1 still waiting its turn
    expect(after0.settledAt).toBeNull(); // round not finalized until every group is done

    // Group 0's earliest entrant (users[0]) advanced; users[1] eliminated.
    const e0 = await prisma.tournamentEntry.findUniqueOrThrow({ where: { tournamentId_userId: { tournamentId: t.id, userId: users[0]! } } });
    expect(e0.currentRound).toBe(2);
    const e1 = await prisma.tournamentEntry.findUniqueOrThrow({ where: { tournamentId_userId: { tournamentId: t.id, userId: users[1]! } } });
    expect(e1.eliminated).toBe(true);

    // Now settle group 1 and finalize — the round locks only once all groups are done.
    await svc.settleGroupMatch(t.id, 1, g1.id);
    await svc.finalizeGroupRoundIfComplete("system", t.id, 1);
    const done = await prisma.tournamentRound.findFirstOrThrow({ where: { tournamentId: t.id, index: 1 } });
    expect(done.settledAt).not.toBeNull();

    await prisma.tournament.deleteMany({ where: { id: t.id } });
    await prisma.user.deleteMany({ where: { email: { startsWith: p } } });
  });

  it("admin group assignment rejects overfilling a group with a 'full' message, but allows placing within capacity", async () => {
    const p = `cap-${randomUUID()}`;
    const t = await prisma.tournament.create({
      data: {
        name: `${p}-cup`, modelId: "aurora-ways-tournament", format: "WEEKLY", state: "SCHEDULED",
        entryFee: 0n, startingCredits: 5_000_000n, startAt: new Date(Date.now() + 3_600_000), endAt: new Date(Date.now() + 7_200_000),
        capacity: 4, roundsCount: 1, matchDurationSec: 300, roundGapSec: 600, prizeJson: [], createdBy: "test",
      },
    });
    const round = await prisma.tournamentRound.create({ data: { tournamentId: t.id, index: 1, startAt: new Date(Date.now() + 3_600_000), groupCount: 1, playersPerGroup: 2, advancePerGroup: 1 } });
    await prisma.match.create({ data: { tournamentId: t.id, roundId: round.id, index: 0, startAt: round.startAt } });
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const u = await prisma.user.create({ data: { email: `${p}-${i}@e.com`, passwordHash: "x", role: "PLAYER", wallet: { create: { cachedBalance: 0n } } } });
      ids.push(u.id);
      await prisma.tournamentEntry.create({ data: { tournamentId: t.id, userId: u.id, credits: 5_000_000n, score: 5_000_000n, currentRound: 1 } });
    }

    // Group holds 2 — placing 3 is rejected with a clear "full" message.
    await expect(svc.assignGroups("admin", t.id, 1, [{ matchIndex: 0, userIds: ids }])).rejects.toThrow(/full \(max 2/);
    // Placing within capacity succeeds.
    await expect(svc.assignGroups("admin", t.id, 1, [{ matchIndex: 0, userIds: ids.slice(0, 2) }])).resolves.toBeTruthy();

    await prisma.tournament.deleteMany({ where: { id: t.id } });
    await prisma.user.deleteMany({ where: { email: { startsWith: p } } });
  });

  it("VA tournaments lock registration a full day before Round 1", async () => {
    const p = `valock-${randomUUID()}`;
    const mk = async (startInMs: number) => {
      const t = await prisma.tournament.create({
        data: {
          name: `${p}-${startInMs}`, modelId: "aurora-ways-tournament", format: "WEEKLY", brand: "VA", state: "SCHEDULED",
          entryFee: 0n, startingCredits: 5_000_000n, startAt: new Date(Date.now() + startInMs), endAt: new Date(Date.now() + startInMs + 3_600_000),
          capacity: 10, roundsCount: 1, matchDurationSec: 300, roundGapSec: 600, prizeJson: [], createdBy: "test",
        },
      });
      const r = await prisma.tournamentRound.create({ data: { tournamentId: t.id, index: 1, startAt: new Date(Date.now() + startInMs), groupCount: 1, playersPerGroup: 10, advancePerGroup: 5 } });
      await prisma.match.create({ data: { tournamentId: t.id, roundId: r.id, index: 0, startAt: r.startAt } });
      return t.id;
    };
    const u = await prisma.user.create({ data: { email: `${p}@e.com`, passwordHash: "x", role: "PLAYER", wallet: { create: { cachedBalance: 0n } } } });

    // Round 1 in 12h → inside the 1-day lock window → registration rejected.
    const soon = await mk(12 * 3_600_000);
    await expect(svc.join(u.id, soon)).rejects.toThrow(/Registration is closed/i);
    // Round 1 in 48h → outside the lock window → registration allowed.
    const later = await mk(48 * 3_600_000);
    await expect(svc.join(u.id, later)).resolves.toBeTruthy();

    await prisma.tournament.deleteMany({ where: { name: { startsWith: p } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: p } } });
  });

  it("seats players into groups live at registration, filling group 1 before group 2", async () => {
    // A fresh open group tournament; joining should seat each player one-by-one (sequential).
    const p = `seat-${randomUUID()}`;
    const users: string[] = [];
    for (let i = 0; i < 4; i++) {
      const u = await prisma.user.create({ data: { email: `${p}-${i}@e.com`, passwordHash: "x", role: "PLAYER", wallet: { create: { cachedBalance: 0n } } } });
      users.push(u.id);
    }
    const t = await prisma.tournament.create({
      data: {
        name: `${p}-cup`, modelId: "aurora-ways-tournament", format: "WEEKLY", state: "SCHEDULED",
        entryFee: 0n, startingCredits: 5_000_000n, startAt: new Date(Date.now() + 3_600_000), endAt: new Date(Date.now() + 7_200_000),
        capacity: 6, roundsCount: 1, matchDurationSec: 300, roundGapSec: 600, prizeJson: [], createdBy: "test",
      },
    });
    const round = await prisma.tournamentRound.create({ data: { tournamentId: t.id, index: 1, startAt: new Date(Date.now() + 3_600_000), groupCount: 2, playersPerGroup: 2, advancePerGroup: 1 } });
    for (let g = 0; g < 2; g++) await prisma.match.create({ data: { tournamentId: t.id, roundId: round.id, index: g, startAt: round.startAt } });

    for (const u of users) await svc.join(u, t.id);

    const seated = await prisma.tournamentRound.findFirstOrThrow({ where: { tournamentId: t.id, index: 1 }, include: { matches: { orderBy: { index: "asc" }, include: { players: true } } } });
    // 4 players, 2 groups of 2 → group 1 fills first (players 0,1), then group 2 (players 2,3).
    expect(seated.matches[0]!.players.map((pl) => pl.userId).sort()).toEqual([users[0], users[1]].sort());
    expect(seated.matches[1]!.players.map((pl) => pl.userId).sort()).toEqual([users[2], users[3]].sort());

    await prisma.tournament.deleteMany({ where: { id: t.id } });
    await prisma.user.deleteMany({ where: { email: { startsWith: p } } });
  });
});
