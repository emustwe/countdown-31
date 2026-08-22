import { createHash } from "node:crypto";

const MIN_LENGTH = 10;

// A small blocklist of the most common/obvious passwords. Not a substitute for the optional HIBP
// check below, just a cheap first gate that rejects the worst offenders offline.
const COMMON = new Set([
  "password", "password1", "password123", "12345678", "123456789", "1234567890",
  "qwerty123", "qwertyuiop", "111111111", "letmein123", "admin123", "welcome123",
  "iloveyou1", "abc123456", "changeme1", "passw0rd", "trustno1", "sunshine1",
]);

/** Thrown (message) when a password is too weak. The caller maps this to a 4xx. */
export function passwordPolicyError(password: string): string | null {
  const pw = password ?? "";
  if (pw.length < MIN_LENGTH) return `Password must be at least ${MIN_LENGTH} characters`;
  if (pw.length > 200) return "Password is too long";
  // Require a mix so a long run of one character class doesn't pass.
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter((re) => re.test(pw)).length;
  if (classes < 3) return "Use a mix of upper- and lower-case letters, numbers, and symbols";
  if (/^(.)\1+$/.test(pw)) return "Password must not be a single repeated character";
  if (COMMON.has(pw.toLowerCase())) return "This password is too common — choose another";
  return null;
}

/**
 * Optional online breach check against Have I Been Pwned's k-anonymity range API. Only runs when
 * PASSWORD_HIBP_CHECK=true (it makes an outbound HTTPS call, so it's opt-in). Only the first 5 chars
 * of the SHA-1 hash ever leave the process; the full password/hash never does. Fails OPEN (returns
 * false) on any network error so a HIBP outage can't lock out sign-ups.
 */
export async function isBreachedPassword(password: string): Promise<boolean> {
  if (process.env.PASSWORD_HIBP_CHECK !== "true") return false;
  try {
    const sha1 = createHash("sha1").update(password).digest("hex").toUpperCase();
    const prefix = sha1.slice(0, 5);
    const suffix = sha1.slice(5);
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { "Add-Padding": "true" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const body = await res.text();
    return body.split("\n").some((line) => line.split(":")[0]?.trim().toUpperCase() === suffix);
  } catch {
    return false;
  }
}
