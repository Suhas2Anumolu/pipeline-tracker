import type { NormalizedPosting } from "./types";

// Schema confirmed against SimplifyJobs/Summer2026-Internships CONTRIBUTING.md:
// https://github.com/SimplifyJobs/Summer2026-Internships/blob/dev/CONTRIBUTING.md#listingsjson-schema
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

const LISTINGS_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json";

// This is a public, MIT-licensed dataset maintained specifically to be
// consumed by tools like this one — community members and Simplify both
// contribute to it as structured data, not a scrape target. Swap the repo
// name each year (e.g. Summer2027-Internships) as new cycles start.
export async function fetchGithubListings(): Promise<NormalizedPosting[]> {
  const res = await fetch(LISTINGS_URL, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.warn(`GitHub listings fetch returned ${res.status}, skipping.`);
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
      sourceRef: l.id,
      postedAt: l.date_posted ? new Date(l.date_posted * 1000) : null,
    }));
}
