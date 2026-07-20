import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runIngest } from "@/lib/ingestPostings";

// Fetching ~16 companies plus the GitHub list can take a while depending on
// upstream latency. Vercel's default function timeout (10s on Hobby, 60s on
// Pro unless configured higher) may cut this short on Hobby — this just
// requests the longer duration where the plan allows it.
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // refuse to run unprotected rather than defaulting open
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIngest(prisma);
    if (result.warnings.length) console.warn("Ingest warnings:", result.warnings);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Scheduled ingest failed:", err);
    return NextResponse.json({ error: "Ingest run failed" }, { status: 500 });
  }
}

// GitHub Actions' schedule hits this with GET; POST also works if you'd
// rather trigger it from curl -X POST or a different scheduler.
export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
