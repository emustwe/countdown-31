import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { PrismaService } from "../../common/prisma/prisma.service";
import { TournamentsService } from "./tournaments.service";

const SYSTEM = "system";
const START_SOON_LEAD_SEC = 600; // notify ~10 min before a round begins

/** Runs the WEEKLY/MONTHLY tournaments automatically — no admin action needed. Round start
 * times are FIXED at creation and never moved. Within a round the groups play SEQUENTIALLY:
 * each group has its own staggered start (group g at round.startAt + g*(match+gap)), plays for
 * matchDurationSec, then settles on its own — the next group's window opens after the gap. On
 * each tick, for every live group tournament, it: announces an upcoming round ~10 min out,
 * seats players when a round becomes reachable, settles each group the moment its own window
 * ends, and finalizes the round once all its groups are done. Every step is guarded by DB state
 * (settledAt / match state / notified markers), so a re-fired tick is a no-op. */
@Injectable()
export class TournamentEngineService {
  private readonly logger = new Logger(TournamentEngineService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tournaments: TournamentsService,
  ) {}

  @Interval("tournament-engine", 5_000)
  async tick(): Promise<void> {
    if (this.running) return; // don't overlap if a tick runs long
    this.running = true;
    try {
      const now = Date.now();
      const live = await this.prisma.tournament.findMany({
        where: { format: { in: ["WEEKLY", "MONTHLY"] }, state: { notIn: ["SETTLED", "CANCELLED"] } },
        include: { rounds: { orderBy: { index: "asc" }, include: { matches: { orderBy: { index: "asc" }, select: { id: true, index: true, state: true, startAt: true } } } } },
      });
      for (const t of live) {
        try {
          await this.advance(t, now);
        } catch (e) {
          this.logger.error(`engine error on ${t.name} (${t.id}): ${(e as Error).message}`);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async advance(
    t: {
      id: string;
      name: string;
      matchDurationSec: number;
      roundsCount: number | null;
      rounds: {
        index: number;
        startAt: Date;
        settledAt: Date | null;
        startNotifiedAt: Date | null;
        matches: { id: string; index: number; state: string; startAt: Date }[];
      }[];
    },
    now: number,
  ) {
    const durationMs = (t.matchDurationSec ?? 300) * 1000;
    const finalIndex = t.roundsCount ?? 1;

    for (const round of t.rounds) {
      if (round.settledAt) continue;

      const startMs = round.startAt.getTime();
      const prev = round.index > 1 ? t.rounds.find((r) => r.index === round.index - 1) : null;
      const reachable = round.index === 1 || prev?.settledAt != null;

      // 1. Announce the round ~10 min before it begins (fixed time — never moved).
      if (!round.startNotifiedAt && now >= startMs - START_SOON_LEAD_SEC * 1000) {
        await this.tournaments.announceRound(t.id, round.index);
      }

      // A round only becomes active once the previous one has fully settled. Later rounds
      // wait their turn — their fixed start time is respected, not brought forward.
      if (!reachable) continue;

      // 2. Seat players as the round nears (advancers from the previous round + any re-buys).
      //    Idempotent, and a near no-op for round 1 (players are seated at registration).
      if (now >= startMs - START_SOON_LEAD_SEC * 1000) {
        await this.tournaments.autoAssignGroups(t.id, round.index);
      }

      // 3. Settle each GROUP the instant its own staggered window ends — groups finish one by
      //    one, not all at once.
      if (round.index === finalIndex) {
        // Final round: settle once the last group's window has closed (pays the Top-10).
        const lastEnd = round.matches.length ? Math.max(...round.matches.map((m) => m.startAt.getTime())) + durationMs : Infinity;
        if (round.matches.length && now >= lastEnd) {
          await this.tournaments.settleFinalGroupRound(SYSTEM, t.id, round.index);
          this.logger.log(`auto-settled ${t.name} FINAL round ${round.index}`);
        }
      } else {
        for (const m of round.matches) {
          if (m.state !== "DONE" && now >= m.startAt.getTime() + durationMs) {
            await this.tournaments.settleGroupMatch(t.id, round.index, m.id);
            this.logger.log(`auto-settled ${t.name} round ${round.index} group ${m.index + 1}`);
          }
        }
        // 4. Once every group in the round is done, lock the round and seat the next one.
        await this.tournaments.finalizeGroupRoundIfComplete(SYSTEM, t.id, round.index);
      }
    }
  }
}
