import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const MAX_FAILURES = 8; // failures within the window before a temporary lock
const WINDOW_MS = 15 * 60 * 1000; // failures older than this reset the counter
const LOCK_MS = 5 * 60 * 1000; // how long the lock lasts once tripped

export type ThrottleScope = "user" | "sponsor";

/**
 * DB-backed, per-account failed-login limiter shared by every login surface (player + sponsor).
 *
 * Because the state lives in Postgres (not process memory), the lock is global across instances and
 * survives a restart — a credential-stuffing run can't reset its budget by hopping instances or
 * waiting for a redeploy. Keyed by (scope, identifier) so a player and a sponsor with the same
 * string never collide.
 */
@Injectable()
export class AuthThrottleService {
  constructor(private readonly prisma: PrismaService) {}

  private norm(identifier: string): string {
    return (identifier || "").trim().toLowerCase();
  }

  /** Throw if this identifier is currently locked out. Call before verifying a password. */
  async assertNotLocked(scope: ThrottleScope, identifier: string): Promise<void> {
    const rec = await this.prisma.authThrottle.findUnique({
      where: { scope_identifier: { scope, identifier: this.norm(identifier) } },
    });
    if (rec?.lockedUntil && rec.lockedUntil.getTime() > Date.now()) {
      throw new ForbiddenException("Too many failed attempts. Please wait a few minutes and try again.");
    }
  }

  /** Record a failed attempt; trips the lock once the threshold is reached within the window. */
  async recordFailure(scope: ThrottleScope, identifier: string): Promise<void> {
    const id = this.norm(identifier);
    const now = new Date();
    const rec = await this.prisma.authThrottle.findUnique({ where: { scope_identifier: { scope, identifier: id } } });
    const withinWindow = rec ? now.getTime() - rec.lastFailAt.getTime() < WINDOW_MS : false;
    const failCount = withinWindow ? rec!.failCount + 1 : 1;
    const lockedUntil = failCount >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null;
    await this.prisma.authThrottle.upsert({
      where: { scope_identifier: { scope, identifier: id } },
      create: { scope, identifier: id, failCount, lastFailAt: now, lockedUntil },
      update: { failCount, lastFailAt: now, lockedUntil },
    });
  }

  /** Clear the counter after a successful login. */
  async recordSuccess(scope: ThrottleScope, identifier: string): Promise<void> {
    await this.prisma.authThrottle
      .delete({ where: { scope_identifier: { scope, identifier: this.norm(identifier) } } })
      .catch(() => undefined); // nothing to clear is fine
  }
}
