# Cross-Agent Collaboration Workflow

This workflow keeps Codex, Gemini, and other coding agents synchronized without API keys or shared conversation memory. The repository is the shared brain.

## Shared sources of truth

- `AGENTS.md` — stable project rules that apply to every task.
- `GEMINI.md` — Gemini entry point that routes it to the shared rules.
- `docs/AI_HANDOFF.md` — compact current state and the next concrete action.
- `docs/AI_DECISIONS.md` — durable product and architecture decisions.
- `docs/AI_WORKLOG.md` — short append-only history of completed agent turns.
- Git commits — authoritative record of implemented code.

Do not paste entire chat transcripts into the repository. Record outcomes, evidence, and remaining work instead.

## At the start of every task

1. Read `AGENTS.md`, `docs/AI_HANDOFF.md`, and `docs/AI_DECISIONS.md`.
2. Run `git branch --show-current`, `git status --short`, and `git log -5 --oneline`.
3. Confirm the last verified commit in the handoff exists locally.
4. Separate pre-existing user changes from the files needed for the new task.
5. Continue from the handoff's **Exact next action** unless the newest user request overrides it.

## At the end of every substantive prompt

Run the helper from the repository root:

```powershell
.\scripts\update-ai-handoff.ps1 `
  -Agent "Codex" `
  -Status completed `
  -Summary "Fixed sponsor placement and made the 100-player roster scrollable." `
  -Validation "Typecheck passed", "27 frontend tests passed", "Production build passed" `
  -NextAction "Wait for the user's next tournament UI review."
```

Then:

1. Review the generated handoff and worklog entry.
2. Update `docs/AI_DECISIONS.md` only if a long-lived decision changed.
3. Stage only the task files plus the handoff files.
4. Commit them together with a concise message.
5. Push only when the user asked for a push or the active branch workflow requires it.

Questions or conversations that do not change, validate, or decide project state do not require a repository commit.

## Switching agents

The incoming agent should receive this instruction:

> Continue from the repository state. Read AGENTS.md, docs/AI_HANDOFF.md, and docs/AI_DECISIONS.md first. Inspect the current branch, working tree, and latest five commits. Preserve unrelated files and continue from the exact next action without repeating completed work.

## Concurrency rule

Never let two agents edit the same checkout simultaneously. For parallel work, give each agent a separate Git worktree and branch, validate independently, then merge deliberately.

## Recovery after an unexpected usage cutoff

If an agent stops without updating the handoff:

1. Trust committed Git history first.
2. Inspect the working-tree diff without discarding it.
3. Compare the latest commit with `docs/AI_HANDOFF.md`.
4. Mark uncertain work as unverified.
5. Run the smallest relevant validation before continuing.
6. Update the handoff once the real state is reconstructed.
