"use client";

import { useState } from "react";
import { ChevronDown, Sparkles, Copy, Check, AlertCircle } from "lucide-react";

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "thank_you", label: "Thank-you note" },
  { value: "recruiter_follow_up", label: "Recruiter follow-up" },
  { value: "referral_request", label: "Referral request" },
  { value: "negotiation", label: "Offer negotiation" },
];

export default function FollowUpSection({ jobId }: { jobId: string }) {
  const [expanded, setExpanded] = useState(false);
  const [kind, setKind] = useState("thank_you");
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    setNotConfigured(false);
    setResult(null);

    const res = await fetch(`/api/jobs/${jobId}/follow-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, extraContext: extraContext || undefined }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (body?.code === "NOT_CONFIGURED") setNotConfigured(true);
      setError(body?.error ?? "Couldn't generate that message.");
      return;
    }
    setResult(await res.json());
  }

  async function copyResult() {
    if (!result) return;
    const text = result.subject ? `Subject: ${result.subject}\n\n${result.body}` : result.body;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-2 border-t border-[#EFECE3] pt-2">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11.5px] text-muted">
        <ChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
        <Sparkles size={11} className="text-indigo" /> draft a follow-up
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1.5">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="w-full rounded border border-border px-2 py-1 text-[11px]"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k.value} value={k.value}>{k.label}</option>
            ))}
          </select>
          <textarea
            value={extraContext}
            onChange={(e) => setExtraContext(e.target.value)}
            placeholder="Anything specific to mention (optional) — e.g. interviewer's name, a topic you discussed"
            rows={2}
            className="w-full rounded border border-border px-2 py-1 text-[11px]"
          />
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1 rounded bg-indigo px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-60"
          >
            <Sparkles size={11} /> {loading ? "Drafting…" : "Generate"}
          </button>

          {notConfigured && (
            <div className="flex items-start gap-1.5 rounded-md border border-[#C9C2AE] bg-paper p-2 text-[10.5px] text-ink">
              <AlertCircle size={12} className="mt-0.5 shrink-0 text-stage-oa" />
              <span>
                Needs an LLM key in <code className="rounded bg-white px-1 font-mono">.env</code> — <code className="rounded bg-white px-1 font-mono">ANTHROPIC_API_KEY</code>,{" "}
                <code className="rounded bg-white px-1 font-mono">DEEPSEEK_API_KEY</code>, or{" "}
                <code className="rounded bg-white px-1 font-mono">GEMINI_API_KEY</code> with a matching{" "}
                <code className="rounded bg-white px-1 font-mono">LLM_PROVIDER</code>. See the README.
              </span>
            </div>
          )}
          {error && !notConfigured && <p className="text-[10.5px] text-urgent">{error}</p>}

          {result && (
            <div className="rounded-md bg-paper p-2">
              <div className="flex items-center justify-between">
                {result.subject && <div className="text-[10.5px] font-semibold text-ink">Subject: {result.subject}</div>}
                <button onClick={copyResult} className="ml-auto flex items-center gap-1 text-[10.5px] text-indigo">
                  {copied ? <Check size={11} /> : <Copy size={11} />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[11px] leading-relaxed text-ink">{result.body}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
