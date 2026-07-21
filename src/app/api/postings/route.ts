import { NextResponse } from "next/server";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Prisma, PostingSource } from "@prisma/client";

const PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const VALID_SOURCES: PostingSource[] = ["GREENHOUSE", "LEVER", "GITHUB_LIST"];

export async function GET(request: Request) {
  try {
    const userId = await requireCurrentUserId();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();
    const source = searchParams.get("source")?.trim(); // GREENHOUSE | LEVER | GITHUB_LIST
    const postedWithinDays = searchParams.get("postedWithinDays");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE), 10) || PAGE_SIZE));

    // Postings the user has already added to their own pipeline shouldn't
    // keep showing up in Discover — excluded here server-side (by matching
    // sourceUrl against the user's own Job rows) so this holds across page
    // loads and pagination, not just within one client session.
    const addedUrls = await prisma.job.findMany({
      where: { userId, sourceUrl: { not: null } },
      select: { sourceUrl: true },
    });
    const excludedUrls = addedUrls.map((j) => j.sourceUrl).filter((u): u is string => !!u);

    const where: Prisma.JobPostingWhereInput = {
      isActive: true,
      ...(excludedUrls.length ? { url: { notIn: excludedUrls } } : {}),
      ...(q
        ? {
            OR: [
              { company: { contains: q, mode: "insensitive" } },
              { role: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(source && VALID_SOURCES.includes(source as PostingSource) ? { source: source as PostingSource } : {}),
      ...(postedWithinDays
        ? { postedAt: { gte: new Date(Date.now() - Number(postedWithinDays) * 86400000) } }
        : {}),
    };

    const [postings, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        orderBy: [{ postedAt: "desc" }, { sourceSeenAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.jobPosting.count({ where }),
    ]);

    return NextResponse.json({
      postings,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}
