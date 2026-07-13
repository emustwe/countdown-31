import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import * as argon2 from "argon2";
import { createTestApp } from "../../../common/testing/create-test-app";
import { PrismaService } from "../../../common/prisma/prisma.service";

describe("Auth (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailPrefix = `inttest-${randomUUID()}`;

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

  it("registers a new user and returns a token pair", async () => {
    const email = `${testEmailPrefix}-register@example.com`;
    const res = await request(server())
      .post("/auth/register")
      .send({ email, password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe("PLAYER");
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
  });

  it("rejects registering the same email twice", async () => {
    const email = `${testEmailPrefix}-dup@example.com`;
    await request(server()).post("/auth/register").send({ email, password: "password123" });

    const res = await request(server())
      .post("/auth/register")
      .send({ email, password: "password123" });

    expect(res.status).toBe(409);
  });

  it("rejects registration payloads with unknown fields", async () => {
    const res = await request(server())
      .post("/auth/register")
      .send({ email: `${testEmailPrefix}-strict@example.com`, password: "password123", isAdmin: true });

    expect(res.status).toBe(400);
  });

  it("rejects a short password", async () => {
    const res = await request(server())
      .post("/auth/register")
      .send({ email: `${testEmailPrefix}-shortpw@example.com`, password: "short" });

    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials and rejects incorrect ones", async () => {
    const email = `${testEmailPrefix}-login@example.com`;
    await request(server()).post("/auth/register").send({ email, password: "password123" });

    const good = await request(server()).post("/auth/login").send({ email, password: "password123" });
    expect(good.status).toBe(201);
    expect(typeof good.body.accessToken).toBe("string");

    const bad = await request(server()).post("/auth/login").send({ email, password: "wrong-password" });
    expect(bad.status).toBe(401);
  });

  it("rejects login for a banned account", async () => {
    const email = `${testEmailPrefix}-banned@example.com`;
    await prisma.user.create({
      data: { email, passwordHash: await argon2.hash("password123"), status: "BANNED" },
    });

    const res = await request(server()).post("/auth/login").send({ email, password: "password123" });
    expect(res.status).toBe(403);
  });

  it("GET /me requires a valid access token", async () => {
    const noToken = await request(server()).get("/auth/me");
    expect(noToken.status).toBe(401);

    const email = `${testEmailPrefix}-me@example.com`;
    const registered = await request(server())
      .post("/auth/register")
      .send({ email, password: "password123" });

    const withToken = await request(server())
      .get("/auth/me")
      .set("Authorization", `Bearer ${registered.body.accessToken}`);
    expect(withToken.status).toBe(200);
    expect(withToken.body.email).toBe(email);
  });

  it("refresh rotates the refresh token and the old one can no longer be used", async () => {
    const email = `${testEmailPrefix}-refresh@example.com`;
    const registered = await request(server())
      .post("/auth/register")
      .send({ email, password: "password123" });
    const originalRefreshToken = registered.body.refreshToken;

    const refreshed = await request(server())
      .post("/auth/refresh")
      .send({ refreshToken: originalRefreshToken });
    expect(refreshed.status).toBe(201);
    expect(refreshed.body.refreshToken).not.toBe(originalRefreshToken);

    // Reuse detection: presenting the now-rotated-out token again must fail...
    const reused = await request(server())
      .post("/auth/refresh")
      .send({ refreshToken: originalRefreshToken });
    expect(reused.status).toBe(401);

    // ...and must have revoked the whole family, including the token issued by the refresh above.
    const afterReuse = await request(server())
      .post("/auth/refresh")
      .send({ refreshToken: refreshed.body.refreshToken });
    expect(afterReuse.status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const email = `${testEmailPrefix}-logout@example.com`;
    const registered = await request(server())
      .post("/auth/register")
      .send({ email, password: "password123" });
    const refreshToken = registered.body.refreshToken;

    const logoutRes = await request(server()).post("/auth/logout").send({ refreshToken });
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(server()).post("/auth/refresh").send({ refreshToken });
    expect(refreshAfterLogout.status).toBe(401);
  });
});
