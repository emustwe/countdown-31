import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../../../common/testing/create-test-app";
import { PrismaService } from "../../../common/prisma/prisma.service";

describe("Admin replay (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailPrefix = `admintest-${randomUUID()}`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
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

  it("replays a spin byte-for-byte from its stored rngTrace and reports a match", async () => {
    const player = await registerAndGetToken("player");
    const admin = await registerAndGetToken("admin");
    await prisma.user.update({ where: { id: admin.userId }, data: { role: "ADMIN" } });
    // The access token issued at registration still carries role: PLAYER — JWTs are
    // stateless, so the role claim only updates on the next login.
    const adminEmail = `${testEmailPrefix}-admin@example.com`;
    const relogin = await request(server()).post("/auth/login").send({ email: adminEmail, password: "password123" });
    admin.accessToken = relogin.body.accessToken;

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

  it("a non-admin cannot call the replay endpoint", async () => {
    const player = await registerAndGetToken("nonadmin");
    const spinRes = await request(server())
      .post("/game/spin")
      .set("Authorization", `Bearer ${player.accessToken}`)
      .send({ totalBet: "1000", idempotencyKey: randomUUID() });

    const spin = await prisma.spin.findFirstOrThrow({
      where: { roundId: spinRes.body.roundId, index: 0 },
    });

    const res = await request(server())
      .post(`/admin/spins/${spin.id}/replay`)
      .set("Authorization", `Bearer ${player.accessToken}`);

    expect(res.status).toBe(403);
  });
});
