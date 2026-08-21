import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bounded data lifecycle (#18). Old auth/OTP/throttle/audit rows have no long-term value and would
 * otherwise grow without limit, so a daily job prunes them. Money records (ledger, transfers,
 * wallets) are NEVER touched — they are the permanent audit trail.
 */
@Injectable()
export class RetentionService {
  private readonly logger = new Logger("RetentionService");

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanup(): Promise<void> {
    const now = Date.now();
    try {
      const idempotency = await this.prisma.idempotencyKey.deleteMany({ where: { createdAt: { lt: new Date(now - 30 * DAY_MS) } } });
      const resets = await this.prisma.passwordReset.deleteMany({ where: { createdAt: { lt: new Date(now - 7 * DAY_MS) } } });
      const verifications = await this.prisma.emailVerification.deleteMany({ where: { createdAt: { lt: new Date(now - 7 * DAY_MS) } } });
      // Drop throttle rows that are no longer locked and haven't seen a failure in a day.
      const throttles = await this.prisma.authThrottle.deleteMany({
        where: { lastFailAt: { lt: new Date(now - DAY_MS) }, OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date(now) } }] },
      });
      const events = await this.prisma.securityEvent.deleteMany({ where: { createdAt: { lt: new Date(now - 180 * DAY_MS) } } });
      const revokedTokens = await this.prisma.refreshToken.deleteMany({ where: { revokedAt: { not: null, lt: new Date(now - 30 * DAY_MS) } } });
      this.logger.log(
        `retention: idempotency=${idempotency.count} resets=${resets.count} verifications=${verifications.count} throttles=${throttles.count} events=${events.count} tokens=${revokedTokens.count}`,
      );
    } catch (err) {
      this.logger.error(`retention cleanup failed: ${(err as Error).message}`);
    }
  }
}
