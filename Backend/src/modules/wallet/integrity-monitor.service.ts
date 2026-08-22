import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../common/prisma/prisma.service";

// The money canary. Every wallet's cachedBalance MUST equal the sum of its ledger entries — that
// invariant is what makes balance tampering or a buggy money path detectable. This runs a cheap
// aggregate on an interval and loudly reports any wallet where the two have drifted apart, so the
// error stream (e.g. Sentry) catches it immediately instead of during an incident.
@Injectable()
export class IntegrityMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger("IntegrityMonitor");
  private handle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === "test") return; // don't run background timers under tests
    const minutes = Number(this.config.get<string>("RECONCILE_INTERVAL_MIN") ?? "15");
    if (minutes <= 0) return;
    // First pass shortly after boot, then on the interval.
    setTimeout(() => void this.check(), 15_000);
    this.handle = setInterval(() => void this.check(), minutes * 60_000);
  }

  onModuleDestroy(): void {
    if (this.handle) clearInterval(this.handle);
  }

  /** Returns the wallets whose cachedBalance != sum(ledger). Empty array = healthy. */
  async findDrift(): Promise<Array<{ id: string; cachedBalance: string; ledgerSum: string }>> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; cachedBalance: bigint; ledgerSum: bigint }>>`
      SELECT w.id, w."cachedBalance", COALESCE(SUM(l.amount), 0) AS "ledgerSum"
      FROM "Wallet" w
      LEFT JOIN "LedgerEntry" l ON l."walletId" = w.id
      GROUP BY w.id, w."cachedBalance"
      HAVING w."cachedBalance" <> COALESCE(SUM(l.amount), 0)
    `;
    return rows.map((r) => ({ id: r.id, cachedBalance: r.cachedBalance.toString(), ledgerSum: r.ledgerSum.toString() }));
  }

  private async check(): Promise<void> {
    try {
      const drift = await this.findDrift();
      if (drift.length === 0) {
        this.logger.log("Wallet reconciliation OK — all balances match the ledger.");
        return;
      }
      const sample = drift.slice(0, 5).map((d) => `${d.id}: balance=${d.cachedBalance} ledger=${d.ledgerSum}`);
      this.logger.error(`Wallet reconciliation DRIFT: ${drift.length} wallet(s) do not match their ledger. Sample: ${sample.join("; ")}`);
    } catch (err) {
      this.logger.error(`Reconciliation check failed: ${(err as Error).message}`);
    }
  }
}
