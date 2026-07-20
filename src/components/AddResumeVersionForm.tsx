"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, Plus, X } from "lucide-react";

export default function AddResumeVersionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/resume-parse", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Couldn't parse that file.");
      return;
    }
    const data = await res.json();
    setResumeText(data.text);
    setUploadedFileName(file.name);
    if (!label) setLabel(file.name.replace(/\.[^.]+$/, ""));
  }

  async function submit() {
    if (!label.trim()) {
      setError("Give this version a label, e.g. Resume_V9.");
      return;
    }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/resume-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, resumeText: resumeText || undefined }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.fieldErrors?.label?.[0] ?? body?.error ?? "Couldn't save that version.");
      return;
    }
    router.refresh();
    setOpen(false);
    setLabel("");
    setResumeText("");
    setUploadedFileName("");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 flex items-center gap-2 rounded-card border border-dashed border-[#C9C2AE] bg-white px-4 py-2.5 text-sm text-indigo"
      >
        <Plus size={15} /> Add resume version
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-card border border-border bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm font-semibold text-ink">Add resume version</span>
        <button onClick={() => setOpen(false)} aria-label="Close" className="text-[#9A9484]">
          <X size={16} />
        </button>
      </div>

      <label className="block text-xs text-muted">
        Label
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Resume_V9" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
      </label>

      <div className="mt-3 flex items-center gap-2">
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
        Resume text (used for match scoring — optional but recommended)
        <textarea
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={6}
          placeholder="Upload a file above, or paste text here…"
          className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink"
        />
      </label>

      {error && <p className="mt-2 text-xs text-urgent">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="mt-3 flex items-center gap-1.5 rounded-md bg-indigo px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        <Plus size={14} /> {submitting ? "Saving…" : "Save version"}
      </button>
    </div>
  );
}
