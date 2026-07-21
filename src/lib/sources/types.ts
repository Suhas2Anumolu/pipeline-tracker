import { createHash } from "crypto";
import type { PostingSource, EmploymentType } from "@prisma/client";

export type NormalizedPosting = {
  company: string;
  role: string;
  location: string | null;
  url: string;
  source: PostingSource;
  sourceRef: string | null;
  postedAt: Date | null;
  employmentType: EmploymentType;
  term: string | null; // e.g. "Summer 2026", straight from the source's own data, not guessed
};

// Company + role + location, lowercased and whitespace-collapsed, is a good
// enough fingerprint to dedupe the same internship appearing in both a
// company's own Greenhouse board and the community GitHub list. Employment
// type is included so an internship and a full-time role at the same
// company with a coincidentally similar title never collide.
export function dedupeKey(company: string, role: string, location: string | null, employmentType: EmploymentType): string {
  const normalized = `${company}|${role}|${location ?? ""}|${employmentType}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha1").update(normalized).digest("hex");
}
