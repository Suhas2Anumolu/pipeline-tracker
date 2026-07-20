// Companies we poll directly via their ATS's PUBLIC job-board API.
// These endpoints are unauthenticated and explicitly meant for exactly this
// use case (building an external job board / aggregator) — no ToS conflict,
// no scraping. Add to these lists freely; find a company's token from the
// URL of its careers page (e.g. jobs.lever.co/{slug} or
// boards.greenhouse.io/{token}).
//
// We deliberately do NOT scrape LinkedIn or Simplify's own site — both
// prohibit it in their ToS. Community coverage of those sources comes for
// free via the GitHub listings source instead (see github-repo.ts), which is
// public, MIT-licensed data explicitly meant to be consumed programmatically.

export const GREENHOUSE_BOARDS: string[] = [
  "stripe",
  "airbnb",
  "coinbase",
  "robinhood",
  "doordash",
  "affirm",
  "asana",
  "figma",
  "gitlab",
  "reddit",
];

export const LEVER_COMPANIES: string[] = [
  "netflix",
  "palantir",
  "plaid",
  "brex",
  "ramp",
  "notion",
];
