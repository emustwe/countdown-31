# Aurora Ways — 5×5 Slot Machine Demo Platform

A local, demo, play-money slot platform. **No real money, no payments** — deposits and
withdrawals move a demo credit balance only. This is an engineering demo built to a real
production bar: server-authoritative outcomes, a double-entry ledger, a pure deterministic
game engine with a Monte-Carlo simulator, byte-for-byte replay, and an admin panel.

## Folder map

```
slot-platform/
├─ docker-compose.yml       # Postgres + Redis for local dev
├─ Backend/                 # NestJS API — self-contained (own package.json)
│  ├─ prisma/               # schema, migrations, seed
│  └─ src/
│     ├─ engine/            # pure game engine + Monte-Carlo simulator — zero framework deps
│     ├─ modules/           # auth, wallet, game, admin, realtime (Socket.IO)
│     └─ common/            # filters, guards, pipes, queue (BullMQ), Prisma service
└─ Frontend/                # Next.js app (player + admin) — self-contained
   └─ src/
      ├─ app/               # routes: auth, lobby, wallet, history, game, admin/*
      ├─ game/              # PixiJS renderer (procedural symbol art, GSAP spin choreography)
      ├─ stores/            # Zustand (auth, settings, game session)
      ├─ lib/                # API client, TanStack Query hooks, hand-mirrored DTO types
      └─ e2e/               # Playwright happy-path test
```

## Architecture — the non-negotiables

1. **Outcome-first / server-authoritative.** The server decides the entire spin outcome —
   base game plus, if triggered, the whole free-spins feature — the instant the player
   spins. The client only animates onto an already-decided result; it never computes or
   influences the outcome.
2. **Atomic + idempotent spin.** Debit → resolve → credit → persist runs inside one
   Postgres transaction with a row lock on the wallet. Every spin/deposit/withdraw carries
   a client-generated idempotency key; a repeated key replays the original stored response
   instead of re-charging.
3. **Double-entry ledger.** `Wallet.cachedBalance` is a read-optimized projection, never
   the source of truth — that's the sum of the wallet's append-only `LedgerEntry` rows.
4. **Integer money.** All money is integer minor units (`BigInt` end to end, including in
   the engine and the API layer). Floats only ever touch money at the UI display edge.
5. **Deterministic reproducibility.** Every spin records the exact RNG values it consumed
   (`rngTrace`). `POST /admin/spins/:id/replay` rebuilds the round byte-for-byte from that
   trace and asserts it matches what was persisted.
6. **RTP is emergent, not configurable.** RTP is a property of a math model's reel-strip
   weights + paytable, verified by the simulator — admins *select* a certified model, they
   never type an RTP number.
7. **Engine purity.** `Backend/src/engine` has zero NestJS/Prisma/HTTP dependencies — only
   plain TypeScript + Node's `crypto`. It can run millions of simulated spins with no
   database or web server involved.
8. **Unbiased sampling.** Reel-strip indices are drawn via rejection sampling
   (`Rng.randomInt`), never `x % n`, so there's no modulo bias even when a strip's length
   doesn't divide 2³².
9. **Persisted round state machine.** A round can span multiple requests (free spins).
   `GameRound.freeSpinsRemaining` is a reveal cursor over an already-fully-resolved
   outcome, not a money-state flag — money settles unconditionally in the transaction that
   creates the round, regardless of how much the client has revealed so far. A disconnected
   client resumes exactly where it left off.
10. **Audit everything money- or config-touching.** Admin balance adjustments, bans, and
    math-model switches all write an append-only `AuditLog` row in the same transaction as
    the mutation they record.

## Running it locally

Two terminals, after a one-time setup:

```bash
# 0. One-time setup
docker compose up -d                      # Postgres + Redis
cd Backend && npm install && npm run db:migrate && npm run db:seed
cd ../Frontend && npm install

# Terminal 1
cd Backend && npm run dev                 # http://localhost:4000, Swagger at /docs

# Terminal 2
cd Frontend && npm run dev                # http://localhost:3000
```

