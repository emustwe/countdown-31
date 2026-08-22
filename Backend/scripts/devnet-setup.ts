/**
 * One-time DEVNET setup for the USDT/Solana wallet integration.
 *
 * Creates (idempotently) the platform treasury keypair, funds it from the devnet faucet,
 * mints a test "USDT" SPL token (6 decimals — mirrors real USDT), gives the treasury an
 * operating float, and airdrops test USDT to a player address so they can try a real
 * deposit. Prints the values to put in .env. Devnet only — worthless test tokens.
 *
 * Run: npx tsx scripts/devnet-setup.ts <playerSolanaAddress>
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

const RPC = process.env.SOLANA_RPC_URL || clusterApiUrl("devnet");
const TREASURY_FILE = "secrets/devnet-treasury.json";
const MINT_FILE = "secrets/devnet-usdt-mint.json";
const USDT = 1_000_000n; // 6 decimals
const TREASURY_FLOAT = 100_000n * USDT; // 100,000 test USDT
const PLAYER_GRANT = 500n * USDT; // 500 test USDT to the player

function loadOrCreateTreasury(): Keypair {
  if (existsSync(TREASURY_FILE)) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(TREASURY_FILE, "utf8"))));
  }
  const kp = Keypair.generate();
  writeFileSync(TREASURY_FILE, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

async function ensureSol(conn: Connection, kp: Keypair, minSol: number) {
  const bal = await conn.getBalance(kp.publicKey);
  if (bal >= minSol * LAMPORTS_PER_SOL) return;
  for (let i = 0; i < 3; i++) {
    try {
      const sig = await conn.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, "confirmed");
      const b = await conn.getBalance(kp.publicKey);
      if (b >= minSol * LAMPORTS_PER_SOL) return;
    } catch (e) {
      console.log(`  airdrop attempt ${i + 1} failed, retrying…`, (e as Error).message.slice(0, 80));
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Could not fund treasury from the devnet faucet (rate-limited). Try again in a minute.");
}

async function main() {
  const playerAddr = process.argv[2];
  if (!playerAddr) throw new Error("Usage: tsx scripts/devnet-setup.ts <playerSolanaAddress>");
  const player = new PublicKey(playerAddr);

  const conn = new Connection(RPC, "confirmed");
  const treasury = loadOrCreateTreasury();
  console.log("Treasury address:", treasury.publicKey.toBase58());

  console.log("Funding treasury with devnet SOL…");
  await ensureSol(conn, treasury, 1);
  console.log("  SOL balance:", (await conn.getBalance(treasury.publicKey)) / LAMPORTS_PER_SOL);

  // Test USDT mint (reuse if already created).
  let mint: PublicKey;
  if (existsSync(MINT_FILE)) {
    mint = new PublicKey(JSON.parse(readFileSync(MINT_FILE, "utf8")).mint);
    console.log("Reusing test USDT mint:", mint.toBase58());
  } else {
    console.log("Creating test USDT mint (6 decimals)…");
    mint = await createMint(conn, treasury, treasury.publicKey, null, 6);
    writeFileSync(MINT_FILE, JSON.stringify({ mint: mint.toBase58() }));
    console.log("  mint:", mint.toBase58());
  }

  // Treasury float.
  console.log("Minting treasury float…");
  const treasuryAta = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, treasury.publicKey);
  await mintTo(conn, treasury, mint, treasuryAta.address, treasury, TREASURY_FLOAT);
  console.log("  treasury USDT:", (Number((await conn.getTokenAccountBalance(treasuryAta.address)).value.amount) / 1e6).toLocaleString());

  // Player grant so they can try a real deposit.
  console.log("Airdropping test USDT to the player…");
  const playerAta = await getOrCreateAssociatedTokenAccount(conn, treasury, mint, player);
  await mintTo(conn, treasury, mint, playerAta.address, treasury, PLAYER_GRANT);
  const playerBal = Number((await conn.getTokenAccountBalance(playerAta.address)).value.amount) / 1e6;
  console.log("  player USDT:", playerBal.toLocaleString());

  console.log("\n=== Put these in Backend/.env ===");
  console.log(`SOLANA_RPC_URL="${RPC}"`);
  console.log(`SOLANA_TREASURY_ADDRESS="${treasury.publicKey.toBase58()}"`);
  console.log(`USDT_MINT="${mint.toBase58()}"`);
  console.log(`SOLANA_TREASURY_KEYPAIR="${TREASURY_FILE}"`);
  console.log(`\nPlayer token account: ${playerAta.address.toBase58()}`);
  console.log(`Explorer (player): https://explorer.solana.com/address/${player.toBase58()}/tokens?cluster=devnet`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
