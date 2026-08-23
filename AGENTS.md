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
