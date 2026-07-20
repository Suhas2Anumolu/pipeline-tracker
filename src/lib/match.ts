import { extractSkills } from "@/lib/skills";

export type MatchResult = {
  matchScore: number; // 0-100
  matchingSkills: string[];
  missingSkills: string[];
  extraResumeSkills: string[]; // in resume but not asked for by the JD — good context, not penalized
};

/**
 * V1: deterministic keyword-taxonomy overlap. matchScore = the share of
 * skills mentioned in the JD that also appear somewhere in the resume.
 *
 * This intentionally does not call an external API — it works offline, with
 * no key to configure, which is why it's the default. It will:
 *  - miss skills phrased in ways not in SKILL_TAXONOMY's alias list (fixable
 *    by extending the taxonomy)
 *  - miss genuine semantic matches ("built scalable backend services" vs a
 *    JD asking for "distributed systems") that a real reader would credit
 *
 * Upgrade path to semantic matching: replace this function's body with a
 * call to an embeddings endpoint (e.g. OpenAI text-embedding-3-small,
 * Voyage AI, or Anthropic via a wrapping service — Anthropic doesn't expose
 * embeddings directly), embed both texts, and compute cosine similarity.
 * Keep extractSkills() for the "Missing skills" / "Strong matches" lists
 * regardless — those are more useful to a person as a checklist than a bare
 * similarity float, so a hybrid (semantic score + keyword-based skill list)
 * is likely the best real version, not a full replacement.
 */
export function scoreMatch(resumeText: string, jdText: string): MatchResult {
  const resumeSkills = extractSkills(resumeText);
  const jdSkills = extractSkills(jdText);

  const matching = Array.from(jdSkills).filter((s) => resumeSkills.has(s));
  const missing = Array.from(jdSkills).filter((s) => !resumeSkills.has(s));
  const extra = Array.from(resumeSkills).filter((s) => !jdSkills.has(s));

  const matchScore = jdSkills.size > 0 ? Math.round((matching.length / jdSkills.size) * 100) : 0;

  return {
    matchScore,
    matchingSkills: matching.sort(),
    missingSkills: missing.sort(),
    extraResumeSkills: extra.sort(),
  };
}
