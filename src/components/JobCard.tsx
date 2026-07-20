"use client";

import { useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { ArrowRight, ChevronDown, Clock, Trash2, Plus, X, ExternalLink } from "lucide-react";
import type { InterviewRound } from "@prisma/client";
import type { JobWithResume } from "@/types";
import { SOURCE_LABEL } from "@/types";
import FollowUpSection from "@/components/FollowUpSection";

const STAGE_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  APPLIED: { bg: "#EFECE3", border: "#C9C2AE", text: "#5B5647" },
  OA: { bg: "#F6E7C9", border: "#C08A2E", text: "#6B4E17" },
  INTERVIEWING: { bg: "#DCE7F7", border: "#2F6FBF", text: "#1E4C87" },
  OFFER: { bg: "#DCEEE3", border: "#1F8A5F", text: "#175E41" },
  REJECTED: { bg: "#EFDCD9", border: "#9C4A42", text: "#6E332D" },
};

function InterviewRoundsSection({ jobId, initialRounds }: { jobId: string; initialRounds: InterviewRound[] }) {
  const [rounds, setRounds] = useState<InterviewRound[]>(initialRounds);
  const [expanded, setExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [roundName, setRoundName] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [outcome, setOutcome] = useState("");
  const [questions, setQuestions] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function addRound() {
    if (!roundName.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/jobs/${jobId}/interview-rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundName,
        interviewer: interviewer || undefined,
        outcome: outcome || undefined,
        questions: questions || undefined,
      }),
    });
    setSubmitting(false);
    if (!res.ok) return;
    const round: InterviewRound = await res.json();
    setRounds((r) => [round, ...r]);
    setRoundName("");
    setInterviewer("");
    setOutcome("");
    setQuestions("");
    setShowForm(false);
    setExpanded(true);
  }

  async function deleteRound(roundId: string) {
    setRounds((r) => r.filter((x) => x.id !== roundId));
    await fetch(`/api/jobs/${jobId}/interview-rounds/${roundId}`, { method: "DELETE" });
  }

  return (
    <div className="mt-2 border-t border-[#EFECE3] pt-2">
      <div className="flex items-center justify-between">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[11.5px] text-muted">
          <ChevronDown size={12} style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
          {rounds.length > 0 ? `${rounds.length} interview round${rounds.length > 1 ? "s" : ""}` : "interview rounds"}
        </button>
        <button onClick={() => { setShowForm(!showForm); setExpanded(true); }} className="flex items-center gap-0.5 text-[11px] text-indigo">
          <Plus size={11} /> add
        </button>
      </div>

      {expanded && (
        <div className="mt-1.5">
          {rounds.length === 0 && !showForm && <p className="text-[11px] text-[#9A9484]">No rounds logged yet.</p>}
          {rounds.map((round) => (
            <div key={round.id} className="mb-1.5 rounded-md bg-paper p-2">
              <div className="flex items-start justify-between">
                <span className="font-display text-[11.5px] font-semibold text-ink">{round.roundName}</span>
                <button onClick={() => deleteRound(round.id)} aria-label="Delete round" className="text-[#B4AF9F]">
                  <X size={11} />
                </button>
              </div>
              {round.interviewer && <div className="text-[10.5px] text-muted">with {round.interviewer}</div>}
              {round.outcome && <div className="mt-0.5 text-[10.5px] font-medium text-ink">{round.outcome}</div>}
              {round.questions && <div className="mt-1 text-[10.5px] leading-relaxed text-muted">{round.questions}</div>}
            </div>
          ))}

          {showForm && (
            <div className="mt-1.5 space-y-1.5 rounded-md border border-border bg-white p-2">
              <input
                value={roundName}
                onChange={(e) => setRoundName(e.target.value)}
                placeholder="Round name (e.g. Phone screen)"
                className="w-full rounded border border-border px-2 py-1 text-[11px]"
              />
              <input
                value={interviewer}
                onChange={(e) => setInterviewer(e.target.value)}
                placeholder="Interviewer (optional)"
                className="w-full rounded border border-border px-2 py-1 text-[11px]"
              />
              <input
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                placeholder="Outcome (e.g. Passed, Pending)"
                className="w-full rounded border border-border px-2 py-1 text-[11px]"
              />
              <textarea
                value={questions}
                onChange={(e) => setQuestions(e.target.value)}
                placeholder="Questions asked / notes (optional)"
                rows={2}
                className="w-full rounded border border-border px-2 py-1 text-[11px]"
              />
              <button
                onClick={addRound}
                disabled={submitting}
                className="rounded bg-indigo px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Save round"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function JobCard({
  job,
  onAdvance,
  onReject,
  onDelete,
}: {
  job: JobWithResume;
  onAdvance: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const c = STAGE_COLOR[job.status];
  const daysLeft = job.status === "APPLIED" && job.deadline ? differenceInCalendarDays(new Date(job.deadline), new Date()) : null;

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", job.id)}
      className="mb-2.5 cursor-grab rounded-[10px] border border-border bg-white px-3.5 py-3 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-1">
            <span className="font-display text-sm font-semibold text-ink">{job.company}</span>
            {job.sourceUrl && (
              <a href={job.sourceUrl} target="_blank" rel="noreferrer" className="text-[#B4AF9F]" aria-label="Open posting">
                <ExternalLink size={11} />
              </a>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted">{job.role}</div>
        </div>
        <button onClick={onDelete} aria-label="Delete" className="text-[#B4AF9F]">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {job.resumeVersion && (
          <span className="rounded border border-border bg-paper px-1.5 py-0.5 font-mono text-[10.5px] text-muted">
            {job.resumeVersion.label}
          </span>
        )}
        <span className="rounded border border-border bg-paper px-1.5 py-0.5 text-[10.5px] text-muted">
          {SOURCE_LABEL[job.source]}
        </span>
      </div>

      {daysLeft !== null && (
        <div className="mt-2 flex items-center gap-1 font-mono text-[11px]" style={{ color: daysLeft <= 3 ? "#C1440E" : "#8B8578" }}>
          <Clock size={11} />
          {daysLeft >= 0 ? `${daysLeft}d to apply-by deadline` : "deadline passed"}
        </div>
      )}

      {job.notes && (
        <div className="mt-2">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-[11.5px] text-muted">
            <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none" }} />
            notes
          </button>
          {open && <div className="mt-1 text-xs leading-relaxed text-muted">{job.notes}</div>}
        </div>
      )}

      {job.status !== "OFFER" && job.status !== "REJECTED" && (
        <div className="mt-2.5 flex gap-1.5">
          <button
            onClick={onAdvance}
            className="flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-[11.5px] font-medium"
            style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
          >
            Advance <ArrowRight size={11} />
          </button>
          <button onClick={onReject} className="rounded-md border border-border px-2.5 py-1 text-[11.5px] text-stage-rejected">
            Reject
          </button>
        </div>
      )}

      <InterviewRoundsSection jobId={job.id} initialRounds={job.interviewRounds} />
      <FollowUpSection jobId={job.id} />
    </div>
  );
}
