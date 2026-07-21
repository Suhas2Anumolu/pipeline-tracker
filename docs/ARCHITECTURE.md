# Architecture notes

Implementation details, design decisions, and the reasoning behind them — for contributors and future maintainers. If you're just looking to use or deploy Pipeline, see the [main README](../README.md) instead.

---

# Pipeline — recruiting tracker (Next.js + TypeScript + Prisma + Postgres)

MVP scaffold: auth, job/kanban tracker, resume version tracking, analytics dashboard.
This is the real codebase version of the interactive demo — same data model, same design tokens, backed by Postgres instead of in-memory state.

## Stack

- Next.js 14 (App Router) + TypeScript
- Postgres + Prisma ORM
- NextAuth.js (Credentials provider wired up for local/demo use; swap in GitHub/Google OAuth for production)
- Tailwind CSS
- Recharts for charts

## Getting started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start Postgres.** Easiest with Docker:
   ```bash
   docker run --name pipeline-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pipeline_tracker -p 5432:5432 -d postgres:16
   ```
   Or use a hosted Postgres (Neon, Supabase, Railway) and drop its connection string into `.env`.

3. **Configure environment**
   ```bash
   cp .env.example .env
   openssl rand -base64 32   # paste the output into NEXTAUTH_SECRET
   ```

