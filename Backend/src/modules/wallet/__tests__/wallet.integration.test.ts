import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../../../common/testing/create-test-app";
import { PrismaService } from "../../../common/prisma/prisma.service";

describe("Wallet (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmailPrefix = `wallettest-${randomUUID()}`;

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

  const PW = "Str0ng!Pw9";

  async function registerAndGetToken(suffix: string): Promise<{ accessToken: string; userId: string }> {
    const email = `${testEmailPrefix}-${suffix}@example.com`;
    const res = await request(server()).post("/auth/register").send({ email, password: PW });
    const userId = res.body.user.id as string;
    // Money-moving actions now require a verified email; mark it verified directly for the test.
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
    return { accessToken: res.body.accessToken, userId };
  }

  it("a new wallet starts with the configured demo balance, reconciled with the ledger", async () => {
    const { accessToken } = await registerAndGetToken("fresh");
    const res = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reconciled).toBe(true);
    expect(BigInt(res.body.balance)).toBeGreaterThanOrEqual(0n);
  });

  it("deposit increases the balance and is reflected in the ledger sum", async () => {
    const { accessToken } = await registerAndGetToken("deposit");
    const before = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);
    const beforeBalance = BigInt(before.body.balance);

    const res = await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "5000", idempotencyKey: randomUUID() });

    expect(res.status).toBe(201);
    expect(BigInt(res.body.balance)).toBe(beforeBalance + 5000n);

    const after = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);
    expect(after.body.reconciled).toBe(true);
    expect(BigInt(after.body.balance)).toBe(beforeBalance + 5000n);
  });

  it("the same idempotency key never charges twice and returns the identical response", async () => {
    const { accessToken } = await registerAndGetToken("idempotent");
    const key = randomUUID();

    const first = await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "2500", idempotencyKey: key });

    const second = await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "2500", idempotencyKey: key });

    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);

    const wallet = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);
    // Only ONE deposit's worth of the starting balance + a single 2500 credit — not two.
    expect(BigInt(wallet.body.balance)).toBe(BigInt(first.body.balance));
  });

  it("rejects reusing an idempotency key with a different request body", async () => {
    const { accessToken } = await registerAndGetToken("idempotent-mismatch");
    const key = randomUUID();

    await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "1000", idempotencyKey: key });

    const res = await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "2000", idempotencyKey: key });

    expect(res.status).toBe(409);
  });

  it("withdraw to a Solana address decreases the balance, records the transfer, and validates inputs", async () => {
    const { accessToken } = await registerAndGetToken("withdraw");
    // Fund the wallet first so there is something to withdraw.
    await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "10000", idempotencyKey: randomUUID() });
    const walletRes = await request(server()).get("/wallet").set("Authorization", `Bearer ${accessToken}`);
    const balance = BigInt(walletRes.body.balance);
    const dest = "So11111111111111111111111111111111111111112";

    // Insufficient funds.
    const tooMuch = await request(server())
      .post("/wallet/withdraw")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: (balance + 1000n).toString(), destinationAddress: dest, idempotencyKey: randomUUID(), password: PW });
    expect(tooMuch.status).toBe(400);

    // Invalid destination address.
    const badAddr = await request(server())
      .post("/wallet/withdraw")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "1000", destinationAddress: "not-a-real-address", idempotencyKey: randomUUID(), password: PW });
    expect(badAddr.status).toBe(400);

    // Step-up: a wrong password is rejected even with everything else valid.
    const wrongPw = await request(server())
      .post("/wallet/withdraw")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "1000", destinationAddress: dest, idempotencyKey: randomUUID(), password: "not-the-password" });
    expect(wrongPw.status).toBe(401);

    // Valid withdrawal (correct step-up password).
    const ok = await request(server())
      .post("/wallet/withdraw")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "1000", destinationAddress: dest, idempotencyKey: randomUUID(), password: PW });
    expect(ok.status).toBe(201);
    expect(BigInt(ok.body.balance)).toBe(balance - 1000n);
    expect(ok.body.address).toBe(dest);
    expect(ok.body.txSignature).toBeTruthy();
    expect(ok.body.transferId).toBeTruthy();
  });

  it("a deposit records a COMPLETED CryptoTransfer that surfaces in the transaction history", async () => {
    const { accessToken } = await registerAndGetToken("crypto-deposit");
    const dep = await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ amount: "5000", idempotencyKey: randomUUID() });
    expect(dep.status).toBe(201);
    expect(dep.body.txSignature).toBeTruthy();
    expect(dep.body.address).toBeTruthy();

    const txs = await request(server()).get("/wallet/transactions").set("Authorization", `Bearer ${accessToken}`);
    const depositEntry = txs.body.entries.find((e: { type: string }) => e.type === "DEPOSIT");
    expect(depositEntry.transfer).toBeTruthy();
    expect(depositEntry.transfer.direction).toBe("DEPOSIT");
    expect(depositEntry.transfer.status).toBe("COMPLETED");
  });

  it("ledger sum always equals cachedBalance after concurrent deposits (no lost updates)", async () => {
    const { accessToken, userId } = await registerAndGetToken("concurrent");
    const CONCURRENT_DEPOSITS = 10;
    const AMOUNT = 100n;

    await Promise.all(
      Array.from({ length: CONCURRENT_DEPOSITS }, () =>
        request(server())
          .post("/wallet/deposit")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ amount: AMOUNT.toString(), idempotencyKey: randomUUID() }),
      ),
    );

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const ledgerSum = await prisma.ledgerEntry.aggregate({
      where: { walletId: wallet.id },
      _sum: { amount: true },
    });

    expect(wallet.cachedBalance).toBe(ledgerSum._sum.amount);

    const depositCount = await prisma.ledgerEntry.count({
      where: { walletId: wallet.id, type: "DEPOSIT", refType: "CRYPTO_TRANSFER" },
    });
    expect(depositCount).toBe(CONCURRENT_DEPOSITS);
  });

  it("lists transactions with cursor pagination", async () => {
    const { accessToken } = await registerAndGetToken("history");
    for (let i = 0; i < 3; i++) {
      await request(server())
        .post("/wallet/deposit")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ amount: "100", idempotencyKey: randomUUID() });
    }

    const page1 = await request(server())
      .get("/wallet/transactions?limit=2")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(page1.status).toBe(200);
    expect(page1.body.entries).toHaveLength(2);
    expect(page1.body.nextCursor).not.toBeNull();

    const page2 = await request(server())
      .get(`/wallet/transactions?limit=2&cursor=${page1.body.nextCursor}`)
      .set("Authorization", `Bearer ${accessToken}`);
    expect(page2.status).toBe(200);
    expect(page2.body.entries.length).toBeGreaterThan(0);
    expect(page2.body.entries[0].id).not.toBe(page1.body.entries[0].id);
  });
});
