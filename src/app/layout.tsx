import type { Metadata } from "next";
import Link from "next/link";
import { Diagnostics } from "@/components/diagnostics";
import { aiMode } from "@/lib/ai";
import "./globals.css";

const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME || "Acme Community";

// Render per request so the AI-mode badge reflects runtime secrets, not the
// build machine's env (images are often built without keys).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: BRAND,
  description: "White-label reference implementation of agentic AI patterns.",
};

const NAV = [
  ["/composer", "AI Composer"],
  ["/moderation", "Moderation"],
  ["/feedback", "Feedback"],
  ["/whats-new", "What's New"],
] as const;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <Diagnostics />
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="font-semibold text-brand">{BRAND}</Link>
            {NAV.map(([href, label]) => (
              <Link key={href} href={href} className="text-sm text-muted hover:text-foreground">{label}</Link>
            ))}
            <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-xs text-muted">
              AI: {aiMode === "live" ? "live" : "offline mock"}
            </span>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
