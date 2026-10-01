/**
 * Redacts credentials and personal data from diagnostic log lines. Runs in
 * the browser before submit and again on the server (never trust the client).
 */
const PATTERNS: [RegExp, string][] = [
  [/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]"],
  [/eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+/g, "[JWT]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[EMAIL]"],
  [
    /"(email|phone|password|secret|token|access_token|refresh_token|id_token|api_key|apikey|authorization|session_id|dob)"\s*:\s*("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false|null)/gi,
    '"$1":"[REDACTED]"',
  ],
  // key=value pairs anywhere (query strings and plain log text alike).
  [/\b((?:token|code|access_token|id_token|refresh_token|session|state|nonce|key|api_key|secret|password)=)[^&\s]+/gi, "$1[REDACTED]"],
  [/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]+/g, "[STRIPE_KEY]"],
  [/\bsk-[A-Za-z0-9_-]{16,}/g, "[API_KEY]"],
  [/\bAKIA[0-9A-Z]{16}\b/g, "[AWS_KEY]"],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, "[GITHUB_TOKEN]"],
  [/\b\+?\d{1,2}?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[PHONE]"],
];

export function redact(text: string): string {
  return PATTERNS.reduce((s, [re, rep]) => s.replace(re, rep), text);
}

/** Last `maxLines` lines, redacted, dropping the oldest until under `maxChars`. */
export function trimLogs(lines: string[], maxLines = 30, maxChars = 12_000): string[] {
  const out = lines.slice(-maxLines).map((l) => redact(l).slice(0, 800));
  while (out.length && out.join("\n").length > maxChars) out.shift();
  return out;
}
