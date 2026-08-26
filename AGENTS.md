# Agent Autonomy & Execution Guidelines

## 1. Autonomous Execution
- Proactively run terminal commands (PowerShell, Git, Docker, npm, build tools, etc.) without pausing to ask unnecessary permissions or confirmations.
- Execute changes, inspect results, run builds/tests, and debug errors end-to-end independently.
- Avoid asking trivial questions when the intent or standard procedure is clear.

## 2. Git & Version Control
- Perform git operations (status, diff, branch, checkout, commit, push, pull) directly using standard git commands.
- Keep commit messages concise, descriptive, and aligned with project conventions.

## 3. Project Context: Countdown 31
- Target repository: emustwe/countdown-31
- Architecture: Frontend (Next.js / React / Tailwind) and Backend (NestJS / Prisma / Docker services like PostgreSQL & Redis).

## 4. Cross-Agent Continuity
- Before changing project files, read `docs/AI_HANDOFF.md` and `docs/AI_DECISIONS.md`, then inspect the current branch, `git status`, and recent commits.
- Treat the repository and Git history as the shared memory between Codex, Gemini, and any future coding agent. Never rely on another provider's chat transcript being available.
- Only one agent may write to a checkout at a time. Use a separate branch or Git worktree for concurrent work.
- After every substantive user request that changes, validates, or decides project state, run `scripts/update-ai-handoff.ps1` with a concise summary, validation evidence, and exact next action.
- Include `docs/AI_HANDOFF.md` and `docs/AI_WORKLOG.md` in the same commit as the task they describe. Update `docs/AI_DECISIONS.md` only when a durable product or architecture decision changes.
- Never stage unrelated user files. List any pre-existing dirty or untracked paths in the handoff and preserve them.
- Before yielding a task, leave the repository at a safe checkpoint: relevant validation run, task files committed when authorized, handoff current, and no undocumented partial work.
