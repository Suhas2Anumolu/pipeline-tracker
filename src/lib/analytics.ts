import type { JobWithResume, ResumeStats, AnalyticsSummary } from "@/types";
import { STAGE_ORDER, stageIndex, SOURCE_LABEL } from "@/types";

export function computeResumeStats(jobs: JobWithResume[]): ResumeStats[] {
  const byVersion = new Map<string, JobWithResume[]>();
  for (const job of jobs) {
    const label = job.resumeVersion?.label ?? "No resume tagged";
    if (!byVersion.has(label)) byVersion.set(label, []);
    byVersion.get(label)!.push(job);
  }

  return Array.from(byVersion.entries()).map(([resumeVersion, versionJobs]) => {
    const applications = versionJobs.length;
    const interviews = versionJobs.filter((j) => stageIndex(j.peak) >= stageIndex("INTERVIEWING")).length;
    const offers = versionJobs.filter((j) => j.peak === "OFFER").length;
    const conversion = applications ? Math.round((interviews / applications) * 100) : 0;
    return { resumeVersion, applications, interviews, offers, conversion };
  });
}

export function computeFunnel(jobs: JobWithResume[]) {
  return STAGE_ORDER.map((stage) => ({
    stage,
    count: jobs.filter((j) => stageIndex(j.peak) >= stageIndex(stage)).length,
  }));
}

export function computeAnalyticsSummary(jobs: JobWithResume[]): AnalyticsSummary {
  const applications = jobs.length;
  const interviews = jobs.filter((j) => stageIndex(j.peak) >= stageIndex("INTERVIEWING")).length;
  const offers = jobs.filter((j) => j.peak === "OFFER").length;
  const responses = jobs.filter((j) => stageIndex(j.peak) >= stageIndex("OA")).length;
  const responseRate = applications ? Math.round((responses / applications) * 100) : 0;
  const interviewRate = applications ? Math.round((interviews / applications) * 100) : 0;
  return { applications, interviews, offers, responseRate, interviewRate };
}

export function computeSourceRanking(jobs: JobWithResume[]) {
  const bySource = new Map<string, { source: string; applications: number; interviews: number }>();
  for (const job of jobs) {
    const label = SOURCE_LABEL[job.source];
    if (!bySource.has(label)) bySource.set(label, { source: label, applications: 0, interviews: 0 });
    const entry = bySource.get(label)!;
    entry.applications += 1;
    if (stageIndex(job.peak) >= stageIndex("INTERVIEWING")) entry.interviews += 1;
  }
  return Array.from(bySource.values()).sort((a, b) => b.interviews - a.interviews);
}
