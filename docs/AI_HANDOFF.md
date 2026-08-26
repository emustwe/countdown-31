# Active AI Handoff

This is the compact current state. The helper script replaces only the marked block after each substantive task.

<!-- AI-HANDOFF:START -->
## Latest checkpoint

- **Updated:** 2026-08-26 14:55:09 +05:00
- **Outgoing agent:** Codex
- **Status:** completed
- **Branch:** `feat/tournament-campaign-platform`
- **Last verified commit:** `9545119`
- **Summary:** Created the persistent Codex and Gemini repository handoff workflow and prepared the dedicated tournament campaign branch.
- **Validation:** Handoff helper executed successfully; Protected unrelated working-tree files; Branch created from verified tournament commit 9545119
- **Exact next action:** Continue with the user's next tournament campaign requirement on this branch.
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
- `countdown31-tournament-sponsor-platform-plan.pdf`

## Recovery notes

- The dedicated tournament branch was created from commit `9545119` on the earlier `feat/admin-panel-and-game-studio-overhaul` branch.
- The Tailscale Funnel configuration maps the public root to frontend port 3000 and port 8443 to backend port 4000, but local services must be running after a reboot.
- Do not restore the removed fake Data URL upload fallback or the removed create-on-read tournament behavior.
