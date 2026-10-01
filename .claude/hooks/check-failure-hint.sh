#!/usr/bin/env bash
# PostToolUseFailure (Bash): when a quality check fails, tell the agent what to
# do next instead of letting it guess or skip the check.
set -uo pipefail
command -v jq >/dev/null 2>&1 || exit 0
cmd=$(jq -r '.tool_input.command // empty' 2>/dev/null || true)
[[ "$cmd" =~ npm[[:space:]]+(run[[:space:]]+)?(lint|typecheck|test) ]] || exit 0
jq -n '{hookSpecificOutput: {hookEventName: "PostToolUseFailure",
  additionalContext: "A quality check failed. Fix the reported errors (do not disable rules or skip tests), then re-run npm run lint, npm run typecheck and npm test (AGENTS.md)."}}'
exit 0
