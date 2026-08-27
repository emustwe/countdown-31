# Active AI Handoff

This is the compact current state. The helper script replaces only the marked block after each substantive task.

<!-- AI-HANDOFF:START -->
## Latest checkpoint

- **Updated:** 2026-08-27 12:40:26 +05:00
- **Outgoing agent:** Codex
- **Status:** completed
- **Branch:** `feat/tournament-campaign-platform`
- **Last verified commit:** `340dab9`
- **Summary:** Committed and pushed the redesigned published tournament campaign arena with sponsor marquee, animated cow, icon controls, cause popover, and mobile More menu.
- **Validation:** Commit 340dab9 created; Targeted ESLint and TypeScript passed; 27 Vitest tests passed; Next.js production build passed; Responsive browser verification passed
- **Exact next action:** Have the user review the live MooMorrow demo; apply only requested visual refinements or continue the next campaign-platform chunk.
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
- Do not restore the removed fake Data URL upload fallback or the removed create-on-read tournament behavior.
