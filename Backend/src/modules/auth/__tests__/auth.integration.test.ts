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
      .send({ email, password: "Str0ng!Pw9" });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(email);
    expect(res.body.user.role).toBe("PLAYER");
    expect(typeof res.body.accessToken).toBe("string");
    // The refresh token is delivered ONLY as an httpOnly cookie, never in the response body.
    expect(res.body.refreshToken).toBeUndefined();
    expect(rtCookie(res)).not.toBe("");
  });

  it("rejects registering the same email twice", async () => {
    const email = `${testEmailPrefix}-dup@example.com`;
    await request(server()).post("/auth/register").send({ email, password: "Str0ng!Pw9" });

    const res = await request(server())
      .post("/auth/register")
      .send({ email, password: "Str0ng!Pw9" });

    expect(res.status).toBe(409);
  });

  it("rejects registration payloads with unknown fields", async () => {
    const res = await request(server())
      .post("/auth/register")
      .send({ email: `${testEmailPrefix}-strict@example.com`, password: "Str0ng!Pw9", isAdmin: true });

    expect(res.status).toBe(400);
  });

  it("rejects a short password", async () => {
    const res = await request(server())
      .post("/auth/register")
      .send({ email: `${testEmailPrefix}-shortpw@example.com`, password: "Str0ng!Pw" });

    expect(res.status).toBe(400);
  });

  it("logs in with correct credentials and rejects incorrect ones", async () => {
    const email = `${testEmailPrefix}-login@example.com`;
    await request(server()).post("/auth/register").send({ email, password: "Str0ng!Pw9" });

    const good = await request(server()).post("/auth/login").send({ email, password: "Str0ng!Pw9" });
    expect(good.status).toBe(201);
    expect(typeof good.body.accessToken).toBe("string");

    const bad = await request(server()).post("/auth/login").send({ email, password: "wrong-password" });
    expect(bad.status).toBe(401);
  });

  it("rejects login for a banned account", async () => {
    const email = `${testEmailPrefix}-banned@example.com`;
    await prisma.user.create({
      data: { email, passwordHash: await argon2.hash("Str0ng!Pw9"), status: "BANNED" },
    });

    const res = await request(server()).post("/auth/login").send({ email, password: "Str0ng!Pw9" });
    expect(res.status).toBe(403);
  });

  it("GET /me requires a valid access token", async () => {
    const noToken = await request(server()).get("/auth/me");
    expect(noToken.status).toBe(401);

    const email = `${testEmailPrefix}-me@example.com`;
    const registered = await request(server())
      .post("/auth/register")
      .send({ email, password: "Str0ng!Pw9" });

    const withToken = await request(server())
      .get("/auth/me")
      .set("Authorization", `Bearer ${registered.body.accessToken}`);
    expect(withToken.status).toBe(200);
    expect(withToken.body.email).toBe(email);
  });

  it("refresh (via cookie) rotates the refresh token and the old one can no longer be used", async () => {
    const email = `${testEmailPrefix}-refresh@example.com`;
    const registered = await request(server())
      .post("/auth/register")
      .send({ email, password: "Str0ng!Pw9" });
    const originalCookie = rtCookie(registered);

    const refreshed = await request(server()).post("/auth/refresh").set("Cookie", originalCookie);
    expect(refreshed.status).toBe(201);
    const rotatedCookie = rtCookie(refreshed);
    expect(rotatedCookie).not.toBe("");
    expect(rotatedCookie).not.toBe(originalCookie);

    // Reuse detection: presenting the now-rotated-out cookie again must fail...
    const reused = await request(server()).post("/auth/refresh").set("Cookie", originalCookie);
    expect(reused.status).toBe(401);

    // ...and must have revoked the whole family, including the token issued by the refresh above.
    const afterReuse = await request(server()).post("/auth/refresh").set("Cookie", rotatedCookie);
    expect(afterReuse.status).toBe(401);
  });

  it("logout (via cookie) revokes the refresh token", async () => {
    const email = `${testEmailPrefix}-logout@example.com`;
    const registered = await request(server())
      .post("/auth/register")
      .send({ email, password: "Str0ng!Pw9" });
    const cookie = rtCookie(registered);

    const logoutRes = await request(server()).post("/auth/logout").set("Cookie", cookie);
    expect(logoutRes.status).toBe(204);

    const refreshAfterLogout = await request(server()).post("/auth/refresh").set("Cookie", cookie);
    expect(refreshAfterLogout.status).toBe(401);
  });
});

// Extract the `rt=...` refresh cookie string from a response's Set-Cookie header.
function rtCookie(res: { headers: Record<string, unknown> }): string {
  const cookies = (res.headers["set-cookie"] as string[] | undefined) ?? [];
  const rt = cookies.find((c) => c.startsWith("rt="));
  return rt ? (rt.split(";")[0] ?? "") : "";
}
