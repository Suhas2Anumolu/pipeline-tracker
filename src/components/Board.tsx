"use client";

import { useMemo, useState } from "react";
import type { Job, ResumeVersion, Status } from "@prisma/client";
import { Plus } from "lucide-react";
import type { JobWithResume } from "@/types";
import { STAGE_LABEL } from "@/types";
import JobCard from "@/components/JobCard";
import AddJobForm from "@/components/AddJobForm";

const COLUMNS: Status[] = ["APPLIED", "OA", "INTERVIEWING", "OFFER", "REJECTED"];

const COLUMN_STYLE: Record<Status, { bg: string; border: string; text: string }> = {
  APPLIED: { bg: "#EFECE3", border: "#C9C2AE", text: "#5B5647" },
  OA: { bg: "#F6E7C9", border: "#C08A2E", text: "#6B4E17" },
  INTERVIEWING: { bg: "#DCE7F7", border: "#2F6FBF", text: "#1E4C87" },
  OFFER: { bg: "#DCEEE3", border: "#1F8A5F", text: "#175E41" },
  REJECTED: { bg: "#EFDCD9", border: "#9C4A42", text: "#6E332D" },
};

export default function Board({
  initialJobs,
  resumeVersions,
}: {
  initialJobs: JobWithResume[];
  resumeVersions: ResumeVersion[];
}) {
  const [jobs, setJobs] = useState<JobWithResume[]>(initialJobs);
  const [showAdd, setShowAdd] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<Status | null>(null);
  const [sessionError, setSessionError] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const stage of COLUMNS) c[stage] = jobs.filter((j) => j.status === stage).length;
    return c;
  }, [jobs]);

  async function patchJob(id: string, data: Partial<Pick<Job, "status" | "notes">>) {
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.status === 401) {
      setSessionError(true);
      return;
    }
    if (!res.ok) return;
    const updated: JobWithResume = await res.json();
    setJobs((js) => js.map((j) => (j.id === id ? updated : j)));
  }

  async function deleteJob(id: string) {
    setJobs((js) => js.filter((j) => j.id !== id));
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.status === 401) setSessionError(true);
  }

  function handleAdd(job: JobWithResume) {
    setJobs((js) => [job, ...js]);
    setShowAdd(false);
  }

  const nextStatus: Record<Status, Status> = {
    APPLIED: "OA",
    OA: "INTERVIEWING",
    INTERVIEWING: "OFFER",
    OFFER: "OFFER",
    REJECTED: "REJECTED",
  };

  return (
    <div>
      {sessionError && (
        <div className="mb-5 rounded-card border border-urgent bg-white px-4 py-3 text-sm text-urgent">
          Your session is out of date (this usually means the database was reset since you last signed in).{" "}
          <a href="/api/auth/signout" className="font-semibold underline">
            Sign out and sign back in
          </a>{" "}
          to fix it.
        </div>
      )}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="font-mono text-xs uppercase tracking-wide text-muted">Recruiting OS</div>
          <h1 className="font-display text-2xl font-bold text-ink">Board</h1>
        </div>
      </div>

      {showAdd ? (
        <AddJobForm resumeVersions={resumeVersions} onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="mb-5 flex items-center gap-2 rounded-card border border-dashed border-[#C9C2AE] bg-white px-4 py-2.5 text-sm text-indigo"
        >
          <Plus size={15} /> Log application
        </button>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {COLUMNS.map((stage) => {
          const style = COLUMN_STYLE[stage];
          return (
            <div
              key={stage}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStage(stage);
              }}
              onDragLeave={() => setDragOverStage(null)}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                patchJob(id, { status: stage });
                setDragOverStage(null);
              }}
              className="min-w-[240px] flex-none rounded-card"
              style={{ background: dragOverStage === stage ? "#EFECE3" : "transparent" }}
            >
              <div
                className="mb-3 flex items-center justify-between px-2 py-1.5"
                style={{ borderBottom: `2px solid ${style.border}` }}
              >
                <span className="font-display text-sm font-semibold" style={{ color: style.text }}>
                  {STAGE_LABEL[stage]}
                </span>
                <span
                  className="rounded px-1.5 py-0.5 font-mono text-xs"
                  style={{ background: style.bg, color: style.text }}
                >
                  {counts[stage] ?? 0}
                </span>
              </div>
              <div className="min-h-[40px] px-0.5">
                {jobs.filter((j) => j.status === stage).length === 0 ? (
                  <div className="p-4 text-center font-sans text-xs text-[#9A9484]">Nothing here</div>
                ) : (
                  jobs
                    .filter((j) => j.status === stage)
                    .map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onAdvance={() => patchJob(job.id, { status: nextStatus[job.status] })}
                        onReject={() => patchJob(job.id, { status: "REJECTED" })}
                        onDelete={() => deleteJob(job.id)}
                      />
                    ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
