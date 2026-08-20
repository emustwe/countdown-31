// Wallet money is USDT (on Solana), transported as decimal-string base units to match the
// Backend's bigint convention: 1 USDT = 1_000_000 base units (6 decimals). Never parse these
// as JS numbers for math — only for display formatting, here at the UI edge.
const BASE_UNITS_PER_USDT = 1_000_000n;

/** Formats USDT base units for display, e.g. "1,234.56 USDT" (2 decimals). Storage keeps
 * full 6-decimal precision; this rounds only for display. */
export function formatUsdt(baseUnits: string): string {
  const value = BigInt(baseUnits);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const dollars = Number(abs) / Number(BASE_UNITS_PER_USDT);
  const sign = negative ? "-" : "";
  return `${sign}${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
}

/** Parses a USDT amount (e.g. "25" or "10.5" or "0.000001") into a base-unit string.
 * Accepts up to 6 decimal places. */
export function parseUsdt(amount: string): string {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new Error("Enter a USDT amount like 25 or 10.5 (up to 6 decimals)");
  }
  const [wholePart = "0", fractionPart = ""] = trimmed.split(".");
  const paddedFraction = fractionPart.padEnd(6, "0");
  const baseUnits = BigInt(wholePart) * BASE_UNITS_PER_USDT + BigInt(paddedFraction || "0");
  return baseUnits.toString();
}

export { BASE_UNITS_PER_USDT };
