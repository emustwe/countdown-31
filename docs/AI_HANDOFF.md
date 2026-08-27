# Active AI Handoff

This is the compact current state. The helper script replaces only the marked block after each substantive task.

<!-- AI-HANDOFF:START -->
## Latest checkpoint

- **Updated:** 2026-08-28 03:41:13 +05:00
- **Outgoing agent:** Codex
- **Status:** completed
- **Branch:** `codex/mobile-landscape-arena-published`
- **Last verified commit:** `2b38a26`
- **Summary:** Published the tournament-platform snapshot with the new landscape-only mobile arena for standard and tournament matches.
- **Validation:** Frontend TypeScript passed; Targeted ESLint passed with zero errors and three pre-existing warnings; Next.js production build passed; Browser QA passed at 844x390, 667x375, and portrait rotate gate
- **Exact next action:** User tests the published landscape branch on a physical phone; merge after the concurrent base-game UI work is ready.
<!-- AI-HANDOFF:END -->

## Stable project state

- Demo tournament: /events/demo-moomorrow-cup
- Admin campaign studio: /admin/tournament/demo-moomorrow-cup/campaign
- Demo sponsor login: moomorrow-demo / DemoSponsor123!
- Frontend: Next.js application under Frontend/
- Backend: NestJS and Prisma application under Backend/
- Local dependencies: PostgreSQL and Redis through Docker
- Sponsor lifecycle: draft -> pending_review -> approved -> active -> completed
- Verification commands:
  - Frontend: 
pm run lint and 
pm run test (or targeted Vitest files)
  - Backend: 
pm test and 
pm run test:e2e
