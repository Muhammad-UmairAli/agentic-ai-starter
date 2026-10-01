---
name: branch-and-commit
description: Suggest branch names and a Conventional Commit message from the current changes. Use when the user asks for a branch name or commit message.
disable-model-invocation: true
allowed-tools: Read Glob Grep Bash(git status:*) Bash(git diff:*)
---

# Branch and commit helper

Inputs: `$ARGUMENTS` (optional context), `git status --short`, `git diff`, `git diff --cached`.

## Branch names

Give 3 ranked options, lowercase kebab-case, with one of these prefixes: `feature/`, `fix/`, `chore/`, `refactor/`, `docs/`, `test/`, `perf/`. Keep them short and specific to the domain.

## Commit message

Conventional Commits: `<type>(<scope>): <subject>`
- types: `feat | fix | chore | refactor | docs | test | perf`
- imperative subject, no trailing period
- body: 1-3 lines on why and impact
- `feat`/`fix` only for user-facing changes (they appear in What's New)

## Output

```
### Branch name options
- prefix/option-one
- prefix/option-two
- prefix/option-three

### Recommended commit message
type(scope): subject

why/impact
```

Suggest only. Don't create branches or commit.
