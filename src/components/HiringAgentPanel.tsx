"use client";

import { useRef, useState } from "react";
import { Upload, ExternalLink, AlertCircle } from "lucide-react";

const KNOWN_CATEGORIES = ["open_source", "self_projects", "production", "technical_skills"];

export default function HiringAgentPanel() {
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [result, setResult] = useState<{ stdout: string; fields: Record<string, string> | null } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError("");
    setNotConfigured(false);
    setResult(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/match/hiring-agent", { method: "POST", body: formData });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (body?.code === "NOT_CONFIGURED") setNotConfigured(true);
      setError(body?.error ?? "Something went wrong.");
      return;
    }
    setResult(await res.json());
  }

  const categoryFields = result?.fields ? KNOWN_CATEGORIES.filter((c) => c in (result.fields as object)) : [];
  const otherFields = result?.fields
    ? Object.keys(result.fields).filter((k) => !KNOWN_CATEGORIES.includes(k))
    : [];

  return (
    <div className="mt-6 rounded-card border border-border bg-white p-5">
      <div className="mb-1 flex items-center gap-2">
        <span className="font-display text-sm font-semibold text-ink">HackerRank's open-source hiring agent</span>
        <a
          href="https://github.com/interviewstreet/hiring-agent"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-indigo underline"
        >
          Source <ExternalLink size={11} />
        </a>
      </div>
      <p className="mb-4 max-w-2xl text-xs text-muted">
        This runs the real, unmodified <code className="rounded bg-paper px-1 py-0.5 font-mono">interviewstreet/hiring-agent</code> CLI
        (MIT © HackerRank) against your uploaded PDF — not a reimplementation. It needs a local clone set up separately (Python, plus
        Ollama or a Gemini API key). See the README for setup.
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
        >
          <Upload size={13} /> {loading ? "Running (this can take a minute or two)…" : "Upload resume PDF"}
        </button>
        {fileName && !loading && <span className="text-xs text-muted">{fileName}</span>}
        <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleUpload} className="hidden" />
      </div>

      {notConfigured && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-[#C9C2AE] bg-paper p-3 text-xs text-ink">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-stage-oa" />
          <div>
            <p className="mb-1 font-medium">Not set up yet.</p>
            <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted">
{`git clone https://github.com/interviewstreet/hiring-agent
cd hiring-agent && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set LLM_PROVIDER + GEMINI_API_KEY, or run: ollama serve`}
            </pre>
            <p className="mt-1">
              Then add <code className="rounded bg-white px-1 py-0.5 font-mono">HIRING_AGENT_DIR=/path/to/hiring-agent</code> to this
              project's <code className="rounded bg-white px-1 py-0.5 font-mono">.env</code>.
            </p>
          </div>
        </div>
      )}

      {error && !notConfigured && <p className="mt-3 text-xs text-urgent">{error}</p>}

      {result && (
        <div className="mt-4">
          {categoryFields.length > 0 && (
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {categoryFields.map((c) => (
                <div key={c} className="rounded-md border border-border bg-paper p-3">
                  <div className="font-mono text-[10.5px] uppercase tracking-wide text-muted">{c.replace(/_/g, " ")}</div>
                  <div className="mt-1 font-display text-xl font-bold text-indigo">{result.fields?.[c]}</div>
                </div>
              ))}
            </div>
          )}

          {otherFields.length > 0 && (
            <div className="mb-4 space-y-1.5">
              {otherFields.map((k) => (
                <div key={k} className="flex justify-between border-b border-[#EFECE3] py-1.5 text-sm last:border-0">
                  <span className="font-mono text-xs text-muted">{k.replace(/_/g, " ")}</span>
                  <span className="max-w-[70%] text-right text-ink">{result.fields?.[k]}</span>
                </div>
              ))}
            </div>
          )}

          <details className="text-xs text-muted">
            <summary className="cursor-pointer font-medium text-ink">Raw output</summary>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-paper p-3 font-mono text-[11px]">{result.stdout}</pre>
          </details>
        </div>
      )}
    </div>
  );
}
