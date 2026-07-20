import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";
import { fetchLeetCodeStats, LeetCodeUserNotFoundError, LeetCodeFetchError, REFRESH_COOLDOWN_MS } from "@/lib/leetcode";

const connectSchema = z.object({ username: z.string().min(1) });

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const stats = await prisma.leetCodeStats.findUnique({ where: { userId } });
    return NextResponse.json(stats);
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = await request.json();
    const parsed = connectSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.leetCodeStats.findUnique({ where: { userId } });

    // Server-side cooldown — refetching on every button click or page load
    // would hammer an endpoint we don't control and that isn't meant for
    // this volume of traffic. A username change always bypasses the
    // cooldown since that's a materially different request.
    const usernameChanged = existing && existing.username !== parsed.data.username;
    if (existing && !usernameChanged) {
      const msSinceFetch = Date.now() - existing.fetchedAt.getTime();
      if (msSinceFetch < REFRESH_COOLDOWN_MS) {
        return NextResponse.json(
          { ...existing, cached: true, nextRefreshInMs: REFRESH_COOLDOWN_MS - msSinceFetch },
          { status: 200 }
        );
      }
    }

    const result = await fetchLeetCodeStats(parsed.data.username);

    const saved = await prisma.leetCodeStats.upsert({
      where: { userId },
      update: { ...result, fetchedAt: new Date() },
      create: { userId, ...result },
    });

    return NextResponse.json({ ...saved, cached: false });
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    if (err instanceof LeetCodeUserNotFoundError) return NextResponse.json({ error: err.message, code: "USER_NOT_FOUND" }, { status: 404 });
    if (err instanceof LeetCodeFetchError) return NextResponse.json({ error: err.message, code: "FETCH_ERROR" }, { status: 502 });
    console.error("LeetCode connect failed:", err);
    return NextResponse.json({ error: "Something went wrong connecting to LeetCode." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await requireCurrentUserId();
    await prisma.leetCodeStats.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    throw err;
  }
}
