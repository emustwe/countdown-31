import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createTestApp } from "../../../common/testing/create-test-app";
import type { INestApplication } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

describe("Auth rate limiting (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailPrefix = `throttletest-${randomUUID()}`;

  beforeAll(async () => {
    // register's limit is 20/60s (see auth.controller.ts) — this is the one test that
    // deliberately exceeds it to prove the guard is wired up.
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: testEmailPrefix } } });
    await app.close();
  });

  it("returns 429 after exceeding the register endpoint's rate limit", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await request(app.getHttpServer())
        .post("/auth/register")
        .send({ email: `${testEmailPrefix}-${i}@example.com`, password: "password123" });
      statuses.push(res.status);
    }

    expect(statuses).toContain(429);
  });
});
