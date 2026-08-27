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

## D-005 — Tournament sponsor identity owns the game marquee

- **Status:** Active
- **Decision:** During a published campaign, the game marquee becomes the animated sponsor identity plus the 31 badge, with the Count Down 31 cow retained as a small animated mark on its left. No sponsor or idle mascot tile occupies the bottom-left gameplay area; the cow may still appear centrally for an actual defeat.
- **Reason:** Co-branding is prominent without consuming gameplay space or layering two competing animations.

## D-006 — Demo sponsor content is fictional and repeatable

- **Status:** Active
- **Decision:** The acceptance fixture uses MooMorrow Farms and the Play It Forward Cup, clearly labelled as fictional test content.
- **Reason:** The product needs a complete demo without implying a real company endorsement.

## D-007 — Campaign cause content is player-invoked

- **Status:** Active
- **Decision:** A campaign cause is represented by a header icon and its full message appears only in a dismissible popover after the player opens it.
- **Reason:** Cause campaigns remain discoverable and measurable without covering the tournament roster or persistent game controls.

## D-008 — Mobile gameplay is landscape-only

- **Status:** Active
- **Decision:** At widths up to 1180px, both standard and tournament matches use a dedicated landscape shell with the local player on the left, the number deck and primary action in the center, and the opponent on the right. Portrait orientation shows a full-screen rotate prompt instead of a second playable layout. Desktop gameplay remains a separate composition.
- **Reason:** A single landscape touch arena preserves card scale, keeps both players visible, improves thumb reach, and prevents mobile overrides from destabilizing the desktop game.
