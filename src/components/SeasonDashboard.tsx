"use client";

import { useEffect, useState } from "react";
import { differenceInCalendarDays } from "date-fns";
import { Plus, Trash2, Radar } from "lucide-react";

type Watch = {
  id: string;
  company: string;
  expectedOpenDate: string | null;
  notes: string | null;
  openPostingsCount: number;
};

function StatusBadge({ watch }: { watch: Watch }) {
  if (watch.openPostingsCount > 0) {
    return (
      <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "#DCEEE3", color: "#175E41" }}>
        Open now · {watch.openPostingsCount} posting{watch.openPostingsCount > 1 ? "s" : ""}
      </span>
    );
  }

  if (watch.expectedOpenDate) {
    const days = differenceInCalendarDays(new Date(watch.expectedOpenDate), new Date());
    if (days > 0) {
      return (
        <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "#F6E7C9", color: "#6B4E17" }}>
          Expected to open in {days}d
        </span>
      );
    }
    return (
      <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "#EFECE3", color: "#5B5647" }}>
        Expected {Math.abs(days)}d ago — check Discover
      </span>
    );
  }

  return (
    <span className="rounded-full px-2.5 py-1 text-xs font-medium" style={{ background: "#EFECE3", color: "#5B5647" }}>
      Watching — no postings yet
    </span>
  );
}

export default function SeasonDashboard() {
  const [watches, setWatches] = useState<Watch[]>([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/season-watch");
    if (res.ok) setWatches(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addWatch() {
    if (!company.trim()) return;
    setError("");
    const res = await fetch("/api/season-watch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        expectedOpenDate: expectedDate ? new Date(expectedDate).toISOString() : undefined,
        notes: notes || undefined,
      }),
    });
    if (!res.ok) {
      setError("Couldn't add that company.");
      return;
    }
    setCompany("");
    setExpectedDate("");
    setNotes("");
    setShowForm(false);
    load();
  }

  async function removeWatch(id: string) {
    setWatches((w) => w.filter((x) => x.id !== id));
    await fetch(`/api/season-watch/${id}`, { method: "DELETE" });
  }

  return (
    <div>
      <div className="mb-2">
        <div className="font-mono text-xs uppercase tracking-wide text-muted">Recruiting OS</div>
        <h1 className="font-display text-2xl font-bold text-ink">Season</h1>
      </div>
      <p className="mb-5 max-w-xl text-sm text-muted">
        Track companies you're waiting on. "Open now" is cross-referenced against live Discover data — real postings, not a guess.
        Expected dates are whatever you've heard (Reddit threads, past cycles, alumni) since there's no public source for recruiting calendars.
      </p>

      {showForm ? (
        <div className="mb-5 rounded-card border border-border bg-white p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="text-xs text-muted">
              Company
              <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Databricks" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-muted">
              Expected open date (optional)
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
            <label className="text-xs text-muted">
              Notes (optional)
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Heard from a friend who interned there" className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" />
            </label>
          </div>
          {error && <p className="mt-2 text-xs text-urgent">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button onClick={addWatch} className="rounded-md bg-indigo px-4 py-2 text-sm font-medium text-white">Add</button>
            <button onClick={() => setShowForm(false)} className="rounded-md border border-border px-4 py-2 text-sm text-muted">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mb-5 flex items-center gap-2 rounded-card border border-dashed border-[#C9C2AE] bg-white px-4 py-2.5 text-sm text-indigo"
        >
          <Plus size={15} /> Watch a company
        </button>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-muted">Loading…</div>
      ) : watches.length === 0 ? (
        <div className="rounded-card border border-dashed border-[#C9C2AE] bg-white py-10 text-center text-sm text-muted">
          <Radar size={22} className="mx-auto mb-2 text-[#C9C2AE]" />
          Not watching anyone yet. Add a company you're waiting to open.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {watches.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-card border border-border bg-white px-4 py-3">
              <div>
                <div className="font-display text-sm font-semibold text-ink">{w.company}</div>
                {w.notes && <div className="mt-0.5 text-xs text-muted">{w.notes}</div>}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge watch={w} />
                <button onClick={() => removeWatch(w.id)} aria-label="Stop watching" className="text-[#B4AF9F]">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
