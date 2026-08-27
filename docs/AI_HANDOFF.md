# Active AI Handoff

This is the compact current state. The helper script replaces only the marked block after each substantive task.

<!-- AI-HANDOFF:START -->
## Latest checkpoint

- **Updated:** 2026-08-28 03:28:46 +05:00
- **Outgoing agent:** Codex
- **Status:** completed
- **Branch:** `codex/mobile-landscape-arena`
- **Last verified commit:** `3bf8f71`
- **Summary:** Replaced the portrait mobile match with a dedicated landscape-only arena for standard and tournament games: local player left, three-card deck and action center, opponent right, compact header controls, landscape defeat flow, and a clean portrait rotate gate.
- **Validation:** Frontend TypeScript passed with --incremental false; Targeted ESLint found zero errors; three pre-existing unused-item warnings remain; Next.js production build passed with webpack; Browser QA passed at 844x390 and 667x375 with zero document overflow; MooMorrow tournament sponsor header and cause popover verified; Portrait 390x844 rotate gate verified
- **Exact next action:** Have the user test codex/mobile-landscape-arena on a physical phone; then merge or cherry-pick after the concurrent base-game branch is ready.
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
