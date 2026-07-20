"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ResumeVersion, Source } from "@prisma/client";
import type { JobWithResume } from "@/types";
import { SOURCE_LABEL } from "@/types";

const SOURCES = Object.keys(SOURCE_LABEL) as Source[];

export default function AddJobForm({
  resumeVersions,
  onAdd,
  onClose,
}: {
  resumeVersions: ResumeVersion[];
  onAdd: (job: JobWithResume) => void;
  onClose: () => void;
}) {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [source, setSource] = useState<Source>("LINKEDIN");
  const [resumeVersionId, setResumeVersionId] = useState(resumeVersions[0]?.id ?? "");
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!company || !role) return;
    setSubmitting(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        role,
        source,
        resumeVersionId: resumeVersionId || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) return;
    const job: JobWithResume = await res.json();
    onAdd(job);
  }

  const inputClass = "mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-ink";

  return (
    <div className="mb-5 rounded-card border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-ink">Log a new application</span>
        <button onClick={onClose} aria-label="Close" className="text-[#9A9484]">
          <X size={16} />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-muted">
          Company
          <input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Google" />
        </label>
        <label className="text-xs text-muted">
          Role
          <input className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} placeholder="SWE Intern" />
        </label>
        <label className="text-xs text-muted">
          Resume version
          <select className={inputClass} value={resumeVersionId} onChange={(e) => setResumeVersionId(e.target.value)}>
            <option value="">None</option>
            {resumeVersions.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-muted">
          Source
          <select className={inputClass} value={source} onChange={(e) => setSource(e.target.value as Source)}>
            {SOURCES.map((s) => (
              <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="col-span-2 text-xs text-muted">
          Apply-by deadline
          <input type="date" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>
      </div>
      <button
        onClick={submit}
        disabled={submitting}
        className="mt-3.5 rounded-md bg-indigo px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {submitting ? "Adding…" : "Add to pipeline"}
      </button>
    </div>
  );
}
