#!/usr/bin/env node
/**
 * Deterministic guardrail that runs before any agent job (no LLM, no cost).
 * Decides whether a human-approved issue is small and safe enough for an agent.
 *
 * CI usage: node scripts/evaluate-issue.mjs   (reads $GITHUB_EVENT_PATH, writes $GITHUB_OUTPUT)
 */
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Approval label -> agent mode. Only maintainers can apply labels. */
export const APPROVAL_LABELS = {
  "agent:autofix-approved": "autofix",
  "agent:plan-approved": "plan",
  "agent:implement-approved": "implement",
};

export const LIMITS = { maxBodyChars: 12_000, maxFiles: 6 };

// Anchored to paths and artifacts, not English words, so "the production
// environment" in prose doesn't block a copy fix.
const HIGH_RISK = [
  /\.sql\b/,
  /(?:^|[\s/])migrations?\//,
  /\.github\//,
  /(?:^|[\s/'"`(])\.env(?:\.[\w-]+)*\b/, // .env files, not "process.env"
  /\b(?:infra|terraform|bicep|cdk|helm)\//,
  /\b(?:package-lock\.json|Dockerfile)\b/,
];

const FILE_PATH = /(?<![\w./-])((?:[\w.-]+\/)+[\w.-]+\.[A-Za-z0-9]+)/g;

/**
 * The part of the body a person wrote. App-built issues also carry generated
 * sections (context, user agent, scope hints, screenshots, logs) whose
 * path-like strings ("Chrome/152.0", scope paths) must not count as files the
 * fix will touch. Issues filed by hand have no such heading: use the whole body.
 */
function userText(body) {
  const m = /^## User (?:report|request)\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(body);
  return m ? m[1] : body;
}

/**
 * @param {string} mode
 * @param {{ body?: string, labels?: string[] }} issue
 */
export function evaluate(mode, { body = "", labels = [] }) {
  const reasons = [];
  const lower = body.toLowerCase();
  const has = (l) => labels.includes(l);

  if (body.length > LIMITS.maxBodyChars) reasons.push(`issue body is over ${LIMITS.maxBodyChars} characters`);

  if (mode === "autofix") {
    if (!has("user-reported") && !has("bug")) reasons.push("autofix is for bugs: needs label user-reported or bug");
    if (has("feature-request")) reasons.push("feature requests use the plan/implement labels, not autofix");
    const files = new Set([...userText(body).matchAll(FILE_PATH)].map((m) => m[1].replace(/^[ab]\//, "")));
    if (files.size > LIMITS.maxFiles) reasons.push(`issue references ${files.size} files (max ${LIMITS.maxFiles})`);
  } else if (mode === "plan") {
    if (!has("feature-request")) reasons.push("planning needs label feature-request");
    if (!lower.includes("## user request")) reasons.push("missing '## User request' section");
  } else if (mode === "implement") {
    if (!has("feature-request")) reasons.push("implementation needs label feature-request");
    for (const s of ["## product requirements document", "## acceptance criteria", "## implementation tasks"]) {
      if (!lower.includes(s)) reasons.push(`missing '${s}' section (run planning first)`);
    }
  } else {
    reasons.push(`unknown mode: ${mode}`);
  }

  if (mode === "autofix" || mode === "implement") {
    for (const re of HIGH_RISK) if (re.test(lower)) reasons.push(`touches a high-risk area (${re.source})`);
  }

  return { eligible: reasons.length === 0, reasons };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const mode = APPROVAL_LABELS[event.label?.name] ?? "none";
  const issue = event.issue ?? {};
  const result = evaluate(mode, { body: issue.body ?? "", labels: (issue.labels ?? []).map((l) => l.name) });
  const reason = result.eligible ? "pass" : result.reasons.slice(0, 4).join("; ");
  console.log(`mode=${mode} eligible=${result.eligible} reason=${reason}`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `mode=${mode}\neligible=${result.eligible}\nreason=${reason}\n`);
  }
}
