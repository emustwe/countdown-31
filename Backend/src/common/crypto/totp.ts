import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// RFC 6238 TOTP (SHA-1, 6 digits, 30s step) implemented on node crypto so we don't pull in a
// dependency. Compatible with Google Authenticator, Authy, 1Password, etc.

const STEP_SECONDS = 30;
const DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Generate a fresh base32 TOTP secret (160 bits). */
export function generateTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/=+$/, "").replace(/\s/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function codeForCounter(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** The current 6-digit code for a secret. Exposed mainly for tests; the client never needs it. */
export function totpCode(secret: string, now: number = clockNow()): string {
  return codeForCounter(secret, Math.floor(now / 1000 / STEP_SECONDS));
}

/** Verify a user-supplied 6-digit code, allowing ±1 step of clock drift. `now` is injectable for tests. */
export function verifyTotp(secret: string, token: string, now: number = clockNow()): boolean {
  const clean = (token || "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  const counter = Math.floor(now / 1000 / STEP_SECONDS);
  for (let w = -1; w <= 1; w++) {
    const expected = codeForCounter(secret, counter + w);
    const a = Buffer.from(expected);
    const b = Buffer.from(clean);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

/** otpauth:// URI for QR provisioning. */
export function totpAuthUri(secret: string, account: string, issuer = "WM Tournaments"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// Date.now via an isolated hop so the rest of the module stays pure/testable.
function clockNow(): number {
  return Date.now();
}
