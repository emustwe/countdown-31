# Active AI Handoff

This is the compact current state. The helper script replaces only the marked block after each substantive task.

<!-- AI-HANDOFF:START -->
## Latest checkpoint

- **Updated:** 2026-08-27 13:17:26 +05:00
- **Outgoing agent:** Codex
- **Status:** completed
- **Branch:** `feat/tournament-campaign-platform`
- **Last verified commit:** `eca8fd9`
- **Summary:** Restored the complete MooMorrow demo stack after the laptop crash, reconciled the already-current Prisma schema with its stale migration ledger, and verified both localhost and Tailscale Funnel routes.
- **Validation:** PostgreSQL healthy on 5432; Redis healthy on 6379; NestJS listening on 4000; Next.js listening on 3000; Prisma migration status up to date; Local MooMorrow campaign revision 4 returned successfully; Public Tailscale frontend and campaign API returned HTTP 200
- **Exact next action:** User can test the MooMorrow fixture at /events/demo-moomorrow-cup locally or through the active Tailscale Funnel.
<!-- AI-HANDOFF:END -->

## Stable project state

- Demo tournament: `/events/demo-moomorrow-cup`
- Admin campaign studio: `/admin/tournament/demo-moomorrow-cup/campaign`
- Demo sponsor login: `moomorrow-demo` / `DemoSponsor123!`
- Frontend: Next.js application under `Frontend/`
- Backend: NestJS and Prisma application under `Backend/`
- Local dependencies: PostgreSQL and Redis through Docker
- Sponsor lifecycle: draft → Brand and Safety review → approved → published
- Public runtime reads only approved, published campaign revisions.

## Preserve these unrelated working-tree paths

These files existed outside the tournament task and must not be staged or removed without an explicit user request:

- `Frontend/next-env.d.ts`
- `Frontend/tsconfig.tsbuildinfo`
- `Frontend/UI assets/0825.mov`
- `Frontend/test-results/`
- `Frontend/Frontend.zip`
- `Frontend/Frontend 8-27-2026.zip`
- `countdown31-tournament-sponsor-platform-plan.pdf`

## Recovery notes

- The dedicated tournament branch was created from commit `9545119` on the earlier `feat/admin-panel-and-game-studio-overhaul` branch.
- The Tailscale Funnel configuration maps the public root to frontend port 3000 and port 8443 to backend port 4000, but local services must be running after a reboot.
- On 2026-08-27, Prisma reported an old failed initial migration although the live schema matched `prisma/schema.prisma` exactly. An empty schema diff was verified, then all existing migrations were recorded as applied; `prisma migrate status` now reports the database up to date.
- Do not restore the removed fake Data URL upload fallback or the removed create-on-read tournament behavior.
