"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Flame, Trophy, RefreshCw, Unlink, ExternalLink } from "lucide-react";

type Stats = {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalEasy: number;
  totalMedium: number;
  totalHard: number;
  ranking: number | null;
  contestRating: number | null;
  attendedContests: number | null;
  currentStreak: number;
  fetchedAt: string;
};

function ProgressBar({ label, solved, total, color }: { label: string; solved: number; total: number; color: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((solved / total) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span>{solved}/{total}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-paper">
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function LeetCodePanel({ initialStats }: { initialStats: Stats | null }) {
  const [stats, setStats] = useState<Stats | null>(initialStats);
  const [username, setUsername] = useState(initialStats?.username ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function connect() {
    if (!username.trim()) return;
    setLoading(true);
    setError("");
    setNotice("");

    const res = await fetch("/api/leetcode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username.trim() }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't fetch that profile.");
      return;
    }

    const data = await res.json();
    if (data.cached) {
      setNotice(`Synced recently — next refresh available in ~${Math.ceil(data.nextRefreshInMs / 60000)} min.`);
    }
    setStats(data);
  }

  async function disconnect() {
    setStats(null);
    setUsername("");
    await fetch("/api/leetcode", { method: "DELETE" });
  }

  return (
    <div>
      <div className="mb-2">
        <div className="font-mono text-xs uppercase tracking-wide text-muted">Recruiting OS</div>
        <h1 className="font-display text-2xl font-bold text-ink">LeetCode</h1>
      </div>
      <p className="mb-5 max-w-xl text-sm text-muted">
        Pulled from LeetCode's public profile data — no login required, read-only. LeetCode doesn't publish an
        official API for this, so results are cached and only refreshed at most every 15 minutes.
      </p>

      {!stats ? (
        <div className="rounded-card border border-border bg-white p-5">
          <label className="text-xs text-muted">
            LeetCode username
            <div className="mt-1 flex gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your-leetcode-username"
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm"
                onKeyDown={(e) => e.key === "Enter" && connect()}
              />
              <button
                onClick={connect}
                disabled={loading}
                className="rounded-md bg-indigo px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "Connecting…" : "Connect"}
              </button>
            </div>
          </label>
          {error && <p className="mt-2 text-xs text-urgent">{error}</p>}
        </div>
      ) : (
        <div className="rounded-card border border-border bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <a
              href={`https://leetcode.com/${stats.username}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 font-display text-sm font-semibold text-ink"
            >
              {stats.username} <ExternalLink size={12} className="text-muted" />
            </a>
            <div className="flex items-center gap-2">
              <button onClick={connect} disabled={loading} className="flex items-center gap-1 text-xs text-indigo disabled:opacity-60">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
              <button onClick={disconnect} className="flex items-center gap-1 text-xs text-urgent">
                <Unlink size={12} /> Disconnect
              </button>
            </div>
          </div>

          {notice && <p className="mb-3 text-xs text-muted">{notice}</p>}
          {error && <p className="mb-3 text-xs text-urgent">{error}</p>}

          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-md bg-paper p-3 text-center">
              <div className="font-display text-2xl font-bold text-ink">{stats.totalSolved}</div>
              <div className="text-xs text-muted">problems solved</div>
            </div>
            <div className="rounded-md bg-paper p-3 text-center">
              <div className="flex items-center justify-center gap-1 font-display text-2xl font-bold text-ink">
                <Flame size={18} className="text-urgent" /> {stats.currentStreak}
              </div>
              <div className="text-xs text-muted">day streak</div>
            </div>
            <div className="rounded-md bg-paper p-3 text-center">
              <div className="flex items-center justify-center gap-1 font-display text-2xl font-bold text-ink">
                <Trophy size={16} className="text-stage-oa" /> {stats.contestRating ? Math.round(stats.contestRating) : "—"}
              </div>
              <div className="text-xs text-muted">
                {stats.attendedContests ? `contest rating (${stats.attendedContests} contests)` : "no contests yet"}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <ProgressBar label="Easy" solved={stats.easySolved} total={stats.totalEasy} color="#1F8A5F" />
            <ProgressBar label="Medium" solved={stats.mediumSolved} total={stats.totalMedium} color="#C08A2E" />
            <ProgressBar label="Hard" solved={stats.hardSolved} total={stats.totalHard} color="#9C4A42" />
          </div>

          <div className="mt-4 text-[10.5px] text-muted">
            Last synced {formatDistanceToNow(new Date(stats.fetchedAt), { addSuffix: true })}
          </div>
        </div>
      )}
    </div>
  );
}
