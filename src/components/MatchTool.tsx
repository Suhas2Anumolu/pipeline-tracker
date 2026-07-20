"use client";

import { useState, useRef } from "react";
import { Check, X, Sparkles, FileText, Upload, AlertTriangle, AlertCircle, Wrench } from "lucide-react";
import type { ResumeVersion, ResumeMatch } from "@prisma/client";

type RecentMatch = ResumeMatch & { resumeVersion: ResumeVersion | null };

type ScoredVersion = {
  resumeVersionId: string;
  label: string;
  matchScore: number;
  matchingSkills: string[];
  missingSkills: string[];
};

type AtsCheck = { id: string; label: string; passed: boolean; detail: string };

type ResumeFeedback = {
  matchScore: number;
  criticalFixes: string[];
  missingKeywords: string[];
  summary: string;
};

export default function MatchTool({
  resumeVersions,
  recentMatches,
}: {
  resumeVersions: ResumeVersion[];
  recentMatches: RecentMatch[];
}) {
  const [mode, setMode] = useState<"text" | "versions">(resumeVersions.some((v) => v.resumeText) ? "versions" : "text");
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [jdCompany, setJdCompany] = useState("");
  const [jdRole, setJdRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [atsChecks, setAtsChecks] = useState<AtsCheck[]>([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    matchScore: number;
    matchingSkills: string[];
    missingSkills: string[];
    recommendedResumeVersion?: string;
    versions: ScoredVersion[];
  } | null>(null);
  const [sessionError, setSessionError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [feedback, setFeedback] = useState<ResumeFeedback | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackNotConfigured, setFeedbackNotConfigured] = useState(false);

  async function getFeedback() {
    if (!jdText.trim() || !resumeText.trim()) {
      setFeedbackError("Need both resume text and a job description — paste mode only for now.");
      return;
    }
    setFeedbackLoading(true);
    setFeedbackError("");
    setFeedbackNotConfigured(false);
    setFeedback(null);

    const res = await fetch("/api/match/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, jdText }),
    });
    setFeedbackLoading(false);

    if (res.status === 401) {
      setSessionError(true);
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      if (body?.code === "NOT_CONFIGURED") setFeedbackNotConfigured(true);
      setFeedbackError(body?.error ?? "Couldn't generate feedback.");
      return;
    }
    setFeedback(await res.json());
  }

  const hasVersionsWithText = resumeVersions.some((v) => v.resumeText);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setAtsChecks([]);
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/resume-parse", { method: "POST", body: formData });
    setUploading(false);

    if (res.status === 401) {
      setSessionError(true);
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't parse that file.");
      return;
    }

    const data = await res.json();
    setResumeText(data.text);
    setUploadedFileName(file.name);
    setAtsChecks(data.atsChecks);
  }


  async function runMatch() {
    setError("");
    setResult(null);
    if (!jdText.trim()) {
      setError("Paste the job description first.");
      return;
    }
    if (mode === "text" && !resumeText.trim()) {
      setError("Paste your resume text, or switch to comparing saved versions.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        jdText,
        jdCompany: jdCompany || undefined,
        jdRole: jdRole || undefined,
        resumeText: mode === "text" ? resumeText : undefined,
      }),
    });
    setLoading(false);

    if (res.status === 401) {
      setSessionError(true);
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Something went wrong scoring that match.");
      return;
    }

    const data = await res.json();
    setResult({
      matchScore: data.primary.matchScore,
      matchingSkills: data.primary.matchingSkills,
      missingSkills: data.primary.missingSkills,
      recommendedResumeVersion: data.recommendedResumeVersion,
      versions: data.versions ?? [],
    });
  }

  return (
    <div>
      <div className="mb-2">
        <div className="font-mono text-xs uppercase tracking-wide text-muted">Recruiting OS</div>
        <h1 className="font-display text-2xl font-bold text-ink">Resume match score</h1>
      </div>
      <p className="mb-5 max-w-xl text-sm text-muted">
        Paste a job description to see which skills it's asking for, which ones your resume already covers, and what's missing.
      </p>

      {sessionError && (
        <div className="mb-5 rounded-card border border-urgent bg-white px-4 py-3 text-sm text-urgent">
          Your session is out of date.{" "}
          <a href="/api/auth/signout" className="font-semibold underline">
            Sign out and sign back in
          </a>{" "}
          to fix it.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-card border border-border bg-white p-5">
          <div className="mb-3 flex gap-2">
            <button
              onClick={() => setMode("text")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${mode === "text" ? "bg-indigo text-white" : "border border-border text-muted"}`}
            >
              Paste resume text
            </button>
            <button
              onClick={() => setMode("versions")}
              disabled={!hasVersionsWithText}
              className={`rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-40 ${mode === "versions" ? "bg-indigo text-white" : "border border-border text-muted"}`}
              title={hasVersionsWithText ? "" : "Add resume text to a saved version first (Resume versions page)"}
            >
              Compare my saved versions
            </button>
          </div>

          {mode === "text" ? (
            <div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-60"
                >
                  <Upload size={13} /> {uploading ? "Parsing…" : "Upload PDF / DOCX / TXT"}
                </button>
                {uploadedFileName && <span className="text-xs text-muted">{uploadedFileName}</span>}
                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
              </div>

              <label className="mt-3 block text-xs text-muted">
                Resume text {uploadedFileName && "(extracted — edit if needed)"}
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  rows={9}
                  placeholder="Upload a file above, or paste your resume content here…"
                  className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink"
                />
              </label>

              {atsChecks.length > 0 && (
                <div className="mt-3 rounded-md border border-border bg-paper p-3">
                  <div className="mb-2 text-xs font-semibold text-ink">ATS parseability check</div>
                  <div className="space-y-1.5">
                    {atsChecks.map((c) => (
                      <div key={c.id} className="flex items-start gap-1.5 text-xs">
                        {c.passed ? (
                          <Check size={13} className="mt-0.5 shrink-0 text-stage-offer" />
                        ) : (
                          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-stage-oa" />
                        )}
                        <span className={c.passed ? "text-muted" : "text-ink"}>{c.detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-[#C9C2AE] bg-paper p-4 text-sm text-muted">
              Will score against all {resumeVersions.filter((v) => v.resumeText).length} saved resume version(s) with text on file, and recommend the best match. Manage version text on the{" "}
              <a href="/resumes" className="text-indigo underline">Resume versions</a> page.
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs text-muted">
              Company (optional)
              <input value={jdCompany} onChange={(e) => setJdCompany(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="Google" />
            </label>
            <label className="text-xs text-muted">
              Role (optional)
              <input value={jdRole} onChange={(e) => setJdRole(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" placeholder="SWE Intern" />
            </label>
          </div>

          <label className="mt-3 block text-xs text-muted">
            Job description
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={8}
              placeholder="Paste the job description here…"
              className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink"
            />
          </label>

          {error && <p className="mt-2 text-xs text-urgent">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={runMatch}
              disabled={loading}
              className="flex items-center gap-2 rounded-md bg-indigo px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              <Sparkles size={14} /> {loading ? "Scoring…" : "Score match"}
            </button>
            {mode === "text" && (
              <button
                onClick={getFeedback}
                disabled={feedbackLoading}
                className="flex items-center gap-2 rounded-md border border-indigo px-4 py-2 text-sm font-medium text-indigo disabled:opacity-60"
              >
                <Wrench size={14} /> {feedbackLoading ? "Thinking…" : "Get detailed AI feedback"}
              </button>
            )}
          </div>
        </div>

        <div className="rounded-card border border-border bg-white p-5">
          {!result ? (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center text-sm text-muted">
              <FileText size={26} className="mb-2 text-[#C9C2AE]" />
              Results will show up here once you score a match.
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-indigo">{result.matchScore}%</span>
                <span className="text-sm text-muted">match score</span>
              </div>

              {result.recommendedResumeVersion && (
                <div className="mt-2 rounded-md bg-indigo-soft px-3 py-2 text-sm text-ink">
                  Recommended resume version: <span className="font-mono font-semibold">{result.recommendedResumeVersion}</span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-stage-offer">
                    <Check size={13} /> Strong matches
                  </div>
                  {result.matchingSkills.length === 0 ? (
                    <p className="text-xs text-muted">None detected.</p>
                  ) : (
                    <ul className="space-y-1">
                      {result.matchingSkills.map((s) => (
                        <li key={s} className="text-sm text-ink">{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-urgent">
                    <X size={13} /> Missing skills
                  </div>
                  {result.missingSkills.length === 0 ? (
                    <p className="text-xs text-muted">None — full coverage.</p>
                  ) : (
                    <ul className="space-y-1">
                      {result.missingSkills.map((s) => (
                        <li key={s} className="text-sm text-ink">{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {result.versions.length > 1 && (
                <div className="mt-5 border-t border-[#EFECE3] pt-4">
                  <div className="mb-2 text-xs font-semibold text-muted">All versions compared</div>
                  {result.versions.map((v) => (
                    <div key={v.resumeVersionId} className="flex justify-between border-b border-[#EFECE3] py-1.5 text-sm last:border-0">
                      <span className="font-mono text-ink">{v.label}</span>
                      <span className="text-muted">{v.matchScore}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(feedback || feedbackLoading || feedbackError) && (
        <div className="mt-5 rounded-card border border-border bg-white p-5">
          <div className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
            <Wrench size={15} className="text-indigo" /> Detailed feedback
          </div>

          {feedbackLoading && <p className="text-sm text-muted">Reading your resume against the JD…</p>}

          {feedbackNotConfigured && (
            <div className="flex items-start gap-2 rounded-md border border-[#C9C2AE] bg-paper p-3 text-xs text-ink">
              <AlertCircle size={14} className="mt-0.5 shrink-0 text-stage-oa" />
              <span>
                Needs an LLM key in <code className="rounded bg-white px-1 py-0.5 font-mono">.env</code> — <code className="rounded bg-white px-1 py-0.5 font-mono">ANTHROPIC_API_KEY</code>,{" "}
                <code className="rounded bg-white px-1 py-0.5 font-mono">DEEPSEEK_API_KEY</code>, or{" "}
                <code className="rounded bg-white px-1 py-0.5 font-mono">GEMINI_API_KEY</code> with a matching{" "}
                <code className="rounded bg-white px-1 py-0.5 font-mono">LLM_PROVIDER</code>. See the README.
              </span>
            </div>
          )}
          {feedbackError && !feedbackNotConfigured && <p className="text-xs text-urgent">{feedbackError}</p>}

          {feedback && (
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-bold text-indigo">{feedback.matchScore}</span>
                <span className="text-sm text-muted">/ 100 match score</span>
              </div>
              <p className="mt-2 rounded-md bg-indigo-soft px-3 py-2 text-sm text-ink">{feedback.summary}</p>

              {feedback.criticalFixes.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-urgent">
                    <Wrench size={13} /> Critical fixes
                  </div>
                  <ul className="list-disc space-y-1 pl-4">
                    {feedback.criticalFixes.map((fix, i) => (
                      <li key={i} className="text-sm text-ink">{fix}</li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.missingKeywords.length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-stage-oa">
                    <AlertTriangle size={13} /> Missing keywords
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.missingKeywords.map((kw, i) => (
                      <span key={i} className="rounded-full border border-border bg-paper px-2.5 py-1 text-xs text-ink">{kw}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {recentMatches.length > 0 && (
        <div className="mt-6 rounded-card border border-border bg-white p-5">
          <div className="mb-3 font-display text-sm font-semibold text-ink">Recent matches</div>
          {recentMatches.map((m) => (
            <div key={m.id} className="flex items-center justify-between border-b border-[#EFECE3] py-2 last:border-0">
              <span className="text-sm text-ink">
                {m.jdCompany || "Untitled JD"} {m.jdRole ? `— ${m.jdRole}` : ""}
                {m.resumeVersion && <span className="ml-2 font-mono text-xs text-muted">({m.resumeVersion.label})</span>}
              </span>
              <span className="font-mono text-xs text-muted">{m.matchScore}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
