# Aurora Ways — 5×5 Slot Machine Demo Platform

Local, demo, play-money slot platform. No real money, no payments — this is an engineering
demo of a server-authoritative slot game with a double-entry ledger, a pure deterministic
game engine, and an admin panel.

Status: environment scaffolded (Phase 0). Application code not yet built.

## Folder map

- `Backend/` — NestJS API (self-contained, own `package.json`)
- `Frontend/` — Next.js app, player + admin (self-contained, own `package.json`)
- `docker-compose.yml` — local Postgres + Redis (+ optional Mailpit, off by default)

Full architecture notes, run instructions, and the RTP-simulation walkthrough will be
filled in as the build progresses through the milestones.
