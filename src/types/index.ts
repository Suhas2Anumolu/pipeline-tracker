import type { Job, ResumeVersion, Source, Stage, Status, InterviewRound } from "@prisma/client";

export type JobWithResume = Job & { resumeVersion: ResumeVersion | null; interviewRounds: InterviewRound[] };

export const STAGE_ORDER: Stage[] = ["APPLIED", "OA", "INTERVIEWING", "OFFER"];

export const STAGE_LABEL: Record<Stage | "REJECTED", string> = {
  APPLIED: "Applied",
  OA: "OA",
  INTERVIEWING: "Interviewing",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export const SOURCE_LABEL: Record<Source, string> = {
  LINKEDIN: "LinkedIn",
  SIMPLIFY: "Simplify",
  REFERRAL: "Referral",
  COMPANY_SITE: "Company site",
  GITHUB_REPO: "GitHub repo",
  OTHER: "Other",
};

export function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage);
}

export type ResumeStats = {
  resumeVersion: string;
  applications: number;
  interviews: number;
  offers: number;
  conversion: number;
};

export type AnalyticsSummary = {
  applications: number;
  interviews: number;
  offers: number;
  responseRate: number;
  interviewRate: number;
};