Seeded accounts (see `Backend/prisma/seed.ts`):

| Email | Password | Role |
|---|---|---|
| `admin@auroraways.demo` | `Admin123!` | ADMIN |
| `alice@auroraways.demo` / `bob@...` / `carol@...` | `Player123!` | PLAYER |

Every seeded wallet starts funded via a real `DEPOSIT` ledger entry (never by writing
`cachedBalance` directly) — see `STARTING_DEMO_BALANCE` in `Backend/.env`.

### Tests

```bash
cd Backend && npm test         # 67 tests: engine, RTP convergence, auth/wallet/game/admin integration
cd Frontend && npm test        # unit tests (money formatting, win-highlight logic)
cd Frontend && npm run test:e2e  # Playwright happy path — needs the Backend already running
```

### Simulating / verifying RTP

The simulator is the source of truth for a math model's actual return — never trust the
`targetRtp` field without running it:

```bash
cd Backend
npm run simulate -- --model aurora-ways-96 --spins 20000000
npm run simulate -- --model aurora-ways-96 --spins 20000000 --write   # persists computed stats into the model JSON
```

Prints empirical RTP (base/feature split), hit frequency, max win, and a volatility index.
The three shipped models (`aurora-ways-96/94/92`) land within ~0.3 percentage points of
their targets at 3M simulated spins — see each model's `computed` field in
`Backend/src/engine/models/*.json` for the last recorded run.

**A note on hit frequency:** it's intentionally around 95%, much higher than a classic
3-payline slot. This is structural, not a tuning bug — verified empirically across several
reel-density configurations while tuning these models. With 5 rows checked per reel, 7
paying symbols, and no non-paying "blank" filler symbol in the spec's 9-symbol roster,
*something* reaches its minimum match length almost every spin. A genuinely low hit
frequency would need a dedicated blank symbol, which isn't in the given design.

## How a spin flows through the system

1. **Client** → `POST /game/spin { totalBet, idempotencyKey }` (JWT-authenticated).
2. **GameService** checks the idempotency key, validates the bet against `MIN_BET`/`MAX_BET`,
   and loads the currently active math model from `GameConfig`.
3. Inside **one Postgres transaction**: row-lock the wallet → assert sufficient
   balance → debit the stake (`BET_STAKE` ledger entry) → call the pure
   `resolveSpin(model, totalBet, rng)` → persist the `GameRound` + one `Spin` row per
   step (base + each free spin, all pre-resolved) → credit any win (`BET_WIN` ledger
   entry) → update `cachedBalance` → store the response under the idempotency key.
4. After commit: enqueue a **BullMQ** side-effect job (big-win log, stats rollup) and emit
   a **Socket.IO** `balance` event to any other tab/device watching this account — neither
   can delay or fail the response, since the money is already durably committed.
5. **Client** receives the full result (grid, wins, feature info) and the new balance.
   `rngTrace` and reel-strip weights are never sent to a non-admin client.
6. **PixiJS renderer** choreographs the reel spin onto the already-decided grid (GSAP,
   staggered per-reel stop) and highlights the winning cells. If a feature triggered, the
   client calls `POST /game/free-spin` once per remaining spin to reveal each pre-resolved
   step — a `game-session-store` entry on the client means a page reload resumes revealing
   instead of stranding the round.
7. An admin can later call `POST /admin/spins/:id/replay`, which re-derives the round from
   its stored `rngTrace` via `createTraceRng` and asserts a byte-for-byte match.

## Optional / not built now

- **Email** (Mailpit) and **Sentry**: left off per the Phase-0 intake; both are additive
  and don't require touching existing code to add.
- **Deployment**: this repo is local-first (`docker compose up` + two `npm run dev`
  terminals). A production path (containerize both apps, managed Postgres/Redis, a real
  reverse proxy + TLS in front of the Nest API) is future work, deliberately out of scope
  for this local demo.
- **Leaderboards, promotions, multi-game, additional payment rails**: not built — the
  module boundaries (auth/wallet/game/admin, each with its own Nest module) leave room for
  them without restructuring what's here.
