#!/usr/bin/env bash
# PreToolUse (Bash): this repo uses npm. Ask before yarn/pnpm/bun commands so
# an agent doesn't create a second lockfile. Fails open if jq is missing.
set -uo pipefail
command -v jq >/dev/null 2>&1 || exit 0
cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null || true)
case "$cmd" in
  yarn|yarn\ *|pnpm|pnpm\ *|bun\ install*|bun\ add*)
    jq -n '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: "ask",
      permissionDecisionReason: "This repo uses npm only (AGENTS.md). Use npm install / npm run <script>."}}'
    ;;
esac
exit 0
