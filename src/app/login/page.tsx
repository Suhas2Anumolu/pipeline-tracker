"use client";

import { useState } from "react";
import Logo from "@/components/Logo";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@pipeline.dev");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("That email or password didn't match. Try again.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-card border border-border bg-white p-8">
      <Link href="/" className="text-xs text-muted hover:text-ink">← Back home</Link>
      <div className="mt-3 flex items-center gap-2">
        <Logo size={22} />
        <h1 className="font-display text-xl font-semibold text-ink">Sign in</h1>
      </div>
      <p className="mt-1 text-sm text-muted">Use the seeded demo account, or continue with Google.</p>

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
          <path fill="#4CAF50" d="M24 44c5.4 0 10.3-1.8 14-5l-6.5-5.5C29.4 34.9 26.8 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.9 39.7 16.4 44 24 44z"/>
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.6l6.5 5.5C41 36 44 30.8 44 24c0-1.3-.1-2.7-.4-3.5z"/>
        </svg>
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-muted">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="text-sm text-muted">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm text-muted">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-urgent">{error}</p>}
        <button
          type="submit"
          className="rounded-md bg-indigo px-4 py-2 text-sm font-medium text-white"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
