import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

// Reversible encryption-at-rest for low-sensitivity secrets that an admin must be able to read back
// (e.g. sponsor passwords, which the admin issues and manages). This is NOT for user passwords —
// those stay one-way hashed. A DB dump alone can't reveal these without the server key.
function key(): Buffer {
  const secret = process.env.CRED_SECRET || process.env.JWT_ACCESS_SECRET || "dev-only-cred-secret";
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
