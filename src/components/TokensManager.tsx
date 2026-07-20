"use client";

import { useState } from "react";
import { Plus, Copy, Check, Trash2, Key } from "lucide-react";

type Token = { id: string; label: string; lastUsedAt: string | null; createdAt: string };

export default function TokensManager({ initialTokens }: { initialTokens: Token[] }) {
  const [tokens, setTokens] = useState(initialTokens);
  const [label, setLabel] = useState("Chrome extension");
  const [creating, setCreating] = useState(false);
  const [freshToken, setFreshToken] = useState<{ token: string; masked: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function createToken() {
    if (!label.trim()) return;
    setCreating(true);
    setError("");
    const res = await fetch("/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
    setCreating(false);
    if (!res.ok) {
      setError("Couldn't create a token. Try again.");
      return;
    }
    const data = await res.json();
    setFreshToken({ token: data.token, masked: data.masked });
    setTokens((t) => [{ id: data.id, label: data.label, lastUsedAt: null, createdAt: data.createdAt }, ...t]);
  }

  async function revoke(id: string) {
    setTokens((t) => t.filter((x) => x.id !== id));
    await fetch(`/api/tokens/${id}`, { method: "DELETE" });
  }

  async function copyToken() {
    if (!freshToken) return;
    await navigator.clipboard.writeText(freshToken.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="mb-2">
        <div className="font-mono text-xs uppercase tracking-wide text-muted">Recruiting OS</div>
        <h1 className="font-display text-2xl font-bold text-ink">Settings</h1>
      </div>
      <p className="mb-6 max-w-lg text-sm text-muted">
        API tokens let the Chrome extension (or any other tool) add applications to your pipeline without signing in through the browser. Treat a token like a password — anyone with it can create applications as you.
      </p>

      <div className="rounded-card border border-border bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <Key size={16} className="text-indigo" />
          <span className="font-display text-sm font-semibold text-ink">API tokens</span>
        </div>

        {freshToken && (
          <div className="mb-4 rounded-md border border-stage-offer bg-white p-3">
            <p className="mb-2 text-xs font-medium text-ink">
              Copy this now — it won't be shown again. If you lose it, revoke and create a new one.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-paper px-2 py-1.5 font-mono text-xs text-ink">{freshToken.token}</code>
              <button onClick={copyToken} className="flex items-center gap-1 rounded-md bg-indigo px-2.5 py-1.5 text-xs font-medium text-white">
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        <div className="mb-4 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label, e.g. Chrome extension"
            className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm"
          />
          <button
            onClick={createToken}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-md bg-indigo px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            <Plus size={14} /> {creating ? "Creating…" : "New token"}
          </button>
        </div>
        {error && <p className="mb-3 text-xs text-urgent">{error}</p>}

        {tokens.length === 0 ? (
          <p className="text-xs text-muted">No tokens yet.</p>
        ) : (
          tokens.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-[#EFECE3] py-2.5 last:border-0">
              <div>
                <div className="text-sm text-ink">{t.label}</div>
                <div className="font-mono text-[10.5px] text-muted">
                  Created {new Date(t.createdAt).toLocaleDateString()}
                  {t.lastUsedAt ? ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}` : " · never used"}
                </div>
              </div>
              <button onClick={() => revoke(t.id)} className="flex items-center gap-1 text-xs text-urgent">
                <Trash2 size={12} /> Revoke
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
