import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Prisma, Tournament, TournamentState } from "@prisma/client";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LedgerService } from "../wallet/ledger.service";
import { BalanceGateway } from "../realtime/balance.gateway";
import { AuditLogService } from "../admin/audit-log.service";
import { MATH_MODELS_BY_ID } from "../../engine";
import type { CreateTournamentDto } from "./dto/create-tournament.dto";
import type { UpdateTournamentDto } from "./dto/update-tournament.dto";

type TxClient = Prisma.TransactionClient;

interface Prize {
  rank: number;
  amount: string;
}

interface RoundConfig {
  groupCount: number;
  playersPerGroup: number;
  advancePerGroup: number;
}

// Fixed structures for the two group-tournament kinds. Every match runs 5 minutes; the top
// `advancePerGroup` of each group advance, the rest are eliminated.
const GROUP_TEMPLATES: Record<"WEEKLY" | "MONTHLY", { capacity: number; rounds: RoundConfig[] }> = {
  WEEKLY: {
    capacity: 100,
    rounds: [
      { groupCount: 10, playersPerGroup: 10, advancePerGroup: 5 }, // 100 -> 50
      { groupCount: 10, playersPerGroup: 5, advancePerGroup: 2 }, // 50 -> 20
      { groupCount: 1, playersPerGroup: 20, advancePerGroup: 10 }, // 20 -> top 10 winners
    ],
  },
  MONTHLY: {
    capacity: 500,
    rounds: [
      { groupCount: 10, playersPerGroup: 50, advancePerGroup: 25 }, // 500 -> 250
      { groupCount: 10, playersPerGroup: 25, advancePerGroup: 10 }, // 250 -> 100
      { groupCount: 2, playersPerGroup: 50, advancePerGroup: 25 }, // 100 -> 50
      { groupCount: 1, playersPerGroup: 50, advancePerGroup: 10 }, // 50 -> top 10 winners
    ],
  },
};

// The prize pool is split across the Top 10 by these percentages (sums to 100).
const PRIZE_SPLIT = [30, 20, 15, 10, 5, 4, 4, 4, 4, 4];

// VA tournaments lock registration this long before Round 1 (a full day), and their prize pool
// is DYNAMIC: 2× the total entry fees collected (WM uses the admin-set fixed pool).
const VA_REGISTRATION_LOCK_MS = 24 * 60 * 60 * 1000;
const VA_PRIZE_MULTIPLIER = 2n;
const VA_ENTRY_FEE = 10_000_000n; // VA tournaments cost a fixed $10 (USDT, 6dp) to enter

