"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Plus, Check, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Posting = {
  id: string;
  company: string;
  role: string;
  location: string | null;
  url: string;
  source: "GREENHOUSE" | "LEVER" | "GITHUB_LIST";
  postedAt: string | null;
};

const SOURCE_LABEL: Record<Posting["source"], string> = {
  GREENHOUSE: "Company site (Greenhouse)",
  LEVER: "Company site (Lever)",
  GITHUB_LIST: "Community list",
};

// Maps a posting's origin to the Job.source enum used for the user's own
// pipeline tracking (kept separate from PostingSource, which describes
// where we ingested the listing from).
const SOURCE_TO_JOB_SOURCE: Record<Posting["source"], string> = {
  GREENHOUSE: "COMPANY_SITE",
  LEVER: "COMPANY_SITE",
  GITHUB_LIST: "GITHUB_REPO",
};

const SOURCE_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "GITHUB_LIST", label: "Community list" },
  { value: "GREENHOUSE", label: "Greenhouse" },
  { value: "LEVER", label: "Lever" },
];

const FRESHNESS_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "Any time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
];

export default function DiscoverPage() {
  const [postings, setPostings] = useState<Posting[]>([]);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [freshnessFilter, setFreshnessFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [errorFor, setErrorFor] = useState<Record<string, string>>({});
  const [sessionError, setSessionError] = useState(false);

  const load = useCallback(async (q: string, source: string, freshness: string, pageNum: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (source) params.set("source", source);
    if (freshness) params.set("postedWithinDays", freshness);
    params.set("page", String(pageNum));

    const res = await fetch(`/api/postings?${params.toString()}`);
    if (res.status === 401) {
      setSessionError(true);
      setLoading(false);
      return;
    }
    if (res.ok) {
      const data = await res.json();
      setPostings(data.postings);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    }
    setLoading(false);
  }, []);

  // Any filter change resets to page 1 — staying on page 4 of a filter that
  // now only has 1 page of results would just show an empty list.
  useEffect(() => {
    setPage(1);
  }, [query, sourceFilter, freshnessFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => load(query, sourceFilter, freshnessFilter, page), 250);
    return () => clearTimeout(timeout);
  }, [query, sourceFilter, freshnessFilter, page, load]);

  async function addToPipeline(posting: Posting) {
    setErrorFor((e) => ({ ...e, [posting.id]: "" }));
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: posting.company,
        role: posting.role,
        source: SOURCE_TO_JOB_SOURCE[posting.source],
        sourceUrl: posting.url,
      }),
    });
    if (res.status === 401) {
      setSessionError(true);
      return;
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setErrorFor((e) => ({ ...e, [posting.id]: body?.error ?? "Couldn't add this one — try again." }));
      return;
    }
    // The server now excludes this posting from future queries (matched by
    // sourceUrl against the user's own applications), so this holds across
    // reloads — remove it from the current view immediately too, rather
    // than waiting for a refetch, so it doesn't linger with a stale "Added"
    // badge until the next page load.
    setAdded((s) => new Set(s).add(posting.id));
    setTimeout(() => {
      setPostings((ps) => ps.filter((p) => p.id !== posting.id));
    }, 600);
  }

  const activeFilterCount = [query, sourceFilter, freshnessFilter].filter(Boolean).length;

  return (
    <div>
      <div className="mb-2">
        <div className="font-mono text-xs uppercase tracking-wide text-muted">Recruiting OS</div>
        <h1 className="font-display text-2xl font-bold text-ink">Discover</h1>
      </div>
      <p className="mb-5 max-w-xl text-sm text-muted">
        Aggregated from company Greenhouse/Lever boards and two community-maintained GitHub internship lists.
        Refreshed automatically on a schedule (or via <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">npm run ingest</code> locally).
      </p>

      {sessionError && (
        <div className="mb-5 rounded-card border border-urgent bg-white px-4 py-3 text-sm text-urgent">
          Your session is out of date (this usually means the database was reset since you last signed in).{" "}
          <a href="/api/auth/signout" className="font-semibold underline">
            Sign out and sign back in
          </a>{" "}
          to fix it.
        </div>
      )}

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-white px-3 py-2">
          <Search size={15} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, role, or location"
            className="w-full border-none text-sm outline-none"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm text-ink"
        >
          {SOURCE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <select
          value={freshnessFilter}
          onChange={(e) => setFreshnessFilter(e.target.value)}
          className="rounded-md border border-border bg-white px-3 py-2 text-sm text-ink"
        >
          {FRESHNESS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {!loading && (
        <div className="mb-3 text-xs text-muted">
          {total} posting{total === 1 ? "" : "s"}
          {activeFilterCount > 0 ? " matching your filters" : ""}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-muted">Loading postings…</div>
      ) : postings.length === 0 ? (
        <div className="rounded-card border border-dashed border-[#C9C2AE] bg-white py-10 text-center text-sm text-muted">
          {activeFilterCount > 0
            ? "No postings match those filters."
            : <>No postings yet. Run <code className="font-mono">npm run ingest</code> to fetch the first batch.</>}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            {postings.map((p) => (
              <div key={p.id} className="rounded-card border border-border bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-ink">{p.company}</span>
                      <span className="text-sm text-muted">— {p.role}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2.5 text-xs text-muted">
                      {p.location && <span>{p.location}</span>}
                      <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[10.5px]">{SOURCE_LABEL[p.source]}</span>
                      {p.postedAt && <span>{formatDistanceToNow(new Date(p.postedAt), { addSuffix: true })}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-muted" aria-label="Open posting">
                      <ExternalLink size={15} />
                    </a>
                    <button
                      onClick={() => addToPipeline(p)}
                      disabled={added.has(p.id)}
                      className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium disabled:border-stage-offer disabled:text-stage-offer"
                      style={added.has(p.id) ? {} : { color: "#2F3B6B" }}
                    >
                      {added.has(p.id) ? (
                        <>
                          <Check size={13} /> Added
                        </>
                      ) : (
                        <>
                          <Plus size={13} /> Add to pipeline
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {errorFor[p.id] && <div className="pt-1.5 text-xs text-urgent">{errorFor[p.id]}</div>}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs text-ink disabled:opacity-40"
              >
                <ChevronLeft size={13} /> Prev
              </button>
              <span className="font-mono text-xs text-muted">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs text-ink disabled:opacity-40"
              >
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
