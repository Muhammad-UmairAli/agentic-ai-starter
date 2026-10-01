"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { redact } from "@/lib/redact";

const MAX_LINES = 50;
const MAX_CHARS = 32_000;
const LAST_PAGE_KEY = "diagnostics.lastPage";
const buffer: string[] = [];
let bufferChars = 0;
let installed = false;

/** Recent console lines (already redacted) for bug reports. Sent only with the user's consent. */
export const recentConsole = () => [...buffer];

/**
 * The last page the user visited before opening the feedback screen: usually
 * where the bug happened. Query strings are dropped (they can carry tokens).
 */
export function lastPage(): string | null {
  try {
    return sessionStorage.getItem(LAST_PAGE_KEY);
  } catch {
    return null;
  }
}

function push(level: string, args: unknown[]) {
  const msg = args.map((a) => (typeof a === "string" ? a : safeStringify(a))).join(" ").slice(0, 800);
  const line = `${new Date().toISOString()} ${level} ${redact(msg)}`;
  buffer.push(line);
  bufferChars += line.length;
  // Running total, so a chatty component doesn't rebuild a 32 KB string per log call.
  while (buffer.length > MAX_LINES || bufferChars > MAX_CHARS) bufferChars -= buffer.shift()!.length;
}

function safeStringify(v: unknown) {
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/**
 * Patches console once per page load and remembers the last non-feedback
 * page. Browser only; renders nothing.
 */
export function Diagnostics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/feedback")) return;
    try {
      sessionStorage.setItem(LAST_PAGE_KEY, pathname);
    } catch {
      // Storage blocked (private mode): occurrence page is optional.
    }
  }, [pathname]);

  useEffect(() => {
    if (installed) return;
    installed = true;
    for (const level of ["log", "info", "warn", "error"] as const) {
      const orig = console[level].bind(console);
      console[level] = (...args: unknown[]) => {
        orig(...args);
        push(level.toUpperCase(), args);
      };
    }
    window.addEventListener("error", (e) => push("ERROR", [e.message]));
    window.addEventListener("unhandledrejection", (e) => push("ERROR", ["Unhandled rejection:", e.reason]));
  }, []);

  return null;
}
