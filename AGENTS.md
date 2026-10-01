<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Zod, Vitest. Package manager: npm.
- Before finishing any change: `npm run lint`, `npm run typecheck`, `npm test`.
- LLM calls live only in `src/lib/ai.ts`. Use structured outputs (`betaZodOutputFormat`) and handle `refusal`; never hand-parse JSON from model text.
- Every server action starts with `getCurrentUser()` and authorizes access to the data it touches before that data reaches a prompt.
- User text is untrusted: screen it with `screen()` before posting and wrap it in tags as data in prompts. Model output is rendered as text, never HTML.
- Never log user content, secrets or PII. Log event names and error messages only.
- Safety paths fail closed (moderation outage = block).
- Don't edit `.env*` (except `.env.example`), `.github/` or lockfiles unless the task is explicitly about them.
- Conventional Commits; `feat:`/`fix:` only for user-facing changes (they feed What's New).
