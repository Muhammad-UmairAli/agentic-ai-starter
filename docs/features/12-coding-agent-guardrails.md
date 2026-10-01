# 12 · Coding-agent guardrails

## 1. Purpose
Keep AI coding agents (local and in CI) inside the project's rules: the right package manager, no secrets, no force-pushes, quality checks actually run, and conventions followed. People and agents should share one set of instructions.

## 2. Status in this sample
Implemented: `AGENTS.md` (rules; `CLAUDE.md` imports it), `.claude/settings.json` (permissions and hooks), `.claude/hooks/*.sh`, `.claude/skills/*`, `.mcp.json`.

## 3. Components
| Component | What it does |
|---|---|
| **`AGENTS.md`** | The single source of project rules: stack, commands, AI rules, logging, fail-closed, files not to touch, commit convention. Editor-specific files point here instead of duplicating it |
| **Permission deny rules** | Block reading or editing `.env`, `.env.local`, `.env.*.local`; block force-push and pushing to `main` |
| **PreToolUse hook `package-manager.sh`** | **Ask** before `yarn`/`pnpm`/`bun` commands in an npm repo, so no second lockfile gets created |
| **PostToolUseFailure hook `check-failure-hint.sh`** | After a failed lint, typecheck or test, tells the agent to fix the errors (not disable rules or skip tests) and re-run all checks |
| **Skills** | `issue-autofix`, `feature-plan`, `feature-implement`, `pr-review` (CI); `branch-and-commit` (local helper that suggests 3 branch names and a Conventional Commit message, without committing) |
| **MCP `context7`** | Up-to-date library docs for agents. Version pinned |
| **Git hooks for people** (recommended) | Format and lint staged files on commit, typecheck on push. The source used Husky with lint-staged; add one when the team wants it |

## 4. Functional rules
- **R1** Native permission rules beat hooks wherever they can express the policy (deny is simpler and can't be bypassed by a shell quirk). Use hooks for **ask** decisions and for adding context.
- **R2** Hooks **fail open** when `jq` is missing (they are advice, not security), and must finish in ≤ 5 s.
- **R3** All skills that run in CI set `disable-model-invocation: true`, so they only run when called explicitly.
- **R4** One canonical copy of each skill. If you support several editors, generate or symlink their copies instead of hand-maintaining forks.
- **R5** Third-party skills are pinned by content hash (a lock file), and someone reviews them before install.
- **R6** CI agents use an **organization** API key with a spend limit, never a personal subscription token.

## 5. Data contracts
Hook I/O follows the Claude Code hook protocol. Input is JSON on stdin with `tool_input.command`. Output is JSON `{ hookSpecificOutput: { hookEventName, permissionDecision: "ask", permissionDecisionReason } }` or `{ …, additionalContext }`.

## 6. AI design
These are instructions and limits rather than a model feature. Keep `AGENTS.md` short and concrete; long policy documents get skimmed by people and agents alike.

## 7. Security and privacy
Secrets stay in gitignored env files the agent can't read. `.env.example` holds placeholders only.

## 8. Failure modes
Hook script error: the action proceeds (fail open). Make the hook's error visible in its output and fix it.

## 9. Configuration
`.claude/settings.json`, `.mcp.json`, `AGENTS.md`.

## 10. Acceptance checks
- `yarn add x` prompts for approval.
- A failed `npm run lint` adds the hint.
- Reading `.env.local` is denied.
- `git push --force` is denied.

## 11. Rebuild checklist
Write AGENTS.md, then deny rules, then the two hooks, then skills, then pinned MCP servers, then (optionally) git hooks for people.

## 12. Pitfalls seen in the source system
- The env-file protection was an **ask** hook, so one click of approval was enough. Deny is stronger.
- Editor-specific skill copies drifted from the CI copies.
- Some rules lived only in the editor config, so CI agents never saw them.
