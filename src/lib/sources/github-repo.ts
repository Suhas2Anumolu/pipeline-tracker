import type { NormalizedPosting } from "./types";

// Schema confirmed against both repos' own CONTRIBUTING.md docs — both use
// the identical listings.json format (the second repo's maintainer forked
// from / was inspired by the first, per its own README: "This repo is
// inspired by Pitt CSC & Simplify Repo").
type GithubListing = {
  company_name: string;
  company_url: string;
  title: string;
  date_posted: number; // unix seconds
  date_updated: number; // unix seconds
  url: string;
  terms: string[];
  locations: string[];
  active: boolean;
  is_visible: boolean;
  source: string;
  id: string;
};

// Two public, MIT-licensed, community-maintained datasets — not scrape
// targets, both explicitly built to be consumed as structured data. Swap
// repo names each year as new cycles start (e.g. Summer2027-Internships).
const GITHUB_LIST_SOURCES = [
  {
    label: "SimplifyJobs",
    url: "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json",
  },
  {
    label: "both-sides (formerly vanshb03)",
    url: "https://raw.githubusercontent.com/both-sides/summer2026-internships/dev/.github/scripts/listings.json",
  },
];

async function fetchOneList(source: { label: string; url: string }): Promise<NormalizedPosting[]> {
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
      // Prefix with the source label so the same listing id from two
      // different repos never collides in the dedupe key.
      sourceRef: `${source.label}:${l.id}`,
      postedAt: l.date_posted ? new Date(l.date_posted * 1000) : null,
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
