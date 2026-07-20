import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { Clock, TrendingUp } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeAnalyticsSummary, computeFunnel, computeSourceRanking } from "@/lib/analytics";
import FunnelChart from "@/components/FunnelChart";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="min-w-[130px] flex-1 rounded-card border border-border bg-white p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 font-display text-[26px] font-bold text-ink">{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[11px] text-[#8B8578]">{sub}</div>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id },
    include: { resumeVersion: true, interviewRounds: true },
  });

  const summary = computeAnalyticsSummary(jobs);
  const funnel = computeFunnel(jobs);
  const sources = computeSourceRanking(jobs);
  const deadlines = jobs
    .filter((j) => j.status === "APPLIED" && j.deadline)
    .map((j) => ({ ...j, daysLeft: differenceInCalendarDays(new Date(j.deadline!), new Date()) }))
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <div>
      <div className="mb-6">
        <div className="font-mono text-xs uppercase tracking-wide text-muted">Recruiting OS</div>
        <h1 className="font-display text-2xl font-bold text-ink">Analytics</h1>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <StatCard label="Applications" value={summary.applications} />
        <StatCard label="Interviews" value={summary.interviews} />
        <StatCard label="Offers" value={summary.offers} />
        <StatCard label="Response rate" value={`${summary.responseRate}%`} sub="reached OA or beyond" />
        <StatCard label="Interview rate" value={`${summary.interviewRate}%`} sub="reached interviewing" />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr]">
        <div className="rounded-card border border-border bg-white p-5">
          <div className="mb-3.5 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
            <TrendingUp size={15} color="#2F3B6B" /> Pipeline funnel
          </div>
          <FunnelChart data={funnel} />
        </div>

        <div className="rounded-card border border-border bg-white p-5">
          <div className="mb-3 font-display text-sm font-semibold text-ink">Best sources</div>
          {sources.map((s, i) => (
            <div key={s.source} className="flex items-center justify-between border-b border-[#EFECE3] py-2 last:border-0">
              <span className="text-sm text-ink">{i + 1}. {s.source}</span>
              <span className="font-mono text-xs text-muted">{s.interviews}/{s.applications} interviews</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-border bg-white p-5">
        <div className="mb-3 flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
          <Clock size={15} color="#C1440E" /> Upcoming deadlines
        </div>
        {deadlines.length === 0 ? (
          <div className="py-3 text-center text-xs text-[#9A9484]">No open applications with deadlines</div>
        ) : (
          deadlines.map((d) => (
            <div key={d.id} className="flex justify-between border-b border-[#EFECE3] py-1.5 last:border-0">
              <span className="text-sm text-ink">{d.company} — {d.role}</span>
              <span className="font-mono text-xs" style={{ color: d.daysLeft <= 3 ? "#C1440E" : "#6B6558" }}>{d.daysLeft}d left</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
