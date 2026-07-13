import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSecureRng } from "../rng";
import { getMathModel } from "../models";
import { runSimulation } from "./simulate";

interface CliArgs {
  model: string;
  spins: number;
  bet: bigint;
  write: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  let model = "aurora-ways-96";
  let spins = 1_000_000;
  let bet = 1000n;
  let write = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--model") model = argv[++i] ?? model;
    else if (arg === "--spins") spins = Number(argv[++i]);
    else if (arg === "--bet") bet = BigInt(argv[++i] ?? "1000");
    else if (arg === "--write") write = true;
  }

  return { model, spins, bet, write };
}

function formatPercent(x: number): string {
  return `${(x * 100).toFixed(3)}%`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const model = getMathModel(args.model);

  console.log(
    `Simulating ${args.spins.toLocaleString()} spins of "${model.displayName}" at bet=${args.bet}...`,
  );

  const rng = createSecureRng();
  const startTime = Date.now();
  const result = runSimulation(model, args.spins, args.bet, rng);
  const elapsedSec = (Date.now() - startTime) / 1000;

  console.log("");
  console.log(`Spins:                 ${result.spins.toLocaleString()}`);
  console.log(`Total staked:          ${result.totalStaked.toString()}`);
  console.log(`Total returned:        ${result.totalReturned.toString()}`);
  console.log(`  base:                ${result.totalReturnedBase.toString()}`);
  console.log(`  feature:             ${result.totalReturnedFeature.toString()}`);
  console.log(
    `Empirical RTP total:   ${formatPercent(result.empiricalRtpTotal)} (target ${formatPercent(model.targetRtp)})`,
  );
  console.log(`  base RTP:            ${formatPercent(result.empiricalRtpBase)}`);
  console.log(`  feature RTP:         ${formatPercent(result.empiricalRtpFeature)}`);
  console.log(`Hit frequency:         ${formatPercent(result.hitFrequency)}`);
  console.log(`Feature hit frequency: ${formatPercent(result.featureHitFrequency)}`);
  console.log(`Max win:               ${result.maxWin.toString()}`);
  console.log(`Volatility index:      ${result.volatilityIndex.toFixed(3)}`);
  console.log(
    `Elapsed:               ${elapsedSec.toFixed(1)}s (${Math.round(result.spins / elapsedSec).toLocaleString()} spins/sec)`,
  );

  if (args.write) {
    const filePath = join(__dirname, "..", "models", `${model.id}.json`);
    const raw = JSON.parse(readFileSync(filePath, "utf-8"));
    raw.computed = {
      theoreticalRtpBase: result.empiricalRtpBase,
      empiricalRtpTotal: result.empiricalRtpTotal,
      hitFrequency: result.hitFrequency,
      volatilityIndex: result.volatilityIndex,
      simSpins: result.spins,
    };
    writeFileSync(filePath, `${JSON.stringify(raw, null, 2)}\n`);
    console.log(`\nWrote computed stats to ${filePath}`);
  }
}

main();
