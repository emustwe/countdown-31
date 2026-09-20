# Production deployment & hardening runbook — Thirty One 31

This project currently runs as a **LAN/dev deployment** (plain HTTP, phones connect over the local
network). The items below make it safe for a **public-internet production** deployment. Nothing here
changes application behavior — it is configuration and operations.

## Already done (in the codebase)
- ✅ **Dependencies patched:** `next` (critical CVE), `multer`, `nodemailer` upgraded; apps rebuilt & tested.
- ✅ **Secrets rotated:** `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CRED_SECRET` regenerated. The
  one still-decryptable encrypted column was re-keyed with `Backend/scripts/rekey-cred-secret.js`
  (round-trip-verified, transactional). Use that same script for any future `CRED_SECRET` rotation:
  `NEW_CRED=$(openssl rand -hex 32) node scripts/rekey-cred-secret.js` then swap `.env` + restart.
- ✅ **Automatic backups:** `scripts/db-backup.sh` (pg_dump, gzip, 14-day retention) runs daily at
  03:00 via the `com.t31.dbbackup` LaunchAgent. Restore with `scripts/db-restore.sh <file>`.
- ✅ **Prod migrations:** `npm run db:deploy` (= `prisma migrate deploy`) — run this on every deploy.
- ✅ **Seed guard:** `prisma/seed.ts` refuses to run under `NODE_ENV=production` (demo creds can't leak in).
- ✅ **Low-risk headers/limits:** Next.js `nosniff` + `Referrer-Policy`; campaign-upload memory cap;
  throttles on sponsor login + public inquiries.

## Deploy-time steps (do these on the production host)

1. **Provision TLS / HTTPS.** Put the app behind the reverse proxy in `Caddyfile.example` (edit the
   domain). Caddy auto-issues + renews a Let's Encrypt cert. DNS → this host first.

2. **Set production env.** Copy `Backend/.env.production.example` → `Backend/.env`, fill real values:
   - `NODE_ENV=production` — enables **secure cookies** (`auth.controller.ts` already sets `secure: isProd`),
     disables the dev OTP-in-response + Swagger `/docs`, and locks CORS to `WEB_ORIGIN` only.
   - `WEB_ORIGIN=https://your-domain` — the real HTTPS origin.
   - Fresh `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `CRED_SECRET` (never reuse git-history values).
   - New `SMTP_PASS` (see step 4).
   > On the current LAN box `NODE_ENV` is intentionally unset so phones can connect over HTTP — do NOT
   > set it here until you are on the real HTTPS domain, or LAN access breaks.

3. **Run migrations, then start:** `npm ci && npm run build && npm run db:deploy && node dist/main.js`
   (front the process with the launchd agents / a supervisor as today).

4. **Rotate the Resend SMTP key** in the Resend dashboard (the old key was on disk / exposed) and put
   the new value in `SMTP_PASS`.

5. **Purge exposed secrets from git history.** The early `.env` commit leaked the old JWT/CRED values.
   They are now rotated (useless), but scrub history before/if the repo is shared:
   `git filter-repo --path Backend/.env --invert-paths` (or BFG), then force-push, then everyone re-clones.

6. **Off-site backups.** The daily dumps are local only. Sync `backups/` to off-host storage
   (S3/rsync) and periodically test `scripts/db-restore.sh` on a scratch DB.

## Optional follow-ups (reported, not applied — would touch behavior)
- Dev-only advisories remain in **test tooling** (`vitest`/`vite` etc.) — not shipped to prod; upgrade needs a major bump.
- Sponsor-subsystem hardening, SVG-inline upload handling, access-token storage, tournament
  race-condition constraints, campaign-body validation — see the security audit; each changes behavior.
