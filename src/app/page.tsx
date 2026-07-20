import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LayoutGrid,
  Compass,
  FileText,
  BarChart2,
  MousePointerClick,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import Logo from "@/components/Logo";

const STAGE_COLOR = {
  applied: { bg: "#EFECE3", border: "#C9C2AE", text: "#5B5647" },
  oa: { bg: "#F6E7C9", border: "#C08A2E", text: "#6B4E17" },
  interviewing: { bg: "#DCE7F7", border: "#2F6FBF", text: "#1E4C87" },
  offer: { bg: "#DCEEE3", border: "#1F8A5F", text: "#175E41" },
} as const;

const MOCK_CARDS: { stage: keyof typeof STAGE_COLOR; company: string; role: string }[] = [
  { stage: "applied", company: "Stripe", role: "Backend Intern" },
  { stage: "oa", company: "Databricks", role: "SWE Intern" },
  { stage: "interviewing", company: "Google", role: "SWE Intern" },
  { stage: "offer", company: "Meta", role: "SWE Intern" },
];

const FEATURES = [
  {
    icon: LayoutGrid,
    title: "Kanban pipeline board",
    body: "Drag applications from Applied through Offer. The board tracks the furthest stage you ever reached, so a later rejection still counts correctly in your stats.",
  },
  {
    icon: Compass,
    title: "Discover: aggregated internships",
    body: "Pulled from company Greenhouse/Lever boards and the community GitHub internship list — searchable, deduped, one click to add to your pipeline.",
  },
  {
    icon: FileText,
    title: "AI resume feedback",
    body: "Upload a resume, get a match score against any job description, missing keywords, and specific critical fixes — not just generic keyword overlap.",
  },
  {
    icon: BarChart2,
    title: "Analytics that actually help",
    body: "Funnel by stage, best-performing sources, and which resume version converts best — the numbers you'd otherwise track in a spreadsheet.",
  },
  {
    icon: MousePointerClick,
    title: "Chrome extension",
    body: "On any job posting, one click captures company, role, and link straight into your board. No retyping.",
  },
  {
    icon: Sparkles,
    title: "AI follow-up drafts",
    body: "Thank-you notes, recruiter check-ins, referral asks, and negotiation drafts — generated from that specific application's context.",
  },
];

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="bg-paper">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-14 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1 font-mono text-xs text-muted">
              <Sparkles size={12} className="text-indigo" /> Built for recruiting season
            </div>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink md:text-5xl">
              Stop losing track of your internship grind.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted">
              One board for every application, every resume version, and every deadline — plus the analytics that tell you what's actually working.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-md bg-indigo px-5 py-2.5 text-sm font-semibold text-white"
              >
                Get started free <ArrowRight size={15} />
              </Link>
              <Link href="/login" className="text-sm font-medium text-ink underline">
                Sign in
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
              <span className="flex items-center gap-1.5"><Check size={13} className="text-stage-offer" /> No credit card</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-stage-offer" /> Sign in with Google</span>
              <span className="flex items-center gap-1.5"><Check size={13} className="text-stage-offer" /> Your data, your Postgres</span>
            </div>
          </div>

          {/* Mini kanban mockup */}
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                <Logo size={14} /> Recruiting OS
              </span>
              <span className="font-display text-xs font-semibold text-ink">Board</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {MOCK_CARDS.map((card) => {
                const c = STAGE_COLOR[card.stage];
                return (
                  <div key={card.company} className="rounded-lg border border-border bg-white p-2">
                    <div
                      className="mb-2 rounded px-1.5 py-0.5 text-center font-mono text-[9px] font-medium"
                      style={{ background: c.bg, color: c.text }}
                    >
                      {card.stage}
                    </div>
                    <div className="rounded-md border border-border p-1.5">
                      <div className="font-display text-[11px] font-semibold text-ink">{card.company}</div>
                      <div className="mt-0.5 text-[9px] text-muted">{card.role}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#EFECE3] pt-3">
              <div className="rounded-md bg-paper px-2 py-1.5 text-center">
                <div className="font-display text-sm font-bold text-ink">247</div>
                <div className="font-mono text-[9px] text-muted">applications</div>
              </div>
              <div className="rounded-md bg-paper px-2 py-1.5 text-center">
                <div className="font-display text-sm font-bold text-ink">19</div>
                <div className="font-mono text-[9px] text-muted">interviews</div>
              </div>
              <div className="rounded-md bg-paper px-2 py-1.5 text-center">
                <div className="font-display text-sm font-bold text-indigo">26%</div>
                <div className="font-mono text-[9px] text-muted">best resume</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 max-w-lg">
            <h2 className="font-display text-2xl font-bold text-ink">Everything the grind actually needs</h2>
            <p className="mt-2 text-sm text-muted">Not another spreadsheet. One place that tracks the whole cycle, from finding the role to knowing which resume got you the interview.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-card border border-border bg-paper p-5">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-indigo-soft text-indigo">
                  <f.icon size={17} />
                </div>
                <div className="font-display text-sm font-semibold text-ink">{f.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-muted">
            Plus: a recruiting-season countdown dashboard, LeetCode stats tracking, and a round-by-round interview tracker on every card.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mb-8 font-display text-2xl font-bold text-ink">How it works</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Log or import an application", body: "Add it by hand, find it on Discover, or capture it with the Chrome extension while browsing." },
              { step: "2", title: "Drag it through the pipeline", body: "Applied → OA → Interviewing → Offer. Every card keeps its resume version, source, and notes." },
              { step: "3", title: "See what's actually working", body: "Funnel, best sources, and resume conversion rates update automatically as you go." },
            ].map((s) => (
              <div key={s.step}>
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo font-display text-sm font-bold text-white">
                  {s.step}
                </div>
                <div className="font-display text-sm font-semibold text-ink">{s.title}</div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-white py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="font-display text-2xl font-bold text-ink">Recruiting season doesn't wait. Neither should your tracker.</h2>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="flex items-center gap-2 rounded-md bg-indigo px-5 py-2.5 text-sm font-semibold text-white">
              Get started free <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
            <Logo size={20} /> Pipeline
          </div>
          <p className="text-xs text-muted">Built for the recruiting grind.</p>
        </div>
      </footer>
    </div>
  );
}
