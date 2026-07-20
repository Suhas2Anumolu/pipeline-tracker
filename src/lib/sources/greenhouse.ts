import type { NormalizedPosting } from "./types";

type GreenhouseJob = {
  id: number;
  title: string;
  updated_at: string;
  location: { name: string } | null;
  absolute_url: string;
};

type GreenhouseResponse = { jobs: GreenhouseJob[] };

const INTERN_PATTERN = /intern/i;

// GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs
// Public, unauthenticated, no rate-limit key required. This is the same
// endpoint companies use to power their own careers pages, so pulling from
// it is explicitly within intended use.
export async function fetchGreenhouseBoard(boardToken: string): Promise<NormalizedPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    console.warn(`Greenhouse board "${boardToken}" returned ${res.status}, skipping.`);
    return [];
  }
  const data: GreenhouseResponse = await res.json();

  return data.jobs
    .filter((job) => INTERN_PATTERN.test(job.title))
    .map((job) => ({
      company: boardToken,
      role: job.title,
      location: job.location?.name ?? null,
      url: job.absolute_url,
      source: "GREENHOUSE" as const,
      sourceRef: `${boardToken}/${job.id}`,
      postedAt: job.updated_at ? new Date(job.updated_at) : null,
    }));
}
