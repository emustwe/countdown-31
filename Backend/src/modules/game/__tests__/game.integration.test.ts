import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../../../common/testing/create-test-app";
import { PrismaService } from "../../../common/prisma/prisma.service";

describe("Game (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailPrefix = `gametest-${randomUUID()}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    // Pin the active model explicitly rather than relying on whatever the app's own
    // default happens to be — this suite's assertions are specifically about
    // aurora-ways-96's shape (paytable/scatter, no jackpot block).
    await prisma.gameConfig.upsert({
      where: { id: "singleton" },
      update: { activeModelId: "aurora-ways-96" },
      create: { id: "singleton", activeModelId: "aurora-ways-96" },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: testEmailPrefix } } });
    await app.close();
  });

  function server() {
    return app.getHttpServer();
  }

  async function registerAndGetToken(suffix: string): Promise<{ accessToken: string; userId: string }> {
    const email = `${testEmailPrefix}-${suffix}@example.com`;
    const res = await request(server()).post("/auth/register").send({ email, password: "password123" });
    return { accessToken: res.body.accessToken, userId: res.body.user.id };
  }

  it("GET /game/config exposes the paytable/rules but never reel strips or weights", async () => {
    const res = await request(server()).get("/game/config");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("aurora-ways-96");
    expect(res.body.paytable).toBeDefined();
    expect(res.body.freeSpins).toBeDefined();
    expect(res.body.reelStrips).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain("reelStrips");
  });

  it("POST /game/spin requires authentication", async () => {
    const res = await request(server())
      .post("/game/spin")
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });
    expect(res.status).toBe(401);
  });

  it("rejects a spin with insufficient funds", async () => {
    const { accessToken } = await registerAndGetToken("insufficient");
    const wallet = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);
    const balance = BigInt(wallet.body.balance);

    const res = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ totalBet: (balance + 1_000_000n).toString(), idempotencyKey: randomUUID() });

    expect(res.status).toBe(400);
  });

  it("rejects a bet below MIN_BET or above MAX_BET", async () => {
    const { accessToken } = await registerAndGetToken("betlimits");

    const tooLow = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ totalBet: "0", idempotencyKey: randomUUID() });
    expect(tooLow.status).toBe(400);

    const tooHigh = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ totalBet: "999999999999", idempotencyKey: randomUUID() });
    expect(tooHigh.status).toBe(400);
  });

  it("a spin debits the stake, resolves an outcome, and settles the balance atomically", async () => {
    const { accessToken } = await registerAndGetToken("basicspin");
    const before = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);
    const balanceBefore = BigInt(before.body.balance);

    const res = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });

    expect(res.status).toBe(201);
    expect(res.body.roundId).toBeDefined();
    expect(res.body.base.grid).toHaveLength(5);
    expect(res.body.base.rngTrace).toBeUndefined();

    const expectedBalance = balanceBefore - 1000n + BigInt(res.body.totalWin);
    expect(BigInt(res.body.newBalance)).toBe(expectedBalance);

    const after = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);
    expect(after.body.balance).toBe(res.body.newBalance);
    expect(after.body.reconciled).toBe(true);
  });

  it("the same idempotency key never charges twice and returns the same outcome", async () => {
    const { accessToken } = await registerAndGetToken("spinidempotent");
    const key = randomUUID();

    const first = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: key });

    const second = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: key });

    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    const wallet = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);
    expect(wallet.body.balance).toBe(first.body.newBalance);
  });

  it("concurrent spins for the same user never lose or duplicate money", async () => {
    const { accessToken, userId } = await registerAndGetToken("concurrentspin");
    const SPIN_COUNT = 8;

    await Promise.all(
      Array.from({ length: SPIN_COUNT }, () =>
        request(server())
          .post("/game/spin")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ totalBet: "1000", idempotencyKey: randomUUID() }),
      ),
    );

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const ledgerSum = await prisma.ledgerEntry.aggregate({
      where: { walletId: wallet.id },
      _sum: { amount: true },
    });
    expect(wallet.cachedBalance).toBe(ledgerSum._sum.amount);

    const stakeCount = await prisma.ledgerEntry.count({
      where: { walletId: wallet.id, type: "BET_STAKE" },
    });
    expect(stakeCount).toBe(SPIN_COUNT);

    const roundCount = await prisma.gameRound.count({ where: { userId } });
    expect(roundCount).toBe(SPIN_COUNT);
  });

  it("a free-spins round can be revealed one step at a time via the reveal cursor, then completes", async () => {
    const { accessToken } = await registerAndGetToken("freespins");

    let featureRoundId: string | undefined;
    let expectedFreeSpins = 0;
    for (let i = 0; i < 150 && !featureRoundId; i++) {
      const res = await request(server())
        .post("/game/spin")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ totalBet: "1000", idempotencyKey: randomUUID() });
      if (res.body.state === "FEATURE") {
        featureRoundId = res.body.roundId;
        expectedFreeSpins = res.body.freeSpinsRemaining;
      }
    }

    expect(featureRoundId).toBeDefined();
    expect(expectedFreeSpins).toBeGreaterThan(0);

    let remaining = expectedFreeSpins;
    let lastState = "FEATURE";
    let revealedIndexes: number[] = [];
    while (remaining > 0) {
      const res = await request(server())
        .post("/game/free-spin")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ roundId: featureRoundId });
      expect(res.status).toBe(201);
      revealedIndexes.push(res.body.index);
      remaining = res.body.freeSpinsRemaining;
      lastState = res.body.state;
    }

    expect(lastState).toBe("COMPLETE");
    expect(revealedIndexes).toEqual(
      Array.from({ length: expectedFreeSpins }, (_, i) => i + 1),
    );

    const overReveal = await request(server())
      .post("/game/free-spin")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ roundId: featureRoundId });
    expect(overReveal.status).toBe(400);

    const round = await request(server())
      .get(`/game/rounds/${featureRoundId}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(round.body.state).toBe("COMPLETE");
    expect(round.body.spins.length).toBe(expectedFreeSpins + 1);
  });

  it("GET /game/rounds/:id refuses to return another user's round", async () => {
    const { accessToken: ownerToken } = await registerAndGetToken("owner");
    const { accessToken: otherToken } = await registerAndGetToken("other");

    const spinRes = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });

    const asOwner = await request(server())
      .get(`/game/rounds/${spinRes.body.roundId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(asOwner.status).toBe(200);

    const asOther = await request(server())
      .get(`/game/rounds/${spinRes.body.roundId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(asOther.status).toBe(404);
  });

  it("GET /game/rounds lists only the caller's own rounds, newest first", async () => {
    const { accessToken } = await registerAndGetToken("history");
    const { accessToken: otherToken } = await registerAndGetToken("historyother");

    for (let i = 0; i < 3; i++) {
      await request(server())
        .post("/game/spin")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ totalBet: "1000", idempotencyKey: randomUUID() });
    }
    await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${otherToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });

    const res = await request(server())
      .get("/game/rounds?limit=2")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.rounds).toHaveLength(2);
    expect(res.body.nextCursor).not.toBeNull();

    const createdTimes = res.body.rounds.map((r: { createdAt: string }) => new Date(r.createdAt).getTime());
    expect(createdTimes[0]).toBeGreaterThanOrEqual(createdTimes[1]);
  });
});
