"use server";

import { z } from "zod";
import { ComposeRequest, composeMessage, type ComposeResult } from "@/lib/composer";
import { BugReport, buildBugIssue, buildFeatureIssue, createIssue, FeatureRequest, type IssueResult } from "@/lib/feedback";
import { allowRequest } from "@/lib/limits";
import { screen, type ScreenResult } from "@/lib/moderation";
import { getCurrentUser } from "@/lib/session";

const firstError = (e: z.ZodError) => e.issues[0]?.message ?? "Invalid input";

const parseJsonArray = (v: FormDataEntryValue | null): unknown => {
  try {
    return JSON.parse(String(v ?? "[]"));
  } catch {
    return [];
  }
};

export async function composeAction(_prev: ComposeResult | null, form: FormData): Promise<ComposeResult> {
  const user = await getCurrentUser();
  const parsed = ComposeRequest.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  return composeMessage(user, parsed.data);
}

const PostSchema = z.object({ text: z.string().trim().min(1, "Write something first.").max(5000) });

/** Moderation outcomes plus the two non-moderation failures a post can hit. */
export type PostResult = ScreenResult | { ok: false; code: "INVALID_INPUT" | "RATE_LIMITED"; message: string };

/** Stand-in for any "post" endpoint (chat, announcement, poll): screen, then save. */
export async function postAction(_prev: PostResult | null, form: FormData): Promise<PostResult> {
  const user = await getCurrentUser();
  const parsed = PostSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, code: "INVALID_INPUT", message: firstError(parsed.error) };
  if (!allowRequest(`post:${user.id}`, 60)) {
    return { ok: false, code: "RATE_LIMITED", message: "You're posting too quickly. Please wait a moment." };
  }
  return screen(user.id, [parsed.data.text]);
}

export async function bugReportAction(_prev: IssueResult | null, form: FormData): Promise<IssueResult> {
  const user = await getCurrentUser();
  const parsed = BugReport.safeParse({
    ...Object.fromEntries(form),
    consoleLogs: parseJsonArray(form.get("consoleLogs")),
    attachmentUrls: parseJsonArray(form.get("attachmentUrls")),
  });
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  if (!allowRequest(`bug:${user.id}`, 10)) return { ok: false, message: "Too many reports this hour. Please try again later." };
  return createIssue(buildBugIssue(parsed.data, user));
}

export async function featureRequestAction(_prev: IssueResult | null, form: FormData): Promise<IssueResult> {
  const user = await getCurrentUser();
  const parsed = FeatureRequest.safeParse({
    ...Object.fromEntries(form),
    attachmentUrls: parseJsonArray(form.get("attachmentUrls")),
  });
  if (!parsed.success) return { ok: false, message: firstError(parsed.error) };
  if (!allowRequest(`feature:${user.id}`, 5)) return { ok: false, message: "Too many requests this hour. Please try again later." };
  return createIssue(buildFeatureIssue(parsed.data, user));
}
