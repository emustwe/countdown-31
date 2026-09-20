// Safely rotate CRED_SECRET: re-encrypt every AES-256-GCM column (user.mfaSecret, sponsor.passwordEnc)
// from the OLD key to a NEW key so the decrypted values are IDENTICAL — MFA logins and admin
// password-readback keep working exactly as before. Every row is round-trip-verified against the NEW
// key BEFORE anything is written, and all updates run in a single transaction (all-or-nothing).
//
//   OLD_CRED=<current> NEW_CRED=<new> node scripts/rekey-cred-secret.js
//
// Secrets are read from env only; nothing is printed. Mirrors src/common/crypto/secret-box.ts.
const { PrismaClient } = require("@prisma/client");
const { createCipheriv, createDecipheriv, createHash, randomBytes } = require("node:crypto");
const prisma = new PrismaClient();

const keyOf = (s) => createHash("sha256").update(s).digest();
function enc(plain, secret) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", keyOf(secret), iv);
  const e = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return `${iv.toString("base64")}.${c.getAuthTag().toString("base64")}.${e.toString("base64")}`;
}
function dec(token, secret) {
  const [i, t, e] = String(token).split(".");
  const d = createDecipheriv("aes-256-gcm", keyOf(secret), Buffer.from(i, "base64"));
  d.setAuthTag(Buffer.from(t, "base64"));
  return Buffer.concat([d.update(Buffer.from(e, "base64")), d.final()]).toString("utf8");
}

// OLD defaults to the current .env value (loaded exactly like the app does), so it always matches.
try { require("dotenv").config(); } catch {}
const OLD = process.env.OLD_CRED || process.env.CRED_SECRET;
const NEW = process.env.NEW_CRED;
if (!OLD || !NEW || NEW.length < 16) throw new Error("current CRED_SECRET and a strong NEW_CRED are required");

async function main() {
  const users = await prisma.user.findMany({ where: { mfaSecret: { not: null } }, select: { id: true, mfaSecret: true } });
  const sponsors = await prisma.sponsor.findMany({ where: { passwordEnc: { not: null } }, select: { id: true, passwordEnc: true } });
  // Rows that don't decrypt with OLD are ALREADY orphaned (the app already returns "" for them, and
  // rotating leaves them exactly that — undecryptable). We SKIP those and re-key only live rows, so
  // behavior is identical after rotation. Every re-key is round-trip-verified before it's queued.
  const ops = [];
  let uSkip = 0, sSkip = 0;
  for (const u of users) {
    let plain;
    try { plain = dec(u.mfaSecret, OLD); } catch { uSkip++; continue; }
    const re = enc(plain, NEW);
    if (dec(re, NEW) !== plain) throw new Error(`round-trip mismatch: user ${u.id}`);
    ops.push(prisma.user.update({ where: { id: u.id }, data: { mfaSecret: re } }));
  }
  for (const s of sponsors) {
    let plain;
    try { plain = dec(s.passwordEnc, OLD); } catch { sSkip++; continue; }
    const re = enc(plain, NEW);
    if (dec(re, NEW) !== plain) throw new Error(`round-trip mismatch: sponsor ${s.id}`);
    ops.push(prisma.sponsor.update({ where: { id: s.id }, data: { passwordEnc: re } }));
  }
  await prisma.$transaction(ops);
  console.log(`rekeyed OK — mfaSecret: ${users.length - uSkip} re-keyed, ${uSkip} orphaned/skipped; passwordEnc: ${sponsors.length - sSkip} re-keyed, ${sSkip} orphaned/skipped`);
}
main().catch((e) => { console.error("REKEY FAILED (no changes committed):", e.message); process.exit(1); }).finally(() => prisma.$disconnect());
