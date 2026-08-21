import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import * as argon2 from "argon2";
import { createTestApp } from "../../../common/testing/create-test-app";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { totpCode } from "../../../common/crypto/totp";

describe("Security hardening (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const prefix = `sec-${randomUUID()}`;
  const PW = "Str0ng!Pw9";
  const server = () => app.getHttpServer();
  const reg = (suffix: string, password = PW) =>
    request(server()).post("/auth/register").send({ email: `${prefix}-${suffix}@example.com`, password });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  it("enforces the password policy at registration (#16)", async () => {
    expect((await reg("weak", "password123")).status).toBe(400);
    expect((await reg("strong")).status).toBe(201);
  });

  it("refuses login for a system (treasury-like) account (#2)", async () => {
    const email = `${prefix}-system@example.com`;
    await prisma.user.create({ data: { email, passwordHash: await argon2.hash(PW), isSystem: true } });
    const res = await request(server()).post("/auth/login").send({ email, password: PW });
    expect(res.status).toBe(401); // generic invalid-credentials, existence not confirmable
  });

  it("logout-all immediately revokes outstanding access tokens (#13)", async () => {
    const r = await reg("revoke");
    const token = r.body.accessToken as string;
    expect((await request(server()).get("/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(200);
    await request(server()).post("/auth/logout-all").set("Authorization", `Bearer ${token}`);
    expect((await request(server()).get("/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });

  it("blocks withdrawals until the email is verified (#9)", async () => {
    const r = await reg("unverified");
    const token = r.body.accessToken as string;
    const res = await request(server())
      .post("/wallet/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: "1000", destinationAddress: "So11111111111111111111111111111111111111112", idempotencyKey: randomUUID(), password: PW });
    expect(res.status).toBe(403); // email not verified
  });

  it("enrolls TOTP and then requires the code at login (#8)", async () => {
    const r = await reg("mfa");
    const token = r.body.accessToken as string;
    const begin = await request(server()).post("/auth/mfa/begin").set("Authorization", `Bearer ${token}`);
    expect(begin.status).toBe(201);
    const secret = begin.body.secret as string;
    const confirm = await request(server()).post("/auth/mfa/confirm").set("Authorization", `Bearer ${token}`).send({ code: totpCode(secret) });
    expect(confirm.status).toBe(201);
    expect(Array.isArray(confirm.body.recoveryCodes)).toBe(true);

    const email = `${prefix}-mfa@example.com`;
    // Login without a code is refused with the MFA_REQUIRED signal...
    const noCode = await request(server()).post("/auth/login").send({ email, password: PW });
    expect(noCode.status).toBe(401);
    expect(String(noCode.body.message)).toContain("MFA_REQUIRED");
    // ...and succeeds once the current TOTP code is supplied.
    const withCode = await request(server()).post("/auth/login").send({ email, password: PW, mfaCode: totpCode(secret) });
    expect(withCode.status).toBe(201);
    expect(typeof withCode.body.accessToken).toBe("string");
  });

  it("locks an account after repeated failed logins (#6/#7)", async () => {
    const r = await reg("lockout");
    const email = `${prefix}-lockout@example.com`;
    expect(r.status).toBe(201);
    let sawLock = false;
    for (let i = 0; i < 9; i++) {
      const res = await request(server()).post("/auth/login").send({ email, password: "wrong-but-strong-9!" });
      if (res.status === 403) sawLock = true;
    }
    expect(sawLock).toBe(true);
    // Even the correct password is refused while locked.
    const correct = await request(server()).post("/auth/login").send({ email, password: PW });
    expect(correct.status).toBe(403);
  });
});
