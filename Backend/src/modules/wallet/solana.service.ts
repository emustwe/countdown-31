import { readFileSync } from "node:fs";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

// @solana/spl-token ships as ESM with a CJS build under its "require" export condition.
// TypeScript's classic module resolution can't statically import it, so we require it at
// runtime (Node resolves the CJS entry) and type just the three functions we use.
interface SplToken {
  getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey): Promise<PublicKey>;
  getOrCreateAssociatedTokenAccount(conn: Connection, payer: Keypair, mint: PublicKey, owner: PublicKey): Promise<{ address: PublicKey }>;
  transfer(conn: Connection, payer: Keypair, source: PublicKey, dest: PublicKey, owner: Keypair, amount: bigint | number): Promise<string>;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, transfer } = require("@solana/spl-token") as SplToken;

export interface IncomingTransfer {
  signature: string;
  amount: string; // USDT base units (6 dp)
}

/** Thin wrapper over the Solana devnet chain for the USDT wallet: sends real USDT for
 * withdrawals and detects real incoming USDT for deposits. When SOLANA_LIVE isn't "true"
 * (or under tests) it is inert and the wallet falls back to the instant-mock flow. */
@Injectable()
export class SolanaService {
  private readonly logger = new Logger(SolanaService.name);
  private _conn: Connection | null = null;
  private _treasury: Keypair | null = null;

  constructor(private readonly config: ConfigService) {}

  get isLive(): boolean {
    return this.config.get<string>("SOLANA_LIVE") === "true" && process.env.NODE_ENV !== "test";
  }

  private conn(): Connection {
    if (!this._conn) this._conn = new Connection(this.config.getOrThrow<string>("SOLANA_RPC_URL"), "confirmed");
    return this._conn;
  }

  private mint(): PublicKey {
    return new PublicKey(this.config.getOrThrow<string>("USDT_MINT"));
  }

  private treasury(): Keypair {
    if (!this._treasury) {
      const path = this.config.getOrThrow<string>("SOLANA_TREASURY_KEYPAIR");
      this._treasury = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8"))));
    }
    return this._treasury;
  }

  /** The treasury's on-chain USDT balance in base units (for reconciliation/monitoring). */
  async treasuryUsdtBalance(): Promise<bigint> {
    const ata = await getAssociatedTokenAddress(this.mint(), this.treasury().publicKey);
    try {
      const bal = await this.conn().getTokenAccountBalance(ata);
      return BigInt(bal.value.amount);
    } catch {
      return 0n;
    }
  }

  /** Send USDT from the treasury to an external address (withdrawal payout). Creates the
   * recipient's token account if needed. Returns the confirmed transaction signature. */
  async sendUsdt(toAddress: string, baseUnits: bigint): Promise<string> {
    const conn = this.conn();
    const treasury = this.treasury();
    const mint = this.mint();
    const to = new PublicKey(toAddress);
    const fromAta = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, treasury.publicKey);
    const toAta = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, to);
    const sig = await transfer(conn, treasury, fromAta.address, toAta.address, treasury, baseUnits);
    await conn.confirmTransaction(sig, "confirmed");
    this.logger.log(`Sent ${baseUnits} USDT base units to ${toAddress} — ${sig}`);
    return sig;
  }

  /** Find recent USDT transfers INTO the treasury sent by `fromAddress` (deposit detection).
   * Returns each transfer's signature + amount so the caller can credit uncredited ones. */
  async findIncomingTransfers(fromAddress: string, limit = 20): Promise<IncomingTransfer[]> {
    const conn = this.conn();
    const mint = this.mint();
    const treasuryAta = (await getAssociatedTokenAddress(mint, this.treasury().publicKey)).toBase58();
    // An SPL transfer names the sender by their token account, not their wallet, so derive
    // the sender's associated token account from the wallet address and match on that too.
    const senderAta = (await getAssociatedTokenAddress(mint, new PublicKey(fromAddress))).toBase58();
    const sigs = await conn.getSignaturesForAddress(new PublicKey(treasuryAta), { limit });
    const out: IncomingTransfer[] = [];
    for (const s of sigs) {
      if (s.err) continue;
      try {
        const tx = await conn.getParsedTransaction(s.signature, { maxSupportedTransactionVersion: 0 });
        const instrs = tx?.transaction.message.instructions ?? [];
        for (const ix of instrs) {
          const p = (ix as { program?: string; parsed?: { type?: string; info?: Record<string, unknown> } }).parsed;
          if (!p || (p.type !== "transfer" && p.type !== "transferChecked")) continue;
          const info = p.info ?? {};
          if (info.destination !== treasuryAta) continue;
          // Sender identified either by the signing wallet (authority) or by its token account (source).
          if (info.authority !== fromAddress && info.source !== fromAddress && info.source !== senderAta) continue;
          const amount = (info.amount as string) ?? (info.tokenAmount as { amount?: string })?.amount;
          if (amount) out.push({ signature: s.signature, amount: String(amount) });
        }
      } catch {
        /* skip unparseable tx */
      }
    }
    return out;
  }
}