/** Build the [{rank, amount}] table from a total pool using PRIZE_SPLIT (minor units). */
function prizeTableFromPool(pool: bigint): Prize[] {
  return PRIZE_SPLIT.map((pct, i) => ({ rank: i + 1, amount: ((pool * BigInt(pct)) / 100n).toString() }));
}

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly balanceGateway: BalanceGateway,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService,
  ) {}

  /** When registration closes. WM: when Round 1 starts. VA: a full day earlier. */
  private registrationClosesAt(t: { brand: string; startAt: Date }): Date {
    if (t.brand === "VA") return new Date(t.startAt.getTime() - VA_REGISTRATION_LOCK_MS);
    return t.startAt;
  }

  /** Total entry fees collected for a tournament = fee × (paid entries + approved re-buys). */
  private async totalEntryFeesCollected(tournamentId: string, entryFee: bigint): Promise<bigint> {
    if (entryFee <= 0n) return 0n;
    const [entries, rebuys] = await Promise.all([
      this.prisma.tournamentEntry.count({ where: { tournamentId } }),
      this.prisma.rebuyRequest.count({ where: { tournamentId, status: "APPROVED" } }),
    ]);
    return entryFee * BigInt(entries + rebuys);
  }

  /** The internal treasury wallet: a reserved system user's wallet that collects entry fees
   * and funds prizes. Resolved by the configured email; locked FOR UPDATE by callers that
   * move money into/out of it so concurrent fee/prize movements serialize. */
  private async treasuryWalletId(tx: TxClient): Promise<string> {
    const email = this.config.getOrThrow<string>("TREASURY_USER_EMAIL");
    const user = await tx.user.findUnique({ where: { email }, select: { wallet: { select: { id: true } } } });
    if (!user?.wallet) {
      throw new BadRequestException("Treasury account is not configured. Seed the treasury user before running money movements.");
    }
    return user.wallet.id;
  }

  /** Move `amount` USDT from a player wallet into the treasury (fee collection): debit the
   * player, credit the treasury, in one locked transaction. Returns the player's new balance
   * for the caller to emit. Both legs use the same ledger type with opposite signs. */
  private async collectToTreasury(
    tx: TxClient,
    playerWalletId: string,
    amount: bigint,
    type: "TOURNAMENT_ENTRY",
    tournamentId: string,
  ): Promise<void> {
    if (amount <= 0n) return;
    const treasuryId = await this.treasuryWalletId(tx);
    await tx.$executeRaw`SELECT id FROM "Wallet" WHERE id = ${treasuryId} FOR UPDATE`;
    await this.ledger.appendEntry(tx, { walletId: treasuryId, amount, type, refType: "TOURNAMENT", refId: tournamentId });
    await tx.wallet.update({ where: { id: treasuryId }, data: { cachedBalance: { increment: amount }, version: { increment: 1 } } });
  }

  /** Move `amount` USDT from the treasury out to a player wallet (prize payout or fee
   * refund): debit the treasury, credit the player. Enforces the treasury's non-negative
   * invariant — you cannot pay out funds the treasury does not hold. */
  private async payFromTreasury(
    tx: TxClient,
    playerWalletId: string,
    amount: bigint,
    type: "TOURNAMENT_PRIZE" | "TOURNAMENT_REFUND",
    tournamentId: string,
  ): Promise<void> {
    if (amount <= 0n) return;
    const treasuryId = await this.treasuryWalletId(tx);
    await tx.$executeRaw`SELECT id FROM "Wallet" WHERE id = ${treasuryId} FOR UPDATE`;
    const treasury = await tx.wallet.findUniqueOrThrow({ where: { id: treasuryId } });
    if (treasury.cachedBalance < amount) {
      throw new BadRequestException("Treasury is underfunded for this payout — fund the treasury account before settling.");
    }
    await this.ledger.appendEntry(tx, { walletId: treasuryId, amount: -amount, type, refType: "TOURNAMENT", refId: tournamentId });
    await tx.wallet.update({ where: { id: treasuryId }, data: { cachedBalance: { decrement: amount }, version: { increment: 1 } } });
  }

  // ---- admin ----

  async create(adminId: string, dto: CreateTournamentDto) {
    this.assertKnownModel(dto.modelId);
    if (dto.format === "WEEKLY" || dto.format === "MONTHLY") return this.createGroupTournament(adminId, dto);
    if (dto.format === "BRACKET") return this.createBracket(adminId, dto);

    const created = await this.prisma.tournament.create({
      data: {
        name: dto.name,
        description: dto.description,
        modelId: dto.modelId,
        brand: dto.brand,
        entryFee: BigInt(dto.entryFee),
        startingCredits: BigInt(dto.startingCredits),
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        maxEntries: dto.maxEntries ?? null,
        prizeJson: dto.prizes as unknown as Prisma.InputJsonValue,
        createdBy: adminId,
      },
    });
    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: "TOURNAMENT_CREATED",
      targetType: "Tournament",
      targetId: created.id,
      data: { name: created.name, modelId: created.modelId },
    });
    return this.serialize(created, 0);
  }

  /** Create a BRACKET tournament and generate its full round/match skeleton. Capacity is
   * derived as playersPerMatch ^ roundsCount so the bracket always reduces to one winner.
   * Round r (1-based) has playersPerMatch ^ (roundsCount - r) matches. Round 1's matches are
   * filled by players picking open slots; later rounds' seats are seeded from winners at
   * round settlement. Every match's startAt comes from its round's admin-scheduled time. */
  private async createBracket(adminId: string, dto: CreateTournamentDto) {
    const playersPerMatch = dto.playersPerMatch!;
    const roundsCount = dto.roundsCount!;
    const roundStartAts = dto.roundStartAts!.map((s) => new Date(s));
    const capacity = playersPerMatch ** roundsCount;

    const created = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tournament.create({
        data: {
          name: dto.name,
          description: dto.description,
          modelId: dto.modelId,
          format: "BRACKET",
          brand: dto.brand,
          entryFee: BigInt(dto.entryFee),
          startingCredits: BigInt(dto.startingCredits),
          startAt: roundStartAts[0]!,
          endAt: new Date(dto.endAt),
          maxEntries: capacity,
          capacity,
          roundsCount,
          playersPerMatch,
          prizeJson: dto.prizes as unknown as Prisma.InputJsonValue,
          createdBy: adminId,
        },
      });

      for (let r = 1; r <= roundsCount; r++) {
        const round = await tx.tournamentRound.create({
          data: { tournamentId: t.id, index: r, startAt: roundStartAts[r - 1]! },
        });
        const matchCount = playersPerMatch ** (roundsCount - r);
        for (let m = 0; m < matchCount; m++) {
          await tx.match.create({
            data: { tournamentId: t.id, roundId: round.id, index: m, startAt: round.startAt },
          });
        }
      }
      return t;
    });

    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: "TOURNAMENT_CREATED",
      targetType: "Tournament",
      targetId: created.id,
      data: { name: created.name, modelId: created.modelId, format: "BRACKET", capacity, roundsCount, playersPerMatch },
    });
    return this.serialize(created, 0);
  }

  /** Create a WEEKLY (100-player, 3-round) or MONTHLY (500-player, 4-round) group tournament
   * from its fixed template. Players register into a pool; the admin then distributes them
   * into each round's groups. Empty group matches are created up front; the prize pool is
   * split across the Top 10. Every match runs `matchDurationSec` (5 min). */
  private async createGroupTournament(adminId: string, dto: CreateTournamentDto) {
    const kind = dto.format as "WEEKLY" | "MONTHLY";
    const template = GROUP_TEMPLATES[kind];
    const roundStartAts = dto.roundStartAts!.map((s) => new Date(s));
    const durationSec = 300;
    const gapSec = dto.roundGapSec ?? 600;
    // Groups within a round run SEQUENTIALLY, not all at once: group g starts `stride` after
    // group g-1, where stride = one match (5 min) + the gap (10 min). So a round with G groups
    // spans from its startAt to startAt + (G-1)*stride + matchDuration.
    const strideMs = (durationSec + gapSec) * 1000;
    const matchStartFor = (roundStart: Date, groupIndex: number) => new Date(roundStart.getTime() + groupIndex * strideMs);
    // Round start times are FIXED at creation and never recomputed — reject a schedule where a
    // round would begin before the previous round's last group has finished playing.
    for (let r = 1; r < roundStartAts.length; r++) {
      const prevCfg = template.rounds[r - 1]!;
      const prevLastEnd = matchStartFor(roundStartAts[r - 1]!, prevCfg.groupCount - 1).getTime() + durationSec * 1000;
      if (roundStartAts[r]!.getTime() < prevLastEnd) {
        throw new BadRequestException(
          `Round ${r + 1} starts before Round ${r}'s groups finish. Round ${r} needs about ${Math.ceil(((prevCfg.groupCount - 1) * strideMs + durationSec * 1000) / 60000)} minutes for its ${prevCfg.groupCount} groups.`,
        );
      }
    }
    const lastCfg = template.rounds[template.rounds.length - 1]!;
    const endAt = new Date(matchStartFor(roundStartAts[roundStartAts.length - 1]!, lastCfg.groupCount - 1).getTime() + durationSec * 1000);
    const prizeTable = prizeTableFromPool(BigInt(dto.prizePool!));

    const created = await this.prisma.$transaction(async (tx) => {
      const t = await tx.tournament.create({
        data: {
          name: dto.name,
          description: dto.description,
          modelId: dto.modelId,
          format: kind,
          brand: dto.brand,
          // VA tournaments always cost $10 to enter (fixed); other brands use the admin value.
          entryFee: dto.brand === "VA" ? VA_ENTRY_FEE : BigInt(dto.entryFee),
          startingCredits: BigInt(dto.startingCredits),
          startAt: roundStartAts[0]!,
          endAt,
          maxEntries: template.capacity,
          capacity: template.capacity,
          roundsCount: template.rounds.length,
          matchDurationSec: durationSec,
          roundGapSec: gapSec,
          prizeJson: prizeTable as unknown as Prisma.InputJsonValue,
          createdBy: adminId,
        },
      });

      for (let r = 0; r < template.rounds.length; r++) {
        const cfg = template.rounds[r]!;
        const round = await tx.tournamentRound.create({
          data: {
            tournamentId: t.id,
            index: r + 1,
            startAt: roundStartAts[r]!,
            groupCount: cfg.groupCount,
            playersPerGroup: cfg.playersPerGroup,
            advancePerGroup: cfg.advancePerGroup,
          },
        });
        for (let g = 0; g < cfg.groupCount; g++) {
          await tx.match.create({
            data: { tournamentId: t.id, roundId: round.id, index: g, startAt: matchStartFor(round.startAt, g) },
          });
        }
      }
      return t;
    });

    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: "TOURNAMENT_CREATED",
      targetType: "Tournament",
      targetId: created.id,
      data: { name: created.name, modelId: created.modelId, format: kind, capacity: template.capacity },
    });
    return this.serialize(created, 0);
  }

  async update(adminId: string, id: string, dto: UpdateTournamentDto) {
    const existing = await this.prisma.tournament.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Tournament not found");
    // Editing after players may have joined would be unfair / break paid entries, so lock
    // edits to the pre-start SCHEDULED window.
    if (this.effectiveState(existing) !== "SCHEDULED") {
      throw new BadRequestException("Only scheduled tournaments (not yet started) can be edited");
    }
    if (dto.modelId) this.assertKnownModel(dto.modelId);

    const startAt = dto.startAt ? new Date(dto.startAt) : existing.startAt;
    const endAt = dto.endAt ? new Date(dto.endAt) : existing.endAt;
    if (endAt <= startAt) throw new BadRequestException("endAt must be after startAt");

    const updated = await this.prisma.tournament.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        modelId: dto.modelId,
        entryFee: dto.entryFee !== undefined ? BigInt(dto.entryFee) : undefined,
        startingCredits: dto.startingCredits !== undefined ? BigInt(dto.startingCredits) : undefined,
        startAt: dto.startAt ? startAt : undefined,
        endAt: dto.endAt ? endAt : undefined,
        maxEntries: dto.maxEntries === undefined ? undefined : dto.maxEntries,
        prizeJson: dto.prizes ? (dto.prizes as unknown as Prisma.InputJsonValue) : undefined,
      },
    });
    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: "TOURNAMENT_UPDATED",
      targetType: "Tournament",
      targetId: id,
      data: { fields: Object.keys(dto) },
    });
    const count = await this.prisma.tournamentEntry.count({ where: { tournamentId: id } });
    return this.serialize(updated, count);
  }

  async cancel(adminId: string, id: string) {
    const existing = await this.prisma.tournament.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Tournament not found");
    if (existing.state === "SETTLED" || existing.state === "CANCELLED") {
      throw new BadRequestException(`Tournament is already ${existing.state.toLowerCase()}`);
    }
    const updated = await this.prisma.tournament.update({
      where: { id },
      data: { state: "CANCELLED" },
    });
    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: "TOURNAMENT_CANCELLED",
      targetType: "Tournament",
      targetId: id,
      data: { previousState: existing.state },
    });
    // Refunding entry fees on cancel is handled in the settlement phase; for now the audit
    // trail records the cancellation.
    const count = await this.prisma.tournamentEntry.count({ where: { tournamentId: id } });
    return this.serialize(updated, count);
  }

  async listAdmin(cursor?: string, limit = 20) {
    const rows = await this.prisma.tournament.findMany({
      orderBy: [{ startAt: "desc" }, { id: "desc" }],
      include: { _count: { select: { entries: true } } },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      tournaments: page.map((t) => this.serialize(t, t._count.entries)),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  // ---- player: join & entry ----

  /** Pay the entry fee from the player's wallet and grant the starting tournament coins.
   * One entry per player per tournament (DB-unique). */
  async join(userId: string, tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException("Tournament not found");
    const state = this.effectiveState(tournament);
    const isGroup = tournament.format === "WEEKLY" || tournament.format === "MONTHLY";
    if (isGroup) {
      // Group tournaments register a pool before they start; once round 1 begins, closed.
      if (state !== "SCHEDULED") throw new BadRequestException("Registration for this tournament has closed");
      // VA rule: registration locks a full day before Round 1 — no entries in the final day.
      if (Date.now() >= this.registrationClosesAt(tournament).getTime()) {
        throw new BadRequestException("Registration is closed — VA tournaments lock one day before the first round.");
      }
    } else if (state !== "SCHEDULED" && state !== "RUNNING") {
      throw new BadRequestException("This tournament is not open for entries");
    }

    const already = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (already) throw new ConflictException("You have already joined this tournament");

    const entryFee = tournament.entryFee;

    const result = await this.prisma.$transaction(async (tx) => {
      if (tournament.maxEntries !== null) {
        const count = await tx.tournamentEntry.count({ where: { tournamentId } });
        if (count >= tournament.maxEntries) throw new BadRequestException("Tournament is full");
      }

      // Lock the wallet so the fee debit can't race another money movement.
      await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });

      let newBalance = wallet.cachedBalance;
      if (entryFee > 0n) {
        if (wallet.cachedBalance < entryFee) {
          throw new BadRequestException("Insufficient funds for the entry fee");
        }
        await this.ledger.appendEntry(tx, {
          walletId: wallet.id,
          amount: -entryFee,
          type: "TOURNAMENT_ENTRY",
          refType: "TOURNAMENT",
          refId: tournamentId,
        });
        newBalance = wallet.cachedBalance - entryFee;
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { cachedBalance: newBalance, version: { increment: 1 } },
        });
        // Fee collection: the debited fee is credited to the treasury (double-entry).
        await this.collectToTreasury(tx, wallet.id, entryFee, "TOURNAMENT_ENTRY", tournamentId);
      }

      const entry = await tx.tournamentEntry.create({
        data: {
          tournamentId,
          userId,
          credits: tournament.startingCredits,
          score: tournament.startingCredits,
        },
      });

      // Group tournaments: seat the player into a Round 1 group immediately (sequential fill
      // — group 1 fills first, then group 2, …), so groups fill live as players register.
      if (isGroup) await this.seatIntoRound(tx, tournamentId, 1, userId, tournament.startingCredits);

      return { entry, newBalance };
    });

    if (entryFee > 0n) {
      this.balanceGateway.emitBalanceUpdate(userId, result.newBalance.toString());
    }

    return {
      entry: this.serializeEntry(result.entry),
      walletBalance: result.newBalance.toString(),
    };
  }

  /** The caller's tournament history — every tournament they've entered, newest first, with
   * the tournament name/state and their starting stack, final score, rank and prize. */
  async myHistory(userId: string) {
    const entries = await this.prisma.tournamentEntry.findMany({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      take: 100,
      include: { tournament: { select: { name: true, state: true, format: true, startingCredits: true, endAt: true } } },
    });
    return {
      history: entries.map((e) => ({
        tournamentId: e.tournamentId,
        name: e.tournament.name,
        state: e.tournament.state,
        format: e.tournament.format,
        startingCoins: e.tournament.startingCredits.toString(),
        endingCoins: e.score.toString(),
        rank: e.rank,
        prizeAwarded: e.prizeAwarded.toString(),
        joinedAt: e.joinedAt.toISOString(),
        endAt: e.tournament.endAt.toISOString(),
      })),
    };
  }

  /** The caller's own entry (coins/score) for a tournament, or null if they haven't joined. */
  async myEntry(userId: string, tournamentId: string) {
    const entry = await this.prisma.tournamentEntry.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    if (!entry) return null;
    const pending = await this.prisma.rebuyRequest.findFirst({ where: { tournamentId, userId, status: "PENDING" } });
    return { ...this.serializeEntry(entry), rebuyPending: !!pending };
  }

  // ---- bracket: player + admin views ----

  /** The full bracket: every round, its matches, and each match's players (scores only). Used
   * by both the player bracket view and the admin detail view. `myMatchIds` lists the matches
   * the caller is seated in, and `myCurrentMatchId` is their still-live match (if any). */
  async getBracket(userId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.format !== "BRACKET" && t.format !== "WEEKLY" && t.format !== "MONTHLY") {
      throw new BadRequestException("This tournament has no bracket");
    }

    const rounds = await this.prisma.tournamentRound.findMany({
      where: { tournamentId },
      orderBy: { index: "asc" },
      include: {
        matches: {
          orderBy: { index: "asc" },
          include: {
            players: { orderBy: [{ score: "desc" }, { joinedAt: "asc" }] },
          },
        },
      },
    });

    const names = await this.nameMap(rounds.flatMap((r) => r.matches.flatMap((m) => m.players.map((p) => p.userId))));

    const myMatchIds: string[] = [];
    let myCurrentMatchId: string | null = null;
    const now = Date.now();

    const roundEnd = (index: number) => {
      const next = rounds.find((r) => r.index === index + 1);
      return next ? next.startAt.getTime() : t.endAt.getTime();
    };

    const shaped = rounds.map((r) => ({
      id: r.id,
      index: r.index,
      startAt: r.startAt.toISOString(),
      endAt: new Date(roundEnd(r.index)).toISOString(),
      settledAt: r.settledAt ? r.settledAt.toISOString() : null,
      matches: r.matches.map((m) => {
        const mine = m.players.some((p) => p.userId === userId);
        if (mine) {
          myMatchIds.push(m.id);
          if (m.state !== "DONE" && now < roundEnd(r.index)) myCurrentMatchId = m.id;
        }
        return {
          id: m.id,
          index: m.index,
          state: m.state,
          startAt: m.startAt.toISOString(),
          winnerUserId: m.winnerUserId,
          seatsFilled: m.players.length,
          seatsTotal: t.playersPerMatch ?? 0,
          players: m.players.map((p) => ({
            userId: p.userId,
            displayName: names.get(p.userId) ?? "Player",
            score: p.score.toString(),
            seat: p.seat,
            advanced: p.advanced,
            eliminated: p.eliminated,
            isMe: p.userId === userId,
          })),
        };
      }),
    }));

    return {
      tournament: this.serialize(t, await this.prisma.matchPlayer.count({ where: { tournamentId, match: { round: { index: 1 } } } })),
      rounds: shaped,
      myMatchIds,
      myCurrentMatchId,
    };
  }

  /** Round-1 slot pick: charge the entry fee and seat the player in an open match. Allowed
   * only before round 1 starts, one seat per player per tournament. */
  async pickSlot(userId: string, tournamentId: string, matchId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.format !== "BRACKET") throw new BadRequestException("This tournament is not a bracket");
    if (Date.now() >= t.startAt.getTime()) throw new BadRequestException("Slot selection has closed — round 1 has started");

    const match = await this.prisma.match.findUnique({ where: { id: matchId }, include: { round: true } });
    if (!match || match.tournamentId !== tournamentId) throw new NotFoundException("Match not found");
    if (match.round.index !== 1) throw new BadRequestException("You can only pick a slot in round 1");

    const already = await this.prisma.matchPlayer.findFirst({ where: { tournamentId, userId } });
    if (already) throw new ConflictException("You have already picked a slot in this tournament");

    const result = await this.prisma.$transaction(async (tx) => {
      // Lock this match's rows so two players can't take the last seat simultaneously.
      await tx.$executeRaw`SELECT id FROM "MatchPlayer" WHERE "matchId" = ${matchId} FOR UPDATE`;
      const seatsFilled = await tx.matchPlayer.count({ where: { matchId } });
      if (seatsFilled >= (t.playersPerMatch ?? 0)) throw new BadRequestException("This match is already full");

      await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      let newBalance = wallet.cachedBalance;
      if (t.entryFee > 0n) {
        if (wallet.cachedBalance < t.entryFee) throw new BadRequestException("Insufficient funds for the entry fee");
        await this.ledger.appendEntry(tx, {
          walletId: wallet.id,
          amount: -t.entryFee,
          type: "TOURNAMENT_ENTRY",
          refType: "TOURNAMENT",
          refId: tournamentId,
        });
        newBalance = wallet.cachedBalance - t.entryFee;
        await tx.wallet.update({ where: { id: wallet.id }, data: { cachedBalance: newBalance, version: { increment: 1 } } });
        await this.collectToTreasury(tx, wallet.id, t.entryFee, "TOURNAMENT_ENTRY", tournamentId);
      }

      const player = await tx.matchPlayer.create({
        data: {
          tournamentId,
          matchId,
          userId,
          seat: seatsFilled,
          coins: t.startingCredits,
          score: t.startingCredits,
        },
      });
      return { player, newBalance };
    });

    if (t.entryFee > 0n) this.balanceGateway.emitBalanceUpdate(userId, result.newBalance.toString());
    return { matchId, seat: result.player.seat, walletBalance: result.newBalance.toString() };
  }

  /** Live scores for one match. Players may only view a match they're seated in; admins may
   * view any match. */
  async matchScoreboard(userId: string, matchId: string, isAdmin: boolean) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        round: true,
        tournament: { select: { endAt: true, format: true, brand: true, matchDurationSec: true } },
        players: { orderBy: [{ score: "desc" }, { joinedAt: "asc" }] },
      },
    });
    if (!match) throw new NotFoundException("Match not found");
    if (!isAdmin && !match.players.some((p) => p.userId === userId)) {
      throw new BadRequestException("You are not in this match");
    }
    let endsAt: Date;
    if (match.tournament.format === "WEEKLY" || match.tournament.format === "MONTHLY") {
      endsAt = new Date(match.startAt.getTime() + match.tournament.matchDurationSec * 1000);
    } else {
      const nextRound = await this.prisma.tournamentRound.findUnique({
        where: { tournamentId_index: { tournamentId: match.tournamentId, index: match.round.index + 1 } },
      });
      endsAt = nextRound ? nextRound.startAt : match.tournament.endAt;
    }
    const names = await this.nameMap(match.players.map((p) => p.userId));
    return {
      matchId,
      tournamentId: match.tournamentId,
      brand: match.tournament.brand,
      format: match.tournament.format,
      state: match.state,
      startAt: match.startAt.toISOString(),
      endsAt: endsAt.toISOString(),
      winnerUserId: match.winnerUserId,
      players: match.players.map((p, i) => ({
        rank: i + 1,
        userId: p.userId,
        displayName: names.get(p.userId) ?? "Player",
        score: p.score.toString(),
        spinsCount: p.spinsCount,
        isMe: p.userId === userId,
      })),
    };
  }

  // ---- bracket: admin round settlement / advancement ----

  /** Settle one bracket round: pick each match's top scorer as winner, seed winners into the
   * next round's matches, and — on the final round — pay prizes and mark the tournament
   * SETTLED. Admin-triggered so it lines up with the admin-scheduled round times. */
  async settleRound(adminId: string, tournamentId: string, roundIndex: number) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.format === "WEEKLY" || t.format === "MONTHLY") return this.settleGroupRound(adminId, t, roundIndex);
    if (t.format !== "BRACKET") throw new BadRequestException("This tournament is not a bracket");
    if (t.state === "SETTLED" || t.state === "CANCELLED") throw new BadRequestException(`Tournament is already ${t.state.toLowerCase()}`);

    const round = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex } },
      include: { matches: { orderBy: { index: "asc" }, include: { players: { orderBy: [{ score: "desc" }, { joinedAt: "asc" }] } } } },
    });
    if (!round) throw new NotFoundException("Round not found");
    if (round.settledAt) throw new BadRequestException("This round is already settled");
    if (roundIndex > 1) {
      const prev = await this.prisma.tournamentRound.findUnique({ where: { tournamentId_index: { tournamentId, index: roundIndex - 1 } } });
      if (!prev?.settledAt) throw new BadRequestException("Settle the previous round first");
    }

    const isFinal = roundIndex === (t.roundsCount ?? 1);
    const payouts: { userId: string; newBalance: bigint }[] = [];

    await this.prisma.$transaction(async (tx) => {
      // Winners of this round, in match order — the seeding order for the next round.
      const winners: string[] = [];
      for (const m of round.matches) {
        const top = m.players[0];
        await tx.match.update({
          where: { id: m.id },
          data: { state: "DONE", winnerUserId: top?.userId ?? null },
        });
        for (const p of m.players) {
          const isWinner = top && p.userId === top.userId;
          await tx.matchPlayer.update({
            where: { id: p.id },
            data: { advanced: !!isWinner, eliminated: !isWinner },
          });
        }
        if (top) winners.push(top.userId);
      }

      if (!isFinal) {
        const nextRound = await tx.tournamentRound.findUniqueOrThrow({
          where: { tournamentId_index: { tournamentId, index: roundIndex + 1 } },
          include: { matches: { orderBy: { index: "asc" } } },
        });
        const perMatch = t.playersPerMatch ?? 2;
        for (let i = 0; i < winners.length; i++) {
          const nextMatch = nextRound.matches[Math.floor(i / perMatch)];
          if (!nextMatch) break;
          await tx.matchPlayer.create({
            data: {
              tournamentId,
              matchId: nextMatch.id,
              userId: winners[i]!,
              seat: i % perMatch,
              coins: t.startingCredits,
              score: t.startingCredits,
            },
          });
        }
      } else {
        // Final round: rank the final match's players and pay the prize table into wallets.
        const prizes = (t.prizeJson as unknown as Prize[]) ?? [];
        const prizeByRank = new Map(prizes.map((p) => [p.rank, BigInt(p.amount)]));
        const finalPlayers = round.matches[0]?.players ?? [];
        for (const [i, p] of finalPlayers.entries()) {
          const rank = i + 1;
          const prize = prizeByRank.get(rank) ?? 0n;
          if (prize > 0n) {
            const wallet = await tx.wallet.findUnique({ where: { userId: p.userId } });
            if (wallet) {
              // Prizes are funded from the treasury (double-entry): treasury debited, winner credited.
              await this.payFromTreasury(tx, wallet.id, prize, "TOURNAMENT_PRIZE", tournamentId);
              await this.ledger.appendEntry(tx, {
                walletId: wallet.id,
                amount: prize,
                type: "TOURNAMENT_PRIZE",
                refType: "TOURNAMENT",
                refId: tournamentId,
              });
              const updated = await tx.wallet.update({
                where: { id: wallet.id },
                data: { cachedBalance: { increment: prize }, version: { increment: 1 } },
              });
              payouts.push({ userId: p.userId, newBalance: updated.cachedBalance });
            }
          }
        }
        await tx.tournament.update({ where: { id: tournamentId }, data: { state: "SETTLED", settledAt: new Date() } });
      }

      await tx.tournamentRound.update({ where: { id: round.id }, data: { settledAt: new Date() } });

      await this.auditLog.record(tx, {
        actorUserId: adminId,
        action: isFinal ? "TOURNAMENT_SETTLED" : "TOURNAMENT_ROUND_SETTLED",
        targetType: "Tournament",
        targetId: tournamentId,
        data: { roundIndex, winners: winners.length, prizesPaid: payouts.length },
      });
    });

    for (const p of payouts) this.balanceGateway.emitBalanceUpdate(p.userId, p.newBalance.toString());
    return { settled: true, roundIndex, isFinal, prizesPaid: payouts.length };
  }

  // ---- group tournaments (WEEKLY / MONTHLY): grouping + settlement ----

  /** Admin view for a round: the eligible player pool and the current group assignments. */
  async getRoundGrouping(tournamentId: string, roundIndex: number) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.format !== "WEEKLY" && t.format !== "MONTHLY") throw new BadRequestException("Not a group tournament");

    const round = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex } },
      include: { matches: { orderBy: { index: "asc" }, include: { players: { orderBy: { seat: "asc" } } } } },
    });
    if (!round) throw new NotFoundException("Round not found");

    // Eligible = registered, not eliminated, currently in this round.
    const eligible = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId, eliminated: false, currentRound: roundIndex },
      orderBy: { joinedAt: "asc" },
    });
    const names = await this.nameMap(eligible.map((e) => e.userId));
    const assigned = new Set(round.matches.flatMap((m) => m.players.map((p) => p.userId)));

    return {
      roundIndex,
      startAt: round.startAt.toISOString(),
      settledAt: round.settledAt ? round.settledAt.toISOString() : null,
      groupCount: round.groupCount ?? 0,
      playersPerGroup: round.playersPerGroup ?? 0,
      advancePerGroup: round.advancePerGroup ?? 0,
      locked: Date.now() >= round.startAt.getTime(),
      pool: eligible.map((e) => ({ userId: e.userId, displayName: names.get(e.userId) ?? "Player", assigned: assigned.has(e.userId) })),
      groups: round.matches.map((m) => ({
        matchId: m.id,
        index: m.index,
        players: m.players.map((p) => ({ userId: p.userId, displayName: names.get(p.userId) ?? "Player" })),
      })),
    };
  }

  /** Admin distributes eligible players into the round's groups. Replaces any existing
   * assignment for the round (allowed only before the round's matches start). */
  async assignGroups(adminId: string, tournamentId: string, roundIndex: number, groups: { matchIndex: number; userIds: string[] }[]) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.format !== "WEEKLY" && t.format !== "MONTHLY") throw new BadRequestException("Not a group tournament");

    const round = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex } },
      include: { matches: { orderBy: { index: "asc" } } },
    });
    if (!round) throw new NotFoundException("Round not found");
    if (round.settledAt) throw new BadRequestException("This round is already settled");
    if (Date.now() >= round.startAt.getTime()) throw new BadRequestException("This round has already started — grouping is locked");

    // All assigned users must be eligible for this round, and assigned to exactly one group.
    const eligible = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId, eliminated: false, currentRound: roundIndex },
      select: { userId: true },
    });
    const eligibleSet = new Set(eligible.map((e) => e.userId));
    const seen = new Set<string>();
    // A group holds at most `playersPerGroup`. When the admin tries to place more, we reject
    // with a clear "group is full" message so they can move a player out and rebalance. (The
    // automatic re-buy path may still add an extra competitor on top — that's handled by the
    // engine, not this manual admin editor.)
    const cap = round.playersPerGroup ?? Number.MAX_SAFE_INTEGER;
    for (const g of groups) {
      const match = round.matches.find((m) => m.index === g.matchIndex);
      if (!match) throw new BadRequestException(`No group #${g.matchIndex} in this round`);
      if (g.userIds.length > cap) {
        throw new BadRequestException(`Group ${g.matchIndex + 1} is full (max ${cap} players). Remove a player from it before adding another.`);
      }
      for (const uid of g.userIds) {
        if (!eligibleSet.has(uid)) throw new BadRequestException("A selected player is not eligible for this round");
        if (seen.has(uid)) throw new BadRequestException("A player was placed in more than one group");
        seen.add(uid);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const matchIds = round.matches.map((m) => m.id);
      await tx.matchPlayer.deleteMany({ where: { matchId: { in: matchIds } } });
      for (const g of groups) {
        const match = round.matches.find((m) => m.index === g.matchIndex)!;
        for (let seat = 0; seat < g.userIds.length; seat++) {
          await tx.matchPlayer.create({
            data: {
              tournamentId,
              matchId: match.id,
              userId: g.userIds[seat]!,
              seat,
              coins: t.startingCredits,
              score: t.startingCredits,
            },
          });
        }
      }
    });

    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: "TOURNAMENT_ROUND_GROUPED",
      targetType: "Tournament",
      targetId: tournamentId,
      data: { roundIndex, assigned: seen.size },
    });
    return { grouped: true, roundIndex, assigned: seen.size };
  }

  /** Seat ONE player into the given round's groups by sequential fill — group 1 fills to
   * `playersPerGroup` first, then group 2, and so on. Called at registration (from `join`) so
   * groups fill live, one-by-one, as players arrive — no admin action needed. Concurrency-safe:
   * it locks the round's Match rows so two simultaneous joins take distinct seats. No-op if the
   * round is missing/settled, has already started (the engine groups it then), or the player is
   * already seated. */
  private async seatIntoRound(
    tx: TxClient,
    tournamentId: string,
    roundIndex: number,
    userId: string,
    startingCredits: bigint,
  ): Promise<void> {
    const round = await tx.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex } },
      include: { matches: { orderBy: { index: "asc" } } },
    });
    if (!round || round.settledAt || round.matches.length === 0) return;
    if (Date.now() >= round.startAt.getTime()) return; // already started — engine handles grouping
    // Serialize concurrent seatings for this round so counts below are consistent.
    await tx.$executeRaw`SELECT id FROM "Match" WHERE "roundId" = ${round.id} FOR UPDATE`;
    const matchIds = round.matches.map((m) => m.id);
    const existing = await tx.matchPlayer.findFirst({ where: { userId, matchId: { in: matchIds } } });
    if (existing) return; // already seated (idempotent)
    const per = round.playersPerGroup ?? Number.MAX_SAFE_INTEGER;
    const counts = await Promise.all(matchIds.map((id) => tx.matchPlayer.count({ where: { matchId: id } })));
    // First group with space; if every group is at capacity, overflow into the last group.
    let g = counts.findIndex((c) => c < per);
    if (g === -1) g = round.matches.length - 1;
    await tx.matchPlayer.create({
      data: {
        tournamentId,
        matchId: round.matches[g]!.id,
        userId,
        seat: counts[g]!,
        coins: startingCredits,
        score: startingCredits,
      },
    });
  }

  /** Engine-driven grouping at round start: distribute the eligible pool into the round's
   * groups by SEQUENTIAL FILL in entry order — group 1 fills to `playersPerGroup`, then
   * group 2, and so on (first-come players share the earliest groups). Re-buys are then
   * appended round-robin from group 1 (spread evenly), so groups may exceed the nominal size
   * by the re-buy count (intended: a re-buy is an extra competitor, still must place top-N).
   * Unlike assignGroups this runs AT/after start (no admin lock). It seats only players who are
   * NOT already seated, so it composes with the live seating done at registration (`join` →
   * `seatIntoRound`): for Round 1 everyone is usually seated already (no-op), while for later
   * rounds it seats the fresh advancers/re-buys. Idempotent — a re-fired tick places nobody
   * twice. */
  async autoAssignGroups(tournamentId: string, roundIndex: number): Promise<{ grouped: number }> {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t || (t.format !== "WEEKLY" && t.format !== "MONTHLY")) return { grouped: 0 };
    const round = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex } },
      include: { matches: { orderBy: { index: "asc" } } },
    });
    if (!round || round.settledAt || round.matches.length === 0) return { grouped: 0 };

    const eligible = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId, eliminated: false, currentRound: roundIndex },
      select: { userId: true },
      orderBy: { joinedAt: "asc" },
    });
    if (eligible.length === 0) return { grouped: 0 };
    const rebuys = await this.prisma.rebuyRequest.findMany({
      where: { tournamentId, round: roundIndex, status: "APPROVED" },
      select: { userId: true },
      orderBy: { createdAt: "asc" },
    });
    const rebuySet = new Set(rebuys.map((r) => r.userId));
    const eligibleSet = new Set(eligible.map((e) => e.userId));
    const advancers = eligible.map((e) => e.userId).filter((u) => !rebuySet.has(u));
    const rebuyOrder = rebuys.map((r) => r.userId).filter((u) => eligibleSet.has(u));

    const matchIds = round.matches.map((m) => m.id);
    const groupCount = round.matches.length;

    const assigned = await this.prisma.$transaction(async (tx) => {
      // Lock the round's matches so concurrent seatings (live joins) don't collide.
      await tx.$executeRaw`SELECT id FROM "Match" WHERE "roundId" = ${round.id} FOR UPDATE`;
      // Who is already seated, and how full is each group right now.
      const seated = await tx.matchPlayer.findMany({ where: { matchId: { in: matchIds } }, select: { userId: true } });
      const seatedSet = new Set(seated.map((s) => s.userId));
      const counts = await Promise.all(matchIds.map((id) => tx.matchPlayer.count({ where: { matchId: id } })));

      const freshAdvancers = advancers.filter((u) => !seatedSet.has(u));
      const freshRebuys = rebuyOrder.filter((u) => !seatedSet.has(u));
      const per = round.playersPerGroup ?? Math.max(1, Math.ceil((counts.reduce((a, b) => a + b, 0) + freshAdvancers.length) / groupCount));

      let placed = 0;
      const seatOne = async (uid: string, g: number) => {
        await tx.matchPlayer.create({
          data: { tournamentId, matchId: round.matches[g]!.id, userId: uid, seat: counts[g]!, coins: t.startingCredits, score: t.startingCredits },
        });
        counts[g]!++;
        placed++;
      };
      // Advancers: sequential fill — first group with space, else overflow into the last group.
      for (const uid of freshAdvancers) {
        let g = counts.findIndex((c) => c < per);
        if (g === -1) g = groupCount - 1;
        await seatOne(uid, g);
      }
      // Re-buys: round-robin from group 1 so they spread out (extra competitors, no cap).
      for (let i = 0; i < freshRebuys.length; i++) await seatOne(freshRebuys[i]!, i % groupCount);
      return placed;
    });

    if (assigned > 0) {
      await this.auditLog.record(this.prisma, {
        actorUserId: "system",
        action: "TOURNAMENT_ROUND_AUTO_GROUPED",
        targetType: "Tournament",
        targetId: tournamentId,
        data: { roundIndex, assigned },
      });
    }
    return { grouped: assigned };
  }

  /** After a non-final round settles, schedule the next round to start `roundGapSec` later
   * and notify active players (this notification IS the ~10-min-before alert). */
  /** Notify all active players that a (fixed-time) round is coming up. Does NOT move any round
   * start times — round schedules are fixed at creation and never recomputed. */
  async announceRound(tournamentId: string, roundIndex: number): Promise<void> {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) return;
    const round = await this.prisma.tournamentRound.findUnique({ where: { tournamentId_index: { tournamentId, index: roundIndex } } });
    if (!round || round.settledAt || round.startNotifiedAt) return;
    const rn = roundIndex === (t.roundsCount ?? 1) ? "Final" : roundIndex === (t.roundsCount ?? 1) - 1 ? "Semi-Final" : `Round ${roundIndex}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.tournamentRound.update({ where: { id: round.id }, data: { startNotifiedAt: new Date() } });
      const active = await tx.tournamentEntry.findMany({ where: { tournamentId, eliminated: false }, select: { userId: true } });
      if (active.length) {
        await tx.notification.createMany({
          data: active.map((a) => ({
            userId: a.userId,
            title: `${t.name}: ${rn} starting soon`,
            body: `The ${rn} begins ${round.startAt.toUTCString()}. Your group plays at its scheduled time — keep the tournament open.`,
            refType: "TOURNAMENT",
            refId: tournamentId,
          })),
        });
      }
    });
  }

  // Ties (players with equal score, e.g. nobody spun) break by TOURNAMENT ENTRY time — whoever
  // registered earlier ranks higher.
  private async entryTimeMap(tournamentId: string): Promise<Map<string, number>> {
    const entries = await this.prisma.tournamentEntry.findMany({ where: { tournamentId }, select: { userId: true, joinedAt: true } });
    return new Map(entries.map((e) => [e.userId, e.joinedAt.getTime()]));
  }
  private rankByScoreThenEntry<P extends { userId: string; score: bigint }>(players: P[], entryAt: Map<string, number>): P[] {
    return [...players].sort((a, b) => (b.score > a.score ? 1 : b.score < a.score ? -1 : (entryAt.get(a.userId) ?? 0) - (entryAt.get(b.userId) ?? 0)));
  }

  /** Settle ONE non-final group match the instant its own 5-minute window ends: rank its
   * players (score desc, then earliest entry), mark it DONE, advance the top `advancePerGroup`
   * to the next round and eliminate the rest. Idempotent — a match already DONE is skipped. So
   * each group finishes and reveals its result on its own schedule, not the whole round at once. */
  async settleGroupMatch(tournamentId: string, roundIndex: number, matchId: string): Promise<boolean> {
    const entryAt = await this.entryTimeMap(tournamentId);
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Match" WHERE id = ${matchId} FOR UPDATE`;
      const m = await tx.match.findUnique({ where: { id: matchId }, include: { players: true, round: true } });
      if (!m || m.state === "DONE") return false;
      const ranked = this.rankByScoreThenEntry(m.players, entryAt);
      const advancePerGroup = m.round.advancePerGroup ?? 0;
      const topSet = new Set(ranked.slice(0, advancePerGroup).map((p) => p.userId));
      await tx.match.update({ where: { id: m.id }, data: { state: "DONE", winnerUserId: ranked[0]?.userId ?? null } });
      for (const p of m.players) {
        const advanced = topSet.has(p.userId);
        await tx.matchPlayer.update({ where: { id: p.id }, data: { advanced, eliminated: !advanced } });
        await tx.tournamentEntry.update({
          where: { tournamentId_userId: { tournamentId, userId: p.userId } },
          data: advanced ? { currentRound: roundIndex + 1 } : { eliminated: true, eliminatedRound: roundIndex },
        });
      }
      return true;
    });
  }

  /** Once every group in a NON-final round has settled, lock the round and notify the advancers
   * of their next (fixed-time) round. The engine seats them ~10 min before that round begins
   * (see autoAssignGroups), so nothing here moves start times. Idempotent. */
  async finalizeGroupRoundIfComplete(actorId: string, tournamentId: string, roundIndex: number): Promise<boolean> {
    const round = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex } },
      include: { matches: true },
    });
    if (!round || round.settledAt || round.matches.length === 0) return false;
    if (!round.matches.every((m) => m.state === "DONE")) return false;
    await this.prisma.tournamentRound.update({ where: { id: round.id }, data: { settledAt: new Date() } });
    await this.auditLog.record(this.prisma, {
      actorUserId: actorId,
      action: "TOURNAMENT_ROUND_SETTLED",
      targetType: "Tournament",
      targetId: tournamentId,
      data: { roundIndex },
    });
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    const next = await this.prisma.tournamentRound.findUnique({ where: { tournamentId_index: { tournamentId, index: roundIndex + 1 } } });
    if (t && next) {
      const rn = roundIndex + 1 === (t.roundsCount ?? 1) ? "Final" : roundIndex + 1 === (t.roundsCount ?? 1) - 1 ? "Semi-Final" : `Round ${roundIndex + 1}`;
      const advancers = await this.prisma.tournamentEntry.findMany({ where: { tournamentId, eliminated: false, currentRound: roundIndex + 1 }, select: { userId: true } });
      if (advancers.length) {
        await this.prisma.notification.createMany({
          data: advancers.map((a) => ({
            userId: a.userId,
            title: `${t.name}: you advanced to the ${rn}`,
            body: `Your ${rn} group plays at its scheduled time on ${next.startAt.toUTCString()}.`,
            refType: "TOURNAMENT",
            refId: tournamentId,
          })),
        });
      }
    }
    return true;
  }

  /** Settle the FINAL group round: rank everyone across the final group(s) and pay the Top-10
   * prize table from the treasury, then mark the tournament SETTLED. Idempotent. */
  async settleFinalGroupRound(actorId: string, tournamentId: string, roundIndex: number): Promise<{ settled: true; roundIndex: number; isFinal: true; prizesPaid: number }> {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    const round = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex } },
      include: { matches: { include: { players: true } } },
    });
    if (!round) throw new NotFoundException("Round not found");
    if (round.settledAt || t.state === "SETTLED") return { settled: true, roundIndex, isFinal: true, prizesPaid: 0 };

    const entryAt = await this.entryTimeMap(tournamentId);
    const finalists = this.rankByScoreThenEntry(round.matches.flatMap((m) => m.players), entryAt);
    // VA prize pool is DYNAMIC: 2× the total entry fees collected, split across the Top 10.
    // WM uses the admin-set fixed prize table.
    let prizes: Prize[];
    if (t.brand === "VA") {
      const pool = (await this.totalEntryFeesCollected(tournamentId, t.entryFee)) * VA_PRIZE_MULTIPLIER;
      prizes = prizeTableFromPool(pool);
    } else {
      prizes = (t.prizeJson as unknown as Prize[]) ?? [];
    }
    const prizeByRank = new Map(prizes.map((p) => [p.rank, BigInt(p.amount)]));
    const payouts: { userId: string; newBalance: bigint }[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const m of round.matches) await tx.match.update({ where: { id: m.id }, data: { state: "DONE" } });
      for (const [i, p] of finalists.entries()) {
        const rank = i + 1;
        const prize = prizeByRank.get(rank) ?? 0n;
        await tx.matchPlayer.update({ where: { id: p.id }, data: { advanced: rank <= 10, eliminated: rank > 10 } });
        await tx.tournamentEntry.update({
          where: { tournamentId_userId: { tournamentId, userId: p.userId } },
          data: { rank, prizeAwarded: prize, eliminated: rank > 10, eliminatedRound: rank > 10 ? roundIndex : null },
        });
        if (prize > 0n) {
          const wallet = await tx.wallet.findUnique({ where: { userId: p.userId } });
          if (wallet) {
            // Prizes are funded from the treasury (double-entry): treasury debited, winner credited.
            await this.payFromTreasury(tx, wallet.id, prize, "TOURNAMENT_PRIZE", tournamentId);
            await this.ledger.appendEntry(tx, { walletId: wallet.id, amount: prize, type: "TOURNAMENT_PRIZE", refType: "TOURNAMENT", refId: tournamentId });
            const updated = await tx.wallet.update({ where: { id: wallet.id }, data: { cachedBalance: { increment: prize }, version: { increment: 1 } } });
            payouts.push({ userId: p.userId, newBalance: updated.cachedBalance });
          }
        }
      }
      await tx.tournament.update({ where: { id: tournamentId }, data: { state: "SETTLED", settledAt: new Date() } });
      await tx.tournamentRound.update({ where: { id: round.id }, data: { settledAt: new Date() } });
      await this.auditLog.record(tx, {
        actorUserId: actorId,
        action: "TOURNAMENT_SETTLED",
        targetType: "Tournament",
        targetId: tournamentId,
        data: { roundIndex, prizesPaid: payouts.length },
      });
    });

    for (const p of payouts) this.balanceGateway.emitBalanceUpdate(p.userId, p.newBalance.toString());
    return { settled: true, roundIndex, isFinal: true, prizesPaid: payouts.length };
  }

  /** Settle an entire group round NOW (admin override / manual). Reuses the per-match settlement
   * so it lines up with the automatic engine: settles every not-yet-DONE group, then finalizes. */
  private async settleGroupRound(adminId: string, t: Tournament, roundIndex: number) {
    if (t.state === "SETTLED" || t.state === "CANCELLED") throw new BadRequestException(`Tournament is already ${t.state.toLowerCase()}`);
    const tournamentId = t.id;
    const round = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_index: { tournamentId, index: roundIndex } },
      include: { matches: { orderBy: { index: "asc" } } },
    });
    if (!round) throw new NotFoundException("Round not found");
    if (round.settledAt) throw new BadRequestException("This round is already settled");
    if (roundIndex > 1) {
      const prev = await this.prisma.tournamentRound.findUnique({ where: { tournamentId_index: { tournamentId, index: roundIndex - 1 } } });
      if (!prev?.settledAt) throw new BadRequestException("Settle the previous round first");
    }

    const isFinal = roundIndex === (t.roundsCount ?? 1);
    if (isFinal) return this.settleFinalGroupRound(adminId, tournamentId, roundIndex);
    for (const m of round.matches) await this.settleGroupMatch(tournamentId, roundIndex, m.id);
    await this.finalizeGroupRoundIfComplete(adminId, tournamentId, roundIndex);
    return { settled: true, roundIndex, isFinal: false, prizesPaid: 0 };
  }

  /** Re-buy-in: an eliminated player pays the entry fee again to rejoin the next round —
   * allowed only before the Semi-Final (Weekly: 1 re-buy, Monthly: 2), and only while that
   * next round hasn't started yet (so the admin can still group them). */
  /** Validate that an eliminated player is currently allowed to re-buy-in, returning the
   * round they'd re-enter. Shared by the player request path and the eligibility flag. */
  private async assertRebuyEligible(t: Tournament, userId: string) {
    if (t.format !== "WEEKLY" && t.format !== "MONTHLY") throw new BadRequestException("Re-buy-in is only for weekly/monthly tournaments");
    const entry = await this.prisma.tournamentEntry.findUnique({ where: { tournamentId_userId: { tournamentId: t.id, userId } } });
    if (!entry) throw new BadRequestException("You are not registered for this tournament");
    if (!entry.eliminated || entry.eliminatedRound == null) throw new BadRequestException("Re-buy-in is only available after you are eliminated");

    const nextRound = entry.eliminatedRound + 1;
    const semiFinalRound = (t.roundsCount ?? 1) - 1;
    if (nextRound > semiFinalRound) throw new BadRequestException("Re-buy-in is not available after the Semi-Final");

    const round = await this.prisma.tournamentRound.findUnique({ where: { tournamentId_index: { tournamentId: t.id, index: nextRound } } });
    if (!round) throw new NotFoundException("Next round not found");
    if (round.settledAt) throw new BadRequestException("That round is already over");
    if (Date.now() >= round.startAt.getTime()) throw new BadRequestException("Re-buy-in has closed — that round has already started");
    return { entry, nextRound };
  }

  /** Automatic re-buy-in: the player pays the entry fee and is IMMEDIATELY reinstated into
   * the next round — no admin approval. An APPROVED RebuyRequest records the placement order
   * so the engine slots re-buys into the next round's groups round-robin (re-buy #1→group 1,
   * #2→group 2, …). */
  async rebuy(userId: string, tournamentId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    const { nextRound } = await this.assertRebuyEligible(t, userId);

    const existing = await this.prisma.rebuyRequest.findFirst({ where: { tournamentId, userId, round: nextRound } });
    if (existing) throw new BadRequestException("You have already re-bought into this round");

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`;
      const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
      let newBalance = wallet.cachedBalance;
      if (t.entryFee > 0n) {
        if (wallet.cachedBalance < t.entryFee) throw new BadRequestException("Insufficient funds for the re-buy-in");
        await this.ledger.appendEntry(tx, { walletId: wallet.id, amount: -t.entryFee, type: "TOURNAMENT_ENTRY", refType: "TOURNAMENT", refId: tournamentId });
        newBalance = wallet.cachedBalance - t.entryFee;
        await tx.wallet.update({ where: { id: wallet.id }, data: { cachedBalance: newBalance, version: { increment: 1 } } });
        await this.collectToTreasury(tx, wallet.id, t.entryFee, "TOURNAMENT_ENTRY", tournamentId);
      }
      // Reinstate immediately for the next round; the engine places them when it groups it.
      await tx.tournamentEntry.update({
        where: { tournamentId_userId: { tournamentId, userId } },
        data: { eliminated: false, eliminatedRound: null, currentRound: nextRound, rebuysUsed: { increment: 1 } },
      });
      await tx.rebuyRequest.create({
        data: { tournamentId, userId, round: nextRound, amount: t.entryFee, status: "APPROVED", decidedAt: new Date(), decidedById: "system" },
      });
      return { newBalance };
    });

    if (t.entryFee > 0n) this.balanceGateway.emitBalanceUpdate(userId, result.newBalance.toString());
    return { rebought: true, round: nextRound, walletBalance: result.newBalance.toString() };
  }

  /** Admin view: pending (and recently decided) re-buy-in requests for a tournament. */
  async listRebuyRequests(tournamentId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    const requests = await this.prisma.rebuyRequest.findMany({
      where: { tournamentId },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    });
    const names = await this.nameMap(requests.map((r) => r.userId));
    return {
      requests: requests.map((r) => ({
        id: r.id,
        userId: r.userId,
        displayName: names.get(r.userId) ?? "Player",
        round: r.round,
        amount: r.amount.toString(),
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
      })),
    };
  }

  /** Admin approves or rejects a pending re-buy-in request. Approval reinstates the player
   * into their `round` (eliminated=false, currentRound=round, rebuysUsed++) so they appear
   * in that round's grouping pool for the admin to place; rejection refunds the entry fee.
   * Either way the player is notified. */
  async decideRebuy(adminId: string, requestId: string, approve: boolean) {
    const request = await this.prisma.rebuyRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new NotFoundException("Re-buy-in request not found");
    if (request.status !== "PENDING") throw new BadRequestException("This request has already been decided");

    const t = await this.prisma.tournament.findUnique({ where: { id: request.tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    const roundName = request.round === (t.roundsCount ?? 1) ? "Final" : request.round === (t.roundsCount ?? 1) - 1 ? "Semi-Final" : `Round ${request.round}`;

    if (approve) {
      // Re-check the window is still open — the round may have started since the request.
      const round = await this.prisma.tournamentRound.findUnique({ where: { tournamentId_index: { tournamentId: t.id, index: request.round } } });
      if (!round) throw new NotFoundException("Round not found");
      if (round.settledAt || Date.now() >= round.startAt.getTime()) {
        throw new BadRequestException("That round has already started — approve the re-buy-in before it begins, or reject to refund");
      }
    }

    const balanceUpdate = await this.prisma.$transaction(async (tx) => {
      let newBalance: bigint | null = null;
      if (approve) {
        await tx.tournamentEntry.update({
          where: { tournamentId_userId: { tournamentId: request.tournamentId, userId: request.userId } },
          data: { eliminated: false, eliminatedRound: null, currentRound: request.round, rebuysUsed: { increment: 1 } },
        });
      } else if (request.amount > 0n) {
        await tx.$executeRaw`SELECT id FROM "Wallet" WHERE "userId" = ${request.userId} FOR UPDATE`;
        const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId: request.userId } });
        // The fee was collected into the treasury on request; a rejected re-buy refunds it
        // back out of the treasury to the player (double-entry).
        await this.payFromTreasury(tx, wallet.id, request.amount, "TOURNAMENT_REFUND", request.tournamentId);
        await this.ledger.appendEntry(tx, { walletId: wallet.id, amount: request.amount, type: "TOURNAMENT_REFUND", refType: "TOURNAMENT", refId: request.tournamentId });
        newBalance = wallet.cachedBalance + request.amount;
        await tx.wallet.update({ where: { id: wallet.id }, data: { cachedBalance: newBalance, version: { increment: 1 } } });
      }
      await tx.rebuyRequest.update({ where: { id: request.id }, data: { status: approve ? "APPROVED" : "REJECTED", decidedAt: new Date(), decidedById: adminId } });
      await tx.notification.create({
        data: {
          userId: request.userId,
          title: approve ? `${t.name}: Re-buy-in approved` : `${t.name}: Re-buy-in declined`,
          body: approve
            ? `Your re-buy-in was approved — you're back in for the ${roundName}. The admin will place you in a group before it starts.`
            : `Your re-buy-in for the ${roundName} was declined and your entry fee was refunded.`,
          refType: "TOURNAMENT",
          refId: request.tournamentId,
        },
      });
      return newBalance;
    });

    if (balanceUpdate != null) this.balanceGateway.emitBalanceUpdate(request.userId, balanceUpdate.toString());
    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: approve ? "TOURNAMENT_REBUY_APPROVED" : "TOURNAMENT_REBUY_REJECTED",
      targetType: "Tournament",
      targetId: request.tournamentId,
      data: { requestId: request.id, userId: request.userId, round: request.round },
    });
    return { decided: true, approved: approve };
  }

  /** Admin sets/changes a (future, unsettled) round's start time and notifies active players. */
  async rescheduleRound(adminId: string, tournamentId: string, roundIndex: number, startAtIso: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException("Tournament not found");
    if (t.format !== "WEEKLY" && t.format !== "MONTHLY") throw new BadRequestException("Not a group tournament");
    const round = await this.prisma.tournamentRound.findUnique({ where: { tournamentId_index: { tournamentId, index: roundIndex } } });
    if (!round) throw new NotFoundException("Round not found");
    if (round.settledAt) throw new BadRequestException("This round is already settled");
    const newStart = new Date(startAtIso);
    if (Number.isNaN(newStart.getTime())) throw new BadRequestException("Invalid start time");
    if (newStart.getTime() <= Date.now()) throw new BadRequestException("New start time must be in the future");

    const roundName = roundIndex === (t.roundsCount ?? 1) ? "Final" : roundIndex === (t.roundsCount ?? 1) - 1 ? "Semi-Final" : `Round ${roundIndex}`;
    // Groups within the round stay staggered: group g starts newStart + g*(match + gap).
    const strideMs = ((t.matchDurationSec ?? 300) + (t.roundGapSec ?? 600)) * 1000;
    const notified = await this.prisma.$transaction(async (tx) => {
      await tx.tournamentRound.update({ where: { id: round.id }, data: { startAt: newStart } });
      const groups = await tx.match.findMany({ where: { roundId: round.id }, orderBy: { index: "asc" }, select: { id: true, index: true } });
      for (const g of groups) {
        await tx.match.update({ where: { id: g.id }, data: { startAt: new Date(newStart.getTime() + g.index * strideMs) } });
      }
      // Keep the tournament in the visible/joinable window after a reschedule:
      //  - startAt tracks ROUND 1 (registration closes when round 1 begins);
      //  - endAt = latest group start + match length. Without recomputing endAt, a lapsed
      //    endAt keeps the tournament hidden from players even after a reschedule, because
      //    listOpen filters endAt > now.
      const rounds = await tx.tournamentRound.findMany({ where: { tournamentId }, include: { matches: { select: { startAt: true } } } });
      const lastGroupStart = Math.max(...rounds.flatMap((r) => r.matches.map((m) => m.startAt.getTime())));
      const endAt = new Date(lastGroupStart + (t.matchDurationSec ?? 300) * 1000);
      const data: { endAt: Date; startAt?: Date } = { endAt };
      if (roundIndex === 1) data.startAt = newStart;
      await tx.tournament.update({ where: { id: tournamentId }, data });
      const active = await tx.tournamentEntry.findMany({ where: { tournamentId, eliminated: false }, select: { userId: true } });
      if (active.length) {
        await tx.notification.createMany({
          data: active.map((a) => ({
            userId: a.userId,
            title: `${t.name}: ${roundName} scheduled`,
            body: `The ${roundName} will start at ${newStart.toUTCString()}.`,
            refType: "TOURNAMENT",
            refId: tournamentId,
          })),
        });
      }
      return active.length;
    });

    await this.auditLog.record(this.prisma, {
      actorUserId: adminId,
      action: "TOURNAMENT_ROUND_RESCHEDULED",
      targetType: "Tournament",
      targetId: tournamentId,
      data: { roundIndex, startAt: newStart.toISOString(), notified },
    });
    return { rescheduled: true, roundIndex, startAt: newStart.toISOString(), notified };
  }

  /** Map of userId → display name (full name, else email local-part) for a set of players. */
  private async nameMap(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, email: true, fullName: true },
    });
    return new Map(users.map((u) => [u.id, u.fullName?.trim() || u.email.split("@")[0] || "Player"]));
  }

  // ---- settlement ----

  /** Freeze final ranks and pay the prize table into winners' wallets. Idempotent-ish: only
   * runs on a tournament that has ended and isn't already settled/cancelled. */
  async settle(adminId: string, tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new NotFoundException("Tournament not found");
    if (tournament.state === "SETTLED") throw new BadRequestException("Tournament already settled");
    if (tournament.state === "CANCELLED") throw new BadRequestException("Tournament was cancelled");
    if (Date.now() < tournament.endAt.getTime()) {
      throw new BadRequestException("Tournament has not ended yet");
    }

    const prizes = (tournament.prizeJson as unknown as Prize[]) ?? [];
    const prizeByRank = new Map(prizes.map((p) => [p.rank, BigInt(p.amount)]));

    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId },
      orderBy: [{ score: "desc" }, { joinedAt: "asc" }],
      include: { user: { select: { wallet: { select: { id: true } } } } },
    });

    const payouts: { userId: string; newBalance: bigint }[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const [i, entry] of entries.entries()) {
        const rank = i + 1;
        const prize = prizeByRank.get(rank) ?? 0n;

        if (prize > 0n && entry.user.wallet) {
          const walletId = entry.user.wallet.id;
          // Prizes are funded from the treasury (double-entry): treasury debited, winner credited.
          await this.payFromTreasury(tx, walletId, prize, "TOURNAMENT_PRIZE", tournamentId);
          await this.ledger.appendEntry(tx, {
            walletId,
            amount: prize,
            type: "TOURNAMENT_PRIZE",
            refType: "TOURNAMENT",
            refId: tournamentId,
          });
          const wallet = await tx.wallet.update({
            where: { id: walletId },
            data: { cachedBalance: { increment: prize }, version: { increment: 1 } },
          });
          payouts.push({ userId: entry.userId, newBalance: wallet.cachedBalance });
        }

        await tx.tournamentEntry.update({
          where: { id: entry.id },
          data: { rank, prizeAwarded: prize },
        });
      }

      await tx.tournament.update({
        where: { id: tournamentId },
        data: { state: "SETTLED", settledAt: new Date() },
      });

      await this.auditLog.record(tx, {
        actorUserId: adminId,
        action: "TOURNAMENT_SETTLED",
        targetType: "Tournament",
        targetId: tournamentId,
        data: { entrants: entries.length, prizesPaid: payouts.length },
      });
    });

    for (const p of payouts) {
      this.balanceGateway.emitBalanceUpdate(p.userId, p.newBalance.toString());
    }

    return { settled: true, entrants: entries.length, prizesPaid: payouts.length };
  }

  // ---- public ----

  /** Tournaments a player can currently see: upcoming or in-progress, soonest first. */
  async listOpen() {
    const now = new Date();
    const rows = await this.prisma.tournament.findMany({
      where: { state: { in: ["SCHEDULED", "RUNNING"] }, endAt: { gt: now } },
      orderBy: [{ startAt: "asc" }],
      include: { _count: { select: { entries: true } } },
    });
    return { tournaments: rows.map((t) => this.serialize(t, t._count.entries)) };
  }

  async get(id: string) {
    const t = await this.prisma.tournament.findUnique({
      where: { id },
      include: { _count: { select: { entries: true } } },
    });
    if (!t) throw new NotFoundException("Tournament not found");
    return this.serialize(t, t._count.entries);
  }

  async leaderboard(id: string, top = 50) {
    const t = await this.prisma.tournament.findUnique({ where: { id } });
    if (!t) throw new NotFoundException("Tournament not found");
    const entries = await this.prisma.tournamentEntry.findMany({
      where: { tournamentId: id },
      orderBy: [{ score: "desc" }, { joinedAt: "asc" }],
      take: top,
      include: { user: { select: { email: true } } },
    });
    return {
      tournamentId: id,
      state: this.effectiveState(t),
      leaderboard: entries.map((e, i) => ({
        rank: e.rank ?? i + 1,
        userId: e.userId,
        // Only the local part of the email, so the board doesn't leak full addresses.
        displayName: e.user.email.split("@")[0],
        score: e.score.toString(),
        spinsCount: e.spinsCount,
      })),
    };
  }

  // ---- helpers ----

  private assertKnownModel(modelId: string) {
    if (!MATH_MODELS_BY_ID.has(modelId)) {
      throw new BadRequestException(`Unknown math model: ${modelId}`);
    }
  }

  /** Time-derived state for display. Terminal states (SETTLED/CANCELLED) are authoritative
   * as stored; otherwise we derive SCHEDULED/RUNNING/ENDED from the clock so we don't need a
   * scheduler just to show the right status. (A scheduler will persist these + trigger
   * settlement in a later phase.) */
  private effectiveState(t: Tournament): TournamentState {
    if (t.state === "SETTLED" || t.state === "CANCELLED") return t.state;
    const now = Date.now();
    if (now < t.startAt.getTime()) return "SCHEDULED";
    if (now < t.endAt.getTime()) return "RUNNING";
    return "ENDED";
  }

  private serializeEntry(e: {
    id: string;
    tournamentId: string;
    userId: string;
    credits: bigint;
    score: bigint;
    spinsCount: number;
    rank: number | null;
    prizeAwarded: bigint;
    currentRound?: number;
    eliminated?: boolean;
    eliminatedRound?: number | null;
    rebuysUsed?: number;
    joinedAt: Date;
  }) {
    return {
      id: e.id,
      tournamentId: e.tournamentId,
      userId: e.userId,
      credits: e.credits.toString(),
      score: e.score.toString(),
      spinsCount: e.spinsCount,
      rank: e.rank,
      prizeAwarded: e.prizeAwarded.toString(),
      currentRound: e.currentRound ?? 1,
      eliminated: e.eliminated ?? false,
      eliminatedRound: e.eliminatedRound ?? null,
      rebuysUsed: e.rebuysUsed ?? 0,
      joinedAt: e.joinedAt.toISOString(),
    };
  }

  private serialize(t: Tournament, entryCount: number) {
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      modelId: t.modelId,
      format: t.format,
      brand: t.brand,
      state: this.effectiveState(t),
      storedState: t.state,
      entryFee: t.entryFee.toString(),
      startingCredits: t.startingCredits.toString(),
      startAt: t.startAt.toISOString(),
      endAt: t.endAt.toISOString(),
      registrationClosesAt: this.registrationClosesAt(t).toISOString(),
      maxEntries: t.maxEntries,
      capacity: t.capacity,
      roundsCount: t.roundsCount,
      playersPerMatch: t.playersPerMatch,
      matchDurationSec: t.matchDurationSec,
      entryCount,
      prizes: (t.prizeJson as unknown as Prize[]) ?? [],
      createdAt: t.createdAt.toISOString(),
      settledAt: t.settledAt ? t.settledAt.toISOString() : null,
    };
  }
}
