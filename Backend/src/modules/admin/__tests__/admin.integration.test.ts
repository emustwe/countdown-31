import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../../../common/testing/create-test-app";
import { PrismaService } from "../../../common/prisma/prisma.service";

describe("Admin (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailPrefix = `admintest-${randomUUID()}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.gameConfig.updateMany({ where: { id: "singleton" }, data: { activeModelId: "aurora-ways-96" } });
    await prisma.user.deleteMany({ where: { email: { startsWith: testEmailPrefix } } });
    await app.close();
  });

  function server() {
    return app.getHttpServer();
  }

  async function registerAndGetToken(suffix: string): Promise<{ accessToken: string; userId: string; email: string }> {
    const email = `${testEmailPrefix}-${suffix}@example.com`;
    const res = await request(server()).post("/auth/register").send({ email, password: "password123" });
    return { accessToken: res.body.accessToken, userId: res.body.user.id, email };
  }

  async function registerAdminAndGetToken(suffix: string): Promise<{ accessToken: string; userId: string; email: string }> {
    const user = await registerAndGetToken(suffix);
    await prisma.user.update({ where: { id: user.userId }, data: { role: "ADMIN" } });
    // JWTs are stateless — the role claim in the token issued at registration is stale
    // until the next login.
    const relogin = await request(server()).post("/auth/login").send({ email: user.email, password: "password123" });
    return { ...user, accessToken: relogin.body.accessToken };
  }

  it("replays a spin byte-for-byte from its stored rngTrace and reports a match", async () => {
    const player = await registerAndGetToken("player");
    const admin = await registerAdminAndGetToken("admin");

    const spinRes = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });

    const spin = await prisma.spin.findFirstOrThrow({
      where: { roundId: spinRes.body.roundId, index: 0 },
    });

    const res = await request(server())
      .post(`/admin/spins/${spin.id}/replay`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(201);
    expect(res.body.match).toBe(true);
    expect(res.body.recomputed.grid).toEqual(res.body.stored.grid);
    expect(res.body.recomputed.totalWin).toBe(res.body.stored.totalWin);
  });

  it("a non-admin cannot call any admin endpoint", async () => {
    const player = await registerAndGetToken("nonadmin");
    const spinRes = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });
    const spin = await prisma.spin.findFirstOrThrow({ where: { roundId: spinRes.body.roundId, index: 0 } });

    const endpoints: Array<[string, string]> = [
      ["GET", "/admin/users"],
      ["GET", "/admin/models"],
      ["GET", "/admin/transactions"],
      ["GET", "/admin/analytics"],
      ["GET", "/admin/audit-log"],
      ["POST", `/admin/spins/${spin.id}/replay`],
    ];
    for (const [method, path] of endpoints) {
      const res = await request(server())
        [method.toLowerCase() as "get" | "post"](path)
        .set("Authorization", `Bearer ${player.accessToken}`);
      expect(res.status).toBe(403);
    }
  });

  it("lists users with their wallet balance, filterable by email search", async () => {
    const admin = await registerAdminAndGetToken("listusers-admin");
    const player = await registerAndGetToken("listusers-target");

    const res = await request(server())
      .get(`/admin/users?search=${encodeURIComponent(player.email)}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(res.body.users[0].email).toBe(player.email);
    expect(typeof res.body.users[0].balance).toBe("string");
  });

  it("bans and unbans a user, and the ban is audited and blocks login", async () => {
    const admin = await registerAdminAndGetToken("ban-admin");
    const target = await registerAndGetToken("ban-target");

    const banRes = await request(server())
      .patch(`/admin/users/${target.userId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "BANNED" });
    expect(banRes.status).toBe(200);
    expect(banRes.body.status).toBe("BANNED");

    const loginWhileBanned = await request(server())
      .post("/auth/login")
      .send({ email: target.email, password: "password123" });
    expect(loginWhileBanned.status).toBe(403);

    const audit = await prisma.auditLog.findFirst({
      where: { targetType: "User", targetId: target.userId, action: "USER_BANNED" },
    });
    expect(audit).not.toBeNull();

    const unbanRes = await request(server())
      .patch(`/admin/users/${target.userId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "ACTIVE" });
    expect(unbanRes.status).toBe(200);
    expect(unbanRes.body.status).toBe("ACTIVE");
  });

  it("adjusts a user's balance via an audited ledger entry, and rejects going negative", async () => {
    const admin = await registerAdminAndGetToken("adjust-admin");
    const target = await registerAndGetToken("adjust-target");

    const before = await prisma.wallet.findUniqueOrThrow({ where: { userId: target.userId } });

    const grant = await request(server())
      .patch(`/admin/users/${target.userId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ balanceAdjustment: { amount: "5000", reason: "compensation for demo bug" } });
    expect(grant.status).toBe(200);
    expect(BigInt(grant.body.balance)).toBe(before.cachedBalance + 5000n);

    const ledgerEntry = await prisma.ledgerEntry.findFirst({
      where: { walletId: before.id, type: "ADJUSTMENT", amount: 5000n },
    });
    expect(ledgerEntry).not.toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { targetType: "User", targetId: target.userId, action: "BALANCE_ADJUSTMENT" },
    });
    expect(audit).not.toBeNull();
    expect((audit?.dataJson as { reason: string }).reason).toBe("compensation for demo bug");

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId: target.userId } });
    const tooMuch = await request(server())
      .patch(`/admin/users/${target.userId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ balanceAdjustment: { amount: `-${wallet.cachedBalance + 1n}`, reason: "would go negative" } });
    expect(tooMuch.status).toBe(400);
  });

  it("lists math models with computed stats and marks the active one", async () => {
    const admin = await registerAdminAndGetToken("models-admin");
    const res = await request(server()).get("/admin/models").set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    const active = res.body.filter((m: { active: boolean }) => m.active);
    expect(active).toHaveLength(1);
    expect(res.body[0].computed).not.toBeNull();
  });

  it("switching the active model is audited and does not affect an in-flight round", async () => {
    const admin = await registerAdminAndGetToken("switch-admin");
    const player = await registerAndGetToken("switch-player");

    const spinBefore = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });
    const roundBefore = await prisma.gameRound.findUniqueOrThrow({ where: { id: spinBefore.body.roundId } });
    expect(roundBefore.modelId).toBe("aurora-ways-96");

    const switchRes = await request(server())
      .patch("/admin/config/active-model")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ modelId: "aurora-ways-92" });
    expect(switchRes.status).toBe(200);
    expect(switchRes.body.activeModelId).toBe("aurora-ways-92");

    // The already-created round keeps the model it was pinned to at creation time.
    const roundAfterSwitch = await prisma.gameRound.findUniqueOrThrow({ where: { id: roundBefore.id } });
    expect(roundAfterSwitch.modelId).toBe("aurora-ways-96");

    const spinAfter = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });
    const roundAfter = await prisma.gameRound.findUniqueOrThrow({ where: { id: spinAfter.body.roundId } });
    expect(roundAfter.modelId).toBe("aurora-ways-92");

    const audit = await prisma.auditLog.findFirst({ where: { action: "ACTIVE_MODEL_CHANGED" } });
    expect(audit).not.toBeNull();

    await request(server())
      .patch("/admin/config/active-model")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ modelId: "aurora-ways-96" });
  });

  it("rejects an unknown model id", async () => {
    const admin = await registerAdminAndGetToken("badmodel-admin");
    const res = await request(server())
      .patch("/admin/config/active-model")
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ modelId: "not-a-real-model" });
    expect(res.status).toBe(400);
  });

  it("lists transactions filterable by user and type", async () => {
    const admin = await registerAdminAndGetToken("tx-admin");
    const player = await registerAndGetToken("tx-player");
    await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({ amount: "500", idempotencyKey: randomUUID() });

    const res = await request(server())
      .get(`/admin/transactions?userId=${player.userId}&type=DEPOSIT`)
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBeGreaterThan(0);
    expect(res.body.entries.every((e: { type: string }) => e.type === "DEPOSIT")).toBe(true);
    expect(res.body.entries.every((e: { userEmail: string }) => e.userEmail === player.email)).toBe(true);
  });

  it("reports analytics (GGR, spins, active users, observed RTP, top wins) over a window", async () => {
    const admin = await registerAdminAndGetToken("analytics-admin");
    const player = await registerAndGetToken("analytics-player");
    await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });

    const res = await request(server())
      .get("/admin/analytics?days=1")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalSpins).toBeGreaterThan(0);
    expect(typeof res.body.ggr).toBe("string");
    expect(typeof res.body.observedRtp).toBe("number");
    expect(Array.isArray(res.body.topWins)).toBe(true);
  });

  it("exposes a read-only audit log of admin actions", async () => {
    const admin = await registerAdminAndGetToken("audit-admin");
    const target = await registerAndGetToken("audit-target");
    await request(server())
      .patch(`/admin/users/${target.userId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ status: "BANNED" });

    const res = await request(server())
      .get("/admin/audit-log?limit=5")
      .set("Authorization", `Bearer ${admin.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.entries.length).toBeGreaterThan(0);
    expect(res.body.entries[0]).toHaveProperty("action");
    expect(res.body.entries[0]).toHaveProperty("actorUserId");
  });
});
