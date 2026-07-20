import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeResumeStats } from "@/lib/analytics";
import ResumeChart from "@/components/ResumeChart";
import AddResumeVersionForm from "@/components/AddResumeVersionForm";

export default async function ResumesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id },
    include: { resumeVersion: true, interviewRounds: true },
  });

  const stats = computeResumeStats(jobs).filter((s) => s.applications > 0);

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-xs uppercase tracking-wide text-muted">Recruiting OS</div>
        <h1 className="font-display text-2xl font-bold text-ink">Resume versions</h1>
      </div>

      <AddResumeVersionForm />

      <div className="mb-6 flex flex-wrap gap-3">
        {stats.map((r) => (
          <div key={r.resumeVersion} className="flex-1 rounded-card border border-border bg-white p-4" style={{ minWidth: 200 }}>
            <div className="font-mono text-sm font-medium text-ink">{r.resumeVersion}</div>
            <div className="mt-1.5 font-display text-3xl font-bold text-indigo">{r.conversion}%</div>
            <div className="mt-0.5 text-xs text-muted">interview conversion</div>
            <div className="mt-2.5 flex gap-3.5 text-xs text-muted">
              <span>{r.applications} apps</span>
              <span>{r.interviews} interviews</span>
              <span>{r.offers} offers</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-card border border-border bg-white p-5">
        <div className="mb-3.5 font-display text-sm font-semibold text-ink">Conversion rate by resume version</div>
        <ResumeChart data={stats} />
      </div>
    </div>
  );
}
