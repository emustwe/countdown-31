// Money is always transported as decimal-string minor units (matches the Backend's bigint
// minor-unit convention). 100 minor units = 1 demo credit. Never parse these as JS numbers
// for math — only for display formatting, here at the UI edge.
const MINOR_UNITS_PER_CREDIT = 100n;

export function formatMinorUnits(minorUnits: string): string {
  const value = BigInt(minorUnits);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / MINOR_UNITS_PER_CREDIT;
  const fraction = abs % MINOR_UNITS_PER_CREDIT;
  const formattedWhole = whole.toLocaleString("en-US");
  const sign = negative ? "-" : "";
  return `${sign}${formattedWhole}.${fraction.toString().padStart(2, "0")} credits`;
}

export function creditsToMinorUnits(credits: string): string {
  const trimmed = credits.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter an amount like 100 or 100.50");
  }
  const [wholePart = "0", fractionPart = ""] = trimmed.split(".");
  const paddedFraction = fractionPart.padEnd(2, "0");
  const minorUnits = BigInt(wholePart) * MINOR_UNITS_PER_CREDIT + BigInt(paddedFraction || "0");
  return minorUnits.toString();
}
