// These checks reflect widely documented, publicly known ATS parsing
// behavior (how systems like Greenhouse, Lever, Workday, and — as far as
// general industry practice goes — most ATS resume parsers handle text
// extraction), not any specific vendor's proprietary scoring algorithm. No
// vendor publishes their exact algorithm, and we don't have access to
// HackerRank's internal one specifically — this is the general, honest
// version of "will this resume extract cleanly."

export type AtsCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

const STANDARD_SECTIONS = [
  "experience",
  "work experience",
  "education",
  "skills",
  "projects",
  "summary",
  "objective",
  "certifications",
];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;

export function analyzeAtsCompatibility(text: string): AtsCheck[] {
  const lower = text.toLowerCase();
  const checks: AtsCheck[] = [];

  // Very little extracted text usually means the "resume" is mostly a
  // graphic, a scanned image, or a heavily columned template that dumped
  // its content out of reading order — all things that make ATS parsers
  // (and human recruiters skimming an ATS-rendered version) see garbage.
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  checks.push({
    id: "extractable_length",
    label: "Text extracts cleanly",
    passed: wordCount >= 100,
    detail:
      wordCount >= 100
        ? `Extracted ${wordCount} words — looks like real text, not an image.`
        : `Only extracted ${wordCount} words. If your resume looks normal when you open it, this usually means it's an image/scan or a heavily designed template — many ATS parsers will see it the same way and extract little to nothing.`,
  });

  const hasEmail = EMAIL_RE.test(text);
  checks.push({
    id: "contact_email",
    label: "Email address detected",
    passed: hasEmail,
    detail: hasEmail ? "Found a recognizable email address." : "No email address detected in plain text — if it's inside a header/footer or an image, some parsers won't pick it up.",
  });

  const hasPhone = PHONE_RE.test(text);
  checks.push({
    id: "contact_phone",
    label: "Phone number detected",
    passed: hasPhone,
    detail: hasPhone ? "Found a recognizable phone number." : "No phone number detected in plain text.",
  });

  const sectionsFound = STANDARD_SECTIONS.filter((s) => lower.includes(s));
  checks.push({
    id: "standard_sections",
    label: "Standard section headers",
    passed: sectionsFound.length >= 2,
    detail:
      sectionsFound.length >= 2
        ? `Found standard headers: ${sectionsFound.join(", ")}.`
        : "Few or no standard section headers found (Experience, Education, Skills, Projects). Parsers rely on these to categorize content — custom header wording or icons-instead-of-text can cause misclassification.",
  });

  // A resume that extracted to very short lines throughout is a common
  // signature of a multi-column layout, where a parser (or pdf-parse here)
  // reads left-to-right across columns instead of down each one, scrambling
  // the order.
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const shortLineRatio = lines.length > 0 ? lines.filter((l) => l.length < 25).length / lines.length : 0;
  checks.push({
    id: "layout_order",
    label: "Single-column layout signal",
    passed: shortLineRatio < 0.6,
    detail:
      shortLineRatio < 0.6
        ? "Text reads in a plausible top-to-bottom order."
        : "A large share of lines are very short, which often happens when a multi-column layout gets read out of order by a parser. If your resume uses side-by-side columns, consider a single-column version for ATS submissions.",
  });

  return checks;
}
