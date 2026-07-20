import type { PrismaClient } from "@prisma/client";
import { GREENHOUSE_BOARDS, LEVER_COMPANIES } from "@/lib/sources/companies";
import { fetchGreenhouseBoard } from "@/lib/sources/greenhouse";
import { fetchLeverCompany } from "@/lib/sources/lever";
import { fetchGithubListings } from "@/lib/sources/github-repo";
import { dedupeKey } from "@/lib/sources/types";
import type { NormalizedPosting } from "@/lib/sources/types";

function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

async function fetchAll(): Promise<{ postings: NormalizedPosting[]; warnings: string[] }> {
  const postings: NormalizedPosting[] = [];
  const warnings: string[] = [];

  const greenhouseResults = await Promise.allSettled(GREENHOUSE_BOARDS.map(fetchGreenhouseBoard));
  greenhouseResults.forEach((r, i) => {
    if (r.status === "fulfilled") {
      postings.push(...r.value.map((p) => ({ ...p, company: titleCase(p.company) })));
    } else {
      warnings.push(`Greenhouse fetch failed for ${GREENHOUSE_BOARDS[i]}: ${r.reason}`);
    }
  });

  const leverResults = await Promise.allSettled(LEVER_COMPANIES.map(fetchLeverCompany));
  leverResults.forEach((r, i) => {
    if (r.status === "fulfilled") {
      postings.push(...r.value.map((p) => ({ ...p, company: titleCase(p.company) })));
    } else {
      warnings.push(`Lever fetch failed for ${LEVER_COMPANIES[i]}: ${r.reason}`);
    }
  });

  try {
    postings.push(...(await fetchGithubListings()));
  } catch (err) {
    warnings.push(`GitHub listings fetch failed: ${err}`);
  }

  return { postings, warnings };
}

export type IngestResult = {
  fetched: number;
  created: number;
  updated: number;
  markedInactive: number;
  warnings: string[];
};

// Shared by prisma/ingest.ts (local dev CLI, `npm run ingest`) and
// src/app/api/cron/ingest/route.ts (scheduled via GitHub Actions in
// production, since Vercel serverless functions can't run a long-lived
// background script). Takes a PrismaClient rather than importing one so
// each caller controls its own client lifecycle — the CLI script owns and
// disconnects its own instance, the API route reuses the app's shared
// singleton instead of creating a new connection per invocation.
export async function runIngest(prisma: PrismaClient): Promise<IngestResult> {
  const { postings, warnings } = await fetchAll();

  // Same role can legitimately appear from two sources (e.g. a company's own
  // Greenhouse board AND the GitHub list). Last one wins for freshness data,
  // but the dedupeKey ensures we only ever store one row per real posting.
  const seenKeys = new Set<string>();
  let created = 0;
  let updated = 0;

  for (const posting of postings) {
    const key = dedupeKey(posting.company, posting.role, posting.location);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    const result = await prisma.jobPosting.upsert({
      where: { dedupeKey: key },
      update: {
        url: posting.url,
        location: posting.location,
        postedAt: posting.postedAt,
        isActive: true,
        sourceSeenAt: new Date(),
      },
      create: {
        company: posting.company,
        role: posting.role,
        location: posting.location,
        url: posting.url,
        source: posting.source,
        sourceRef: posting.sourceRef,
        postedAt: posting.postedAt,
        dedupeKey: key,
      },
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) created += 1;
    else updated += 1;
  }

  // Anything we didn't see in this run is presumed closed/removed upstream.
  const staleResult = await prisma.jobPosting.updateMany({
    where: { dedupeKey: { notIn: Array.from(seenKeys) } },
    data: { isActive: false },
  });

  return { fetched: postings.length, created, updated, markedInactive: staleResult.count, warnings };
}
