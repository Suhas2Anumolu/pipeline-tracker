import type { NormalizedPosting } from "./types";

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: { location?: string; team?: string; commitment?: string };
  createdAt?: number;
};

const INTERN_PATTERN = /intern/i;

// GET https://api.lever.co/v0/postings/{company}?mode=json
// Public, unauthenticated. mode=json is required or Lever returns HTML.
export async function fetchLeverCompany(companySlug: string): Promise<NormalizedPosting[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(companySlug)}?mode=json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.warn(`Lever company "${companySlug}" returned ${res.status}, skipping.`);
    return [];
  }
  const postings: LeverPosting[] = await res.json();

  return postings
    .filter((p) => INTERN_PATTERN.test(p.text))
    .map((p) => ({
      company: companySlug,
      role: p.text,
      location: p.categories?.location ?? null,
      url: p.hostedUrl,
      source: "LEVER" as const,
      sourceRef: `${companySlug}/${p.id}`,
      postedAt: p.createdAt ? new Date(p.createdAt) : null,
      employmentType: "INTERNSHIP" as const,
      term: null,
    }));
}
