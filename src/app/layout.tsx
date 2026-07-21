import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pipeline — Recruiting OS",
  description: "Track applications, resume versions, and interview conversion in one place.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body>
        <header className="border-b border-border bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Logo size={26} />
              Pipeline
            </Link>
            {session ? (
              <nav className="flex gap-5 font-sans text-sm text-muted">
                <Link href="/dashboard" className="hover:text-ink">Board</Link>
                <Link href="/discover" className="hover:text-ink">Discover</Link>
                <Link href="/season" className="hover:text-ink">Season</Link>
                <Link href="/leetcode" className="hover:text-ink">LeetCode</Link>
                <Link href="/resumes" className="hover:text-ink">Resume versions</Link>
                <Link href="/match" className="hover:text-ink">Match score</Link>
                <Link href="/analytics" className="hover:text-ink">Analytics</Link>
                <Link href="/settings" className="hover:text-ink">Settings</Link>
                <SignOutButton />
              </nav>
            ) : (
              <nav className="flex items-center gap-3 font-sans text-sm">
                <Link href="/login" className="text-muted hover:text-ink">Sign in</Link>
                <Link href="/login" className="rounded-md bg-indigo px-3.5 py-1.5 font-medium text-white">
                  Get started
                </Link>
              </nav>
            )}
          </div>
        </header>
        <main className={session ? "mx-auto max-w-6xl px-6 py-8" : ""}>{children}</main>
      </body>
    </html>
  );
}
