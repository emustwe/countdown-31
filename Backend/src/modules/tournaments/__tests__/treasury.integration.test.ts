import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../../../common/testing/create-test-app";
import { PrismaService } from "../../../common/prisma/prisma.service";

// Verifies the treasury double-entry: a tournament entry fee is DEBITED from the player and
// CREDITED to the treasury (not destroyed), and both wallets stay reconciled with their
// ledgers. This is the core money-integrity property of the fee-collection flow.
describe("Treasury double-entry (integration)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const prefix = `treasurytest-${randomUUID()}`;
  const treasuryEmail = process.env.TREASURY_USER_EMAIL ?? "treasury@wm.system";
  const ENTRY_FEE = 25_000_000n; // 25 USDT
  const createdTournamentIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Delete the test tournaments + users (player-side ledger legs cascade with the user).
    // We deliberately leave the treasury-side fee legs in place: deleting them would break
    // the treasury's balance⇄ledger reconciliation. The collected test fee simply stays as
    // part of the treasury float (harmless, and keeps the invariant intact).
    await prisma.tournament.deleteMany({ where: { id: { in: createdTournamentIds } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await app.close();
  });

  function server() {
    return app.getHttpServer();
  }

  async function reconcile(walletId: string): Promise<boolean> {
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    const sum = await prisma.ledgerEntry.aggregate({ where: { walletId }, _sum: { amount: true } });
    return (sum._sum.amount ?? 0n) === wallet.cachedBalance;
  }

  it("routes a tournament entry fee from the player to the treasury, both reconciled", async () => {
    // A SCHEDULED leaderboard tournament with a USDT entry fee.
    const tournament = await prisma.tournament.create({
      data: {
        name: `${prefix}-cup`,
        modelId: "aurora-ways-tournament",
        format: "LEADERBOARD",
        state: "SCHEDULED",
        entryFee: ENTRY_FEE,
        startingCredits: 5_000_000n,
        startAt: new Date(Date.now() + 3_600_000),
        endAt: new Date(Date.now() + 7_200_000),
        prizeJson: [],
        createdBy: "test",
      },
    });
    createdTournamentIds.push(tournament.id);

    // A funded player.
    const reg = await request(server()).post("/auth/register").send({ email: `${prefix}-p@example.com`, password: "password123" });
    const token = reg.body.accessToken;
    const userId = reg.body.user.id;
    await request(server())
      .post("/wallet/deposit")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: "100000000", idempotencyKey: randomUUID() }); // 100 USDT

    const playerWallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
    const treasury = await prisma.user.findUniqueOrThrow({ where: { email: treasuryEmail }, select: { wallet: true } });
    const treasuryWalletId = treasury.wallet!.id;
    const playerBefore = playerWallet.cachedBalance;
    const treasuryBefore = treasury.wallet!.cachedBalance;

    // Join → pays the entry fee.
    const join = await request(server()).post(`/tournaments/${tournament.id}/join`).set("Authorization", `Bearer ${token}`);
    expect(join.status).toBe(201);

    const playerAfter = (await prisma.wallet.findUniqueOrThrow({ where: { userId } })).cachedBalance;
    const treasuryAfter = (await prisma.wallet.findUniqueOrThrow({ where: { id: treasuryWalletId } })).cachedBalance;

    // Player debited exactly the fee; treasury credited exactly the fee (conserved, not minted).
    expect(playerBefore - playerAfter).toBe(ENTRY_FEE);
    expect(treasuryAfter - treasuryBefore).toBe(ENTRY_FEE);

    // Both wallets remain reconciled with their ledgers.
    expect(await reconcile(playerWallet.id)).toBe(true);
    expect(await reconcile(treasuryWalletId)).toBe(true);
  });
});
