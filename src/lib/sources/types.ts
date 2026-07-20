import { createHash } from "crypto";
import type { PostingSource } from "@prisma/client";

export type NormalizedPosting = {
  company: string;
  role: string;
  location: string | null;
  url: string;
  source: PostingSource;
  sourceRef: string | null;
  postedAt: Date | null;
};

// Company + role + location, lowercased and whitespace-collapsed, is a good
// enough fingerprint to dedupe the same internship appearing in both a
// company's own Greenhouse board and the community GitHub list.
export function dedupeKey(company: string, role: string, location: string | null): string {
  const normalized = `${company}|${role}|${location ?? ""}`
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha1").update(normalized).digest("hex");
}
