# AI Decision Register

Only durable decisions belong here. Turn-by-turn activity belongs in `AI_WORKLOG.md`.

## D-001 — Repository-backed agent memory

- **Status:** Active
- **Decision:** Git history, `AGENTS.md`, and the files under `docs/AI_*` are the provider-neutral source of truth for agent continuity.
- **Reason:** Codex and Gemini do not share conversation memory in the current no-API workflow.

## D-002 — Single writer per checkout

- **Status:** Active
- **Decision:** Only one coding agent edits a checkout at a time. Concurrent agents require separate branches and worktrees.
- **Reason:** This prevents silent overwrites and makes each agent's changes reviewable.

## D-003 — Sponsor campaigns cannot alter gameplay

- **Status:** Active
- **Decision:** Tournament campaigns may change approved presentation surfaces, but not the number deck, avatar identity, player controls, timers, skills, scoring, or win/loss rules.
- **Reason:** Sponsorship must remain modular advertising rather than a gameplay fork.

## D-004 — Published revisions are the only public campaign source

- **Status:** Active
- **Decision:** The live tournament uses only an approved, published, active campaign revision. Drafts and review revisions never appear publicly.
- **Reason:** This preserves the Brand and Safety approval gates and reliable rollback.

## D-005 — Tournament sponsor placement owns the idle mascot slot

- **Status:** Active
- **Decision:** When a tournament campaign enables its animated sponsor tile, the ordinary idle corner mascot is suppressed. The cow may still appear centrally for an actual defeat.
- **Reason:** Sponsor media must not be obscured while gameplay feedback remains intact.

## D-006 — Demo sponsor content is fictional and repeatable

- **Status:** Active
- **Decision:** The acceptance fixture uses MooMorrow Farms and the Play It Forward Cup, clearly labelled as fictional test content.
- **Reason:** The product needs a complete demo without implying a real company endorsement.
