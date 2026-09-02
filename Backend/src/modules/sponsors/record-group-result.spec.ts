import { describe, it, expect, vi } from "vitest";
import { SponsorsService } from "./sponsors.service";

// recordGroupResult() is the group-advancement brain: it marks a finished group's winner ADVANCED
// (everyone else ELIMINATED) and either seats the winner into the final group, or — if the group WAS
// the final — records the tournament champion. We test the branching against a mocked Prisma.

function makeService(group: { id: string; tournamentId: string; status: string; isFinal: boolean }, finalGroup: { id: string } | null) {
  const calls: [string, unknown][] = [];
  const tx = {
    tournamentGroup: {
      update: vi.fn(async (a: unknown) => { calls.push(["group.update", a]); }),
      findFirst: vi.fn(async () => finalGroup),
    },
    groupMember: {
      updateMany: vi.fn(async (a: unknown) => { calls.push(["member.updateMany", a]); }),
      count: vi.fn(async () => 4),
      upsert: vi.fn(async (a: unknown) => { calls.push(["member.upsert", a]); }),
    },
    sponsorTournament: {
      updateMany: vi.fn(async (a: unknown) => { calls.push(["tournament.updateMany", a]); }),
    },
  };
  const prisma = {
    tournamentGroup: { findUnique: vi.fn(async () => group) },
    $transaction: async (fn: (t: typeof tx) => Promise<void>) => fn(tx),
  };
  const svc = new SponsorsService(prisma as never, {} as never, {} as never, {} as never, {} as never);
  return { svc, calls, tx };
}

describe("recordGroupResult", () => {
  it("stage group: winner advances to the final, others eliminated, no champion yet", async () => {
    const { svc, calls, tx } = makeService(
      { id: "g1", tournamentId: "t1", status: "PLAYING", isFinal: false },
      { id: "final1" },
    );
    await svc.recordGroupResult("g1", "u1", "Alice");

    const groupUpdate = calls.find(([k]) => k === "group.update")![1] as { data: { status: string; winnerUserId: string } };
    expect(groupUpdate.data.status).toBe("DONE");
    expect(groupUpdate.data.winnerUserId).toBe("u1");

    // Winner marked ADVANCED, everyone else ELIMINATED (two updateMany calls).
    const memberUpdates = calls.filter(([k]) => k === "member.updateMany").map(([, a]) => a as { where: Record<string, unknown>; data: { result: string } });
    expect(memberUpdates.some((m) => m.data.result === "ADVANCED")).toBe(true);
    expect(memberUpdates.some((m) => m.data.result === "ELIMINATED")).toBe(true);

    // The winner is seated into the final group.
    const upsert = calls.find(([k]) => k === "member.upsert")![1] as { create: { groupId: string; userId: string } };
    expect(upsert.create.groupId).toBe("final1");
    expect(upsert.create.userId).toBe("u1");

    // No champion recorded from a stage group.
    expect(tx.sponsorTournament.updateMany).not.toHaveBeenCalled();
  });

  it("final group: the winner is recorded as the tournament champion (no further seating)", async () => {
    const { svc, calls, tx } = makeService(
      { id: "final1", tournamentId: "t1", status: "PLAYING", isFinal: true },
      null,
    );
    await svc.recordGroupResult("final1", "u9", "Zoe");

    const champion = calls.find(([k]) => k === "tournament.updateMany")![1] as { data: { winnerName: string; completedAt: Date } };
    expect(champion.data.winnerName).toBe("Zoe");
    expect(champion.data.completedAt).toBeInstanceOf(Date);
    // No seating into a further group.
    expect(tx.groupMember.upsert).not.toHaveBeenCalled();
  });

  it("is idempotent — a DONE group is skipped", async () => {
    const { svc, tx } = makeService(
      { id: "g1", tournamentId: "t1", status: "DONE", isFinal: false },
      { id: "final1" },
    );
    await svc.recordGroupResult("g1", "u1", "Alice");
    expect(tx.tournamentGroup.update).not.toHaveBeenCalled();
    expect(tx.groupMember.upsert).not.toHaveBeenCalled();
  });
});
