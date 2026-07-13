import { Logger } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { PrismaService } from "../../common/prisma/prisma.service";
import { SIDE_EFFECTS_JOBS, SIDE_EFFECTS_QUEUE, type SpinCompletedJobData } from "../../common/queue/queue.constants";

// A win of 20x the stake or more is treated as "big" for the notification side-effect —
// arbitrary but reasonable for a demo; a real deployment would tune this per model.
const BIG_WIN_MULTIPLE = 20n;

/**
 * Runs off the request path — GameService enqueues a job right after committing the
 * spin transaction and returns to the client immediately. Everything here is best-effort
 * bookkeeping (stats, notifications), never money-critical: the ledger/wallet state is
 * already durably committed before this ever runs.
 */
@Processor(SIDE_EFFECTS_QUEUE)
export class SideEffectsProcessor extends WorkerHost {
  private readonly logger = new Logger(SideEffectsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<SpinCompletedJobData>): Promise<void> {
    if (job.name !== SIDE_EFFECTS_JOBS.SPIN_COMPLETED) return;

    const { roundId, userId, totalBet, totalWin } = job.data;
    const bet = BigInt(totalBet);
    const win = BigInt(totalWin);

    if (bet > 0n && win >= bet * BIG_WIN_MULTIPLE) {
      this.logger.log(
        `Big win: user=${userId} round=${roundId} bet=${totalBet} win=${totalWin} (${Number(win) / Number(bet)}x)`,
      );
    }

    // Stats rollup: a minimal aggregate, demonstrating the async-job pattern without
    // introducing a dedicated stats table this demo doesn't otherwise need.
    const spinsToday = await this.prisma.gameRound.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    this.logger.debug(`Stats rollup: ${spinsToday} spins today after round ${roundId}`);
  }
}
