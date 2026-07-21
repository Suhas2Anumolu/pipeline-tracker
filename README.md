<div align="center">

<img src="src/app/icon.svg" width="64" height="64" alt="Pipeline logo" />

# Pipeline

**The recruiting tracker built for internship and new-grad season.**

One board for every application, every resume version, and every deadline — plus the analytics that actually tell you what's working.

<img width="662" height="276" alt="Screenshot 2026-07-20 at 9 31 43 PM" src="https://github.com/user-attachments/assets/818cdbab-c3af-4c00-9d42-29951ae44e6f" />· [Report a bug](../../issues) · [Chrome extension](../../tree/main/pipeline-extension)

</div>

---

## What it does

Applying to 100+ internships in a spreadsheet doesn't scale. Pipeline replaces the spreadsheet with a real app:

-  **Kanban pipeline board** — drag applications from Applied → OA → Interviewing → Offer, with round-by-round interview notes on every card
-  **Discover** — internship postings aggregated from company Greenhouse/Lever boards and the community GitHub internship list, one click to add to your board
-  **AI resume feedback** — upload a resume, get a match score against any job description, missing keywords, and specific fixes — not just keyword overlap
-  **Analytics** — funnel by stage, best-performing sources, and which resume version actually converts
-  **AI follow-up drafts** — thank-you notes, recruiter check-ins, referral asks, and negotiation drafts, generated from the specific application's context
-  **Chrome extension** — capture any job posting into your board in one click, from any site
-  **LeetCode stats** — solved counts, streak, and contest rating on your profile
-  **Season dashboard** — track companies you're waiting on, cross-referenced against live posting data
-  **Google sign-in** — or email/password for local use

## Screenshot

<!-- Add a screenshot of the board here once deployed -->

## Tech stack

Next.js 14 (App Router) · TypeScript · PostgreSQL + Prisma · NextAuth.js · Tailwind CSS · Recharts

LLM features (resume feedback, follow-up drafts) work with Anthropic, DeepSeek, or Gemini — pick whichever you have a key for.

## Getting started

```bash
git clone <this-repo>
cd pipeline-tracker
npm install
cp .env.example .env       # fill in DATABASE_URL, NEXTAUTH_SECRET, etc.
npx prisma migrate dev --name init
npm run prisma:seed        # optional demo data
npm run dev
```

Visit `http://localhost:3000` and sign in with the seeded demo account (`demo@pipeline.dev` / `demo1234`), or create your own.

Full setup, environment variables, and deployment instructions (Vercel, hosted Postgres, scheduled Discover refresh, the Chrome extension, and every feature's implementation notes) live in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Deploying

Pipeline deploys cleanly to Vercel with a hosted Postgres (Neon or Supabase both work well). See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#deploying-to-vercel) for the full checklist — connection pooling, environment variables, and keeping job postings fresh on a schedule via GitHub Actions.

## Chrome extension

A companion browser extension lives in [`pipeline-extension/`](pipeline-extension) — capture any job posting into your board in one click, from any site. See its own README for loading it locally or publishing to the Chrome Web Store / Microsoft Edge Add-ons.

## Contributing

Issues and PRs welcome. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for how the pieces fit together before diving in.
