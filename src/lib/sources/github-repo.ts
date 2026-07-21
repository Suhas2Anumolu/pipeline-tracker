import type { NormalizedPosting } from "./types";
import type { EmploymentType } from "@prisma/client";

// Schema confirmed against each repo's own CONTRIBUTING.md — all three use
// the identical listings.json format (same maintainer tooling across all of
// them). Internship vs. full-time is NOT parsed or guessed from the listing
// itself — it's determined by which repo it came from, since Simplify/Vansh
// maintain entirely separate repos for internships vs. new-grad roles.
type GithubListing = {
  company_name: string;
  company_url: string;
  title: string;
  date_posted: number; // unix seconds
  date_updated: number; // unix seconds
  url: string;
  terms: string[]; // e.g. ["Summer 2026"] — used directly as the "term" filter value
  locations: string[];
  active: boolean;
  is_visible: boolean;
  source: string;
  id: string;
};

const GITHUB_LIST_SOURCES: { label: string; url: string; employmentType: EmploymentType }[] = [
  {
    label: "SimplifyJobs-Internships",
    url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json",
    employmentType: "INTERNSHIP",
  },
  {
    label: "both-sides-Internships",
    url: "https://raw.githubusercontent.com/both-sides/summer2026-internships/dev/.github/scripts/listings.json",
    employmentType: "INTERNSHIP",
  },
  {
    label: "SimplifyJobs-NewGrad",
    url: "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json",
    employmentType: "FULL_TIME",
  },
];

async function fetchOneList(source: (typeof GITHUB_LIST_SOURCES)[number]): Promise<NormalizedPosting[]> {
  const res = await fetch(source.url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.warn(`GitHub listings fetch for ${source.label} returned ${res.status}, skipping.`);
    return [];
  }
  const listings: GithubListing[] = await res.json();

  return listings
    .filter((l) => l.active && l.is_visible)
    .map((l) => ({
      company: l.company_name,
      role: l.title,
      location: l.locations?.[0] ?? null,
      url: l.url,
      source: "GITHUB_LIST" as const,
      // Prefix with the source label so the same listing id from different
      // repos never collides in the dedupe key.
      sourceRef: `${source.label}:${l.id}`,
      postedAt: l.date_posted ? new Date(l.date_posted * 1000) : null,
      employmentType: source.employmentType,
      term: l.terms?.[0] ?? null,
    }));
}

export async function fetchGithubListings(): Promise<NormalizedPosting[]> {
  const results = await Promise.allSettled(GITHUB_LIST_SOURCES.map(fetchOneList));
  const postings: NormalizedPosting[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") postings.push(...r.value);
    else console.warn(`GitHub listings fetch failed for ${GITHUB_LIST_SOURCES[i].label}:`, r.reason);
  });
  return postings;
}
