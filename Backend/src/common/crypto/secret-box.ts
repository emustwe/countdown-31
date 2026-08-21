import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Reversible encryption-at-rest for low-sensitivity secrets that an admin must be able to read back
// (e.g. sponsor passwords, which the admin issues and manages). This is NOT for user passwords —
// those stay one-way hashed. A DB dump alone can't reveal these without the server key.
function key(): Buffer {
  // A dedicated key, required — no hardcoded fallback and no reuse of the JWT secret. If it's
  // missing the app must fail rather than silently encrypt with a guessable/shared key.
  const secret = process.env.CRED_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("CRED_SECRET is not set (or too short). Set a strong, unique CRED_SECRET.");
  }
  return createHash("sha256").update(secret).digest(); // 32 bytes for AES-256
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}

export function decryptSecret(token: string | null | undefined): string {
  if (!token) return "";
  try {
    const [ivB, tagB, encB] = token.split(".");
    if (!ivB || !tagB || !encB) return "";
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"));
    decipher.setAuthTag(Buffer.from(tagB, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(encB, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