4. **Push schema and seed demo data**
   ```bash
   npx prisma migrate dev --name init
   npm run prisma:seed
   ```
   This creates a demo account: `demo@pipeline.dev` / `demo1234`, with 8 seeded applications and two resume versions pre-loaded with resume text (for the Match tool's compare-versions mode).

   **Already have this project set up from before?** Pull the latest files, then run a fresh migration to pick up the new `JobPosting`, `ResumeMatch`, `ApiToken`, `SeasonWatch`, and `LeetCodeStats` models plus the `resumeText` field on `ResumeVersion` and `sourceUrl` field on `Job`:
   ```bash
   npx prisma migrate dev --name add_leetcode_stats
   ```

5. **Pull in real internship postings (optional but recommended)**
   ```bash
   npm run ingest
   ```
   Populates the Discover tab from three sources — all public and ToS-compliant, no scraping of sites that prohibit it:
   - Company Greenhouse/Lever public job-board APIs, for a curated company list in `src/lib/sources/companies.ts`
   - The [SimplifyJobs internship GitHub list](https://github.com/SimplifyJobs/Summer2026-Internships) — a public, MIT-licensed dataset maintained specifically for this kind of use, which is how community-sourced LinkedIn/Simplify-found roles show up without us touching either site directly

   Run it on a schedule (cron, GitHub Actions, Vercel cron) to keep listings fresh — it's idempotent and marks postings it no longer sees as inactive.

6. **Run the app**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`, sign in with the demo account, and you'll land on the board.

## Deploying to Vercel

Local dev (above) uses Docker Postgres and runs fine on localhost. Production needs a few things Vercel's serverless environment doesn't give you for free — this section covers all of them.

### 1. A hosted, poolable Postgres

Vercel's serverless functions can't reach a database running on your own machine or in local Docker. Use a hosted Postgres — [Neon](https://neon.tech) and [Supabase](https://supabase.com) both have free tiers built for exactly this and work well with Prisma.

**If using Neon specifically**: it gives you two connection strings — a pooled one (hostname contains `-pooler`) and a direct one. Serverless functions open many short-lived connections per request, and Postgres has a hard connection limit, so pooling isn't optional at any real traffic level. Set:
```
DATABASE_URL=<the -pooler connection string>
DIRECT_URL=<the direct connection string>
```
`schema.prisma`'s datasource block already has `directUrl` wired up for this — Prisma uses `DATABASE_URL` for queries and `DIRECT_URL` only for running migrations, which need an unpooled connection.

If using plain Supabase or another provider without a separate pooled URL, just set both env vars to the same value.

### 2. Environment variables in Vercel

Set all of these in the Vercel project's Settings → Environment Variables (not just locally in `.env` — Vercel doesn't read your local file):

- `DATABASE_URL`, `DIRECT_URL` — from step 1
- `NEXTAUTH_URL` — your actual deployed URL, e.g. `https://your-app.vercel.app`. Must be exact; NextAuth builds OAuth callback URLs from this.
- `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`, don't reuse the dev one
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — if using Google sign-in, **add your production URL's callback** in the Google Cloud Console credentials page: `https://your-app.vercel.app/api/auth/callback/google`. The localhost redirect URI from dev won't work in production; you need both listed if you want to keep using local dev too.
- `LLM_PROVIDER` + whichever key (`ANTHROPIC_API_KEY` / `DEEPSEEK_API_KEY` / `GEMINI_API_KEY`) — for the follow-up generator and resume feedback
- `CRON_SECRET` — generate with `openssl rand -hex 32`, needed for the scheduled Discover refresh (see below)

### 3. Build command

Vercel's default build (`next build`) never runs Prisma migrations — there's no separate "migration step" in a standard Vercel deployment, so if you skip this your production database schema just never updates. In the Vercel project's Settings → General → Build & Development Settings, override the **Build Command** to:
```
npm run vercel-build
```
This runs `prisma generate && prisma migrate deploy && next build` — migrations apply automatically on every deploy.

### 4. Don't seed production with the demo account

`npm run prisma:seed` creates `demo@pipeline.dev` with a publicly-known password (`demo1234`) — fine for local dev, a real security hole if it ends up in a production database real users can reach. Don't run the seed script against your production `DATABASE_URL`. If you want sample data in production for some reason, seed it and then immediately delete that user or rotate its password.

### 5. Keep Discover fresh without a server to run cron on

Vercel serverless functions only run in response to a request — there's no persistent process to run `npm run ingest` on a timer the way you could on a normal server. `.github/workflows/ingest.yml` handles this: a GitHub Actions workflow calls a protected endpoint (`/api/cron/ingest`) every 6 hours via `curl`, which runs the exact same ingestion logic (`src/lib/ingestPostings.ts`) using the app's live database connection.

Set two repository secrets (repo Settings → Secrets and variables → Actions):
```
INGEST_URL   = https://your-app.vercel.app/api/cron/ingest
CRON_SECRET  = the same value you set in Vercel's env vars
```
The workflow also supports manual runs from the Actions tab (`workflow_dispatch`) if you want to trigger a refresh on demand rather than waiting for the schedule. Adjust the cron expression in the yaml if 6 hours is more or less than you want.

If you'd rather not use GitHub Actions, [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs) can call the same endpoint instead (Hobby plan limits cron to once/day; Pro allows more frequent schedules) — the endpoint itself doesn't care who calls it, only that the `Authorization: Bearer <CRON_SECRET>` header matches.

## Project structure

```
.github/workflows/ingest.yml  Scheduled Discover refresh (see Deploying to Vercel)
prisma/schema.prisma       Data model (User, Job, ResumeVersion, InterviewRound, JobPosting)
prisma/seed.ts              Demo data seed script
prisma/ingest.ts            CLI wrapper around src/lib/ingestPostings.ts (local dev)
src/app/api/cron/ingest/    Production ingest endpoint, called by the GitHub Actions workflow
src/lib/ingestPostings.ts   Shared ingestion logic used by both the CLI script and the cron route
prisma/ingest.ts            Pulls postings from Greenhouse/Lever/GitHub into JobPosting
src/lib/sources/            Per-source fetchers + dedupe key logic
src/app/dashboard/          Kanban board (server component + client Board)
src/app/discover/           Aggregated postings feed, search, add-to-pipeline
src/app/resumes/            Resume version stats + chart
src/app/analytics/          Funnel, source ranking, deadlines
src/app/api/jobs/           REST API: list/create/update/delete applications
src/app/api/postings/       REST API: list aggregated postings
src/app/api/auth/           NextAuth route
src/lib/auth.ts             NextAuth config (Credentials provider — swap for OAuth)
src/lib/prisma.ts           Prisma client singleton
src/lib/analytics.ts        Funnel / conversion / source-ranking calculations
src/components/             Board, JobCard, AddJobForm, charts
```

## A note on where postings come from

`npm run ingest` only ever talks to:
- **Greenhouse's `boards-api.greenhouse.io`** and **Lever's `api.lever.co`** — both are public, unauthenticated, unrate-limited-by-key endpoints that companies stand up *specifically* so external job boards can consume them. No ToS conflict.
- **The SimplifyJobs GitHub internship list** — a public, MIT-licensed JSON file maintained by real contributors and Simplify's own daily sync, meant to be read programmatically.

It deliberately does **not** scrape LinkedIn or Simplify's own site directly — both prohibit that in their ToS, and LinkedIn in particular has pursued scrapers legally before (`hiQ v. LinkedIn`). You inherit rough coverage of what students find on those platforms for free, since community members already funnel it into the GitHub list by hand.

## Data model notes

- `Job.status` is the current kanban column (`APPLIED`, `OA`, `INTERVIEWING`, `OFFER`, `REJECTED`).
- `Job.peak` is the furthest stage ever reached, independent of a later rejection. All conversion-rate and funnel math reads from `peak`, not `status` — so a candidate rejected after two interview rounds still counts as "reached interviewing" in the stats. This mirrors the logic in `src/lib/analytics.ts`.
- `ResumeVersion` is scoped per user, so version labels (`Resume_V7`, `Resume_V8`, ...) don't collide across accounts.
- `InterviewRound` is modeled but not yet wired into the UI — it's there for the V2 interview tracker (round-by-round notes, interviewer, outcome).

## Landing page and sign-in

`/` is now a real marketing page (hero, feature grid, mini kanban preview, CTAs) shown to signed-out visitors — signed-in users hitting `/` get redirected straight to `/dashboard`. The header switches between marketing nav (Sign in / Get started) and the full app nav based on session, in `src/app/layout.tsx`.

**Google sign-in** is wired up alongside the Credentials provider — both work together since NextAuth requires JWT sessions when Credentials is one of the providers (already the case here). To enable it:
1. Create an OAuth client at [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Set the authorized redirect URI to `{NEXTAUTH_URL}/api/auth/callback/google` (e.g. `http://localhost:3000/api/auth/callback/google` in dev)
3. Add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` to `.env`

Leave those blank and the Google button simply won't work yet — the Credentials provider (demo account) keeps working regardless.

## Interview tracker (on the board)

Each job card now has an expandable **interview rounds** section — round name, interviewer, outcome, and notes per round, backed by the `InterviewRound` model that was already in the schema. Add rounds inline on any card; no separate page needed. API: `POST /api/jobs/[id]/interview-rounds`, `DELETE /api/jobs/[id]/interview-rounds/[roundId]`.

## Chrome extension (`/pipeline-extension`, separate project)

A companion Manifest V3 extension that captures the job posting you're currently viewing straight into your board — the thing Discover can't do, since Discover only covers the companies in its curated source list. Lives in a sibling folder, not part of this Next.js app, since it's a genuinely separate build target.

**Auth**: it can't reuse your browser session cookie — NextAuth's cookie is `SameSite=Lax`, which browsers deliberately don't send on cross-origin requests like the extension's. Instead there's now a personal API token system:

- **Settings page** (`/settings`) — generate/revoke tokens, shown once on creation (only the sha256 hash is stored, same pattern as GitHub personal access tokens)
- **`POST /api/extension/jobs`** and **`GET /api/extension/me`** — bearer-token-authenticated, CORS-enabled routes just for the extension, kept separate from the session-authenticated `/api/jobs` used by the web app
- `src/lib/extensionAuth.ts` — the bearer-token verification + CORS headers shared by both routes

See `pipeline-extension/README.md` for loading it unpacked and connecting it to a token.

Also added: **`Job.sourceUrl`** — the posting link now flows through from Discover's "add to pipeline" and the extension alike, and shows as a small link icon on the card.

## LeetCode integration (`/leetcode`)

Connect a LeetCode username to see solved-problem counts (by difficulty), current streak, and contest rating. This was flagged early on as needing care: **LeetCode has no official public API** — this reads the same unauthenticated GraphQL endpoint (`leetcode.com/graphql`) their own site uses to render public profile pages. It's public, read-only data (the same thing you'd see visiting the profile yourself), but the endpoint is undocumented and could change or start rate-limiting without notice. Two safeguards because of that:
- Results are cached in `LeetCodeStats` and only refetched at most every 15 minutes (`REFRESH_COOLDOWN_MS` in `src/lib/leetcode.ts`), not on every page load or button click
- Every failure mode has a specific error (username not found vs. LeetCode's API not responding) rather than one opaque failure

**Not built**: the "interview rate before vs. after 200 problems solved" correlation from the original feature list. That needs a historical time series of solved-count snapshots aligned to application dates, which isn't something a single cached snapshot can produce — would need a `LeetCodeStatsHistory` table recording snapshots over time before that becomes a real, non-fabricated analysis. Noting it here rather than faking a correlation with a single data point.

## AI follow-up generator (on the board)

Each job card has a "draft a follow-up" section — thank-you notes, recruiter check-ins, referral requests, and offer negotiation drafts, generated from that specific application's context (company, role, logged interview rounds).

**LLM provider is swappable** (`src/lib/llm.ts`) — set `LLM_PROVIDER` in `.env` to one of:
- `anthropic` (default) — needs `ANTHROPIC_API_KEY` from [console.anthropic.com](https://console.anthropic.com)
- `deepseek` — needs `DEEPSEEK_API_KEY` from [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys). Much cheaper per token (~$0.14/M input as of writing) and new accounts get a one-time 5-million-token grant with no card required — worth knowing that's a free *trial* grant, not a perpetually free API, since pricing pages sometimes blur that distinction. Uses `deepseek-v4-flash` directly rather than the `deepseek-chat` alias, which DeepSeek is retiring.
- `gemini` — needs `GEMINI_API_KEY` from [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Google AI Studio's free tier is rate-limited but genuinely ongoing-free, not a credit that depletes — probably the most "actually free" of the three if you're running this for personal use at low volume. Uses `gemini-3.5-flash`; extended thinking is turned off (`thinkingBudget: 0`) since these are short structured-output tasks that don't need it and it would otherwise eat into the visible output token budget.

Both routes (`/api/jobs/[id]/follow-up`, `/api/match/feedback`) show setup instructions inline if no key is configured, rather than erroring.

## Recruiting season dashboard (`/season`)

Track companies you're waiting on. This is deliberately honest about what data actually exists: there's no public, structured source for "when does Company X's internship program open" — that mostly circulates as word of mouth. So instead of fabricating a calendar, `/season` does two things:
- Cross-references each watched company against **live Discover data** — if there are active postings for it right now, it shows "Open now" with a real count, not a guess
- Lets you record an **expected open date** yourself (from a Reddit thread, last year's timing, whatever you've heard) to get a simple countdown against that

## Resume feedback, upgraded (`/match`)

The keyword matcher and ATS check from before still run instantly and for free, but there's now a **"Get detailed AI feedback"** button (paste-text mode only) that calls the configured LLM as an expert resume reviewer/technical recruiter, scoring against the JD directly rather than just keyword overlap. Returns a match score (0-100), exactly 3 critical fixes, missing keywords, and a brief action-plan summary — prompt lives in `src/lib/resumeFeedback.ts` if you want to tune it. Same `LLM_PROVIDER`/key setup as the follow-up generator above.

## Resume Match Score (`/match`, keyword matcher)

Paste a job description and get a match score, missing skills, and strong matches — either against uploaded/pasted resume text ad hoc, or against all your saved resume versions at once (recommending the best one). Upload a PDF, DOCX, or TXT and the text is extracted server-side (`src/lib/resumeParsing.ts`, using `pdf-parse` / `mammoth`) — or paste text directly.

This runs alongside the AI feedback above as a fast, free, offline complement — no LLM call, just deterministic keyword matching:

1. **ATS parseability check** (`src/lib/atsCheck.ts`) — flags things that are documented, publicly-known ways resumes break in *any* ATS parser: too little extractable text (often a scanned image or heavily graphic template), missing standard section headers, no detectable contact info, and a heuristic for multi-column layouts that get read out of order. This runs automatically on upload.
2. **Skill match scoring** (`src/lib/skills.ts` + `src/lib/match.ts`) — the deterministic keyword-taxonomy matcher described below.

This ships as a deterministic keyword-taxonomy matcher, not embeddings — it works offline with nothing to configure, at the cost of missing genuine semantic matches (e.g. "built scalable backend services" won't be credited against a JD asking for "distributed systems" unless the exact phrase appears). The taxonomy is easy to extend — add entries to `SKILL_TAXONOMY`.

To upgrade to real embeddings-based semantic scoring: swap the body of `scoreMatch()` in `src/lib/match.ts` for a call to an embeddings API (OpenAI's `text-embedding-3-small`, Voyage AI, or similar — Anthropic doesn't expose embeddings directly), then compute cosine similarity between the resume and JD vectors. Worth keeping the keyword extraction alongside it even then, since "which skills are missing" as a checklist is more actionable to a person than a bare similarity score.

## Next steps (V2/V3 from the original roadmap)

- Sponsorship/deadline filters on Discover (needs a richer source than `listings.json` currently exposes)
- `LeetCodeStatsHistory` table to make a solved-count-vs-interview-rate correlation possible with real data, if that's wanted later

## Auth note

The Credentials provider here is for local development and demos — it stores a bcrypt password hash and is fine for testing, but for a real deployment swap in an OAuth provider (GitHub is a natural fit for a dev-facing tool) in `src/lib/auth.ts`. The Prisma adapter and session callbacks are already wired to support it.
