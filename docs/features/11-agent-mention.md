# 11 · Interactive @mention agent

## 1. Purpose
Let team members ask an agent questions in issue and PR threads ("@claude why does this test fail?", "@claude summarize this issue"), and get an answer right there.

## 2. Status in this sample
Implemented: `.github/workflows/agent-mention.yml`.

## 3. Flow
A repo member comments with `@claude …`. The workflow checks the commenter's association and runs the agent with read-oriented tools, and the agent replies in the thread.

## 4. Functional rules
- **R1 Triggers:** `issue_comment` and `pull_request_review_comment`. **Never** `issues: opened` or issue bodies, because those come from app users through intake (04).
- **R2 Author gate:** `author_association` must be `OWNER`, `MEMBER` or `COLLABORATOR`. The action also checks the actor's write access.
- **R3** Read-oriented: Read/Grep/Glob, `gh issue view`, `gh pr view|diff`. Contents read. It can comment, but not push or edit code. To have it change code, use 07 or 09.
- **R4 Budgets:** 20 turns, 20 minutes.

## 5. Data contracts
A reply comment in the thread.

## 6. AI design
A conversational agent with a small tool set.

## 7. Security and privacy
| Risk | Control |
|---|---|
| End users triggering it through intake | No issue-body trigger (R1); intake defangs `@` (04 R7) |
| Outsiders on a public repo | Author-association gate (R2) |
| Code changes | Read-only tools and permissions (R3) |

## 8. Failure modes
Unauthorized commenter: the job is skipped and nothing is posted.

## 9. Configuration
Secret `ANTHROPIC_API_KEY`.

## 10. Acceptance checks
- A member's mention gets a reply.
- An outside contributor's mention is ignored.
- A new issue whose body contains `@claude` does not trigger a run.

## 11. Rebuild checklist
The workflow with both gates, then test with member and non-member accounts.

## 12. Pitfalls seen in the source system
- The mention job also fired on **newly opened issues containing `@claude`**. Issues created by the intake service account passed the action's write check, so any app user could start the agent with write permissions and skip triage.
- It was described as read-only but had contents, PR and issue write permissions.
