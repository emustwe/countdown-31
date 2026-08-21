import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

// Records security-relevant events to the append-only SecurityEvent trail. Fire-and-forget: a
// logging failure must never break the user's request, so errors are swallowed (and warned).
@Injectable()
export class AuditService {
  private readonly logger = new Logger("Audit");

  constructor(private readonly prisma: PrismaService) {}

  record(action: string, opts: { actor?: string; detail?: Record<string, unknown>; ip?: string } = {}): void {
    void this.prisma.securityEvent
      .create({
        data: {
          action,
          actor: opts.actor ?? "system",
          detail: (opts.detail ?? {}) as object,
          ip: opts.ip,
        },
      })
      .catch((err: unknown) => this.logger.warn(`Failed to record security event ${action}: ${(err as Error).message}`));
  }
}
