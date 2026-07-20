import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

const createSchema = z.object({
  company: z.string().min(1),
  expectedOpenDate: z.string().datetime().optional(),
  notes: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const watches = await prisma.seasonWatch.findMany({ where: { userId }, orderBy: { company: "asc" } });

    // Cross-reference each watched company against live Discover data —
    // "open" here means we currently see active postings for it, not a
    // guess. Nothing here fabricates a program calendar.
    const withStatus = await Promise.all(
      watches.map(async (w) => {
        const openCount = await prisma.jobPosting.count({
          where: { isActive: true, company: { contains: w.company, mode: "insensitive" } },
        });
        return { ...w, openPostingsCount: openCount };
      })
    );

    return NextResponse.json(withStatus);
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const watch = await prisma.seasonWatch.upsert({
      where: { userId_company: { userId, company: parsed.data.company } },
      update: {
        expectedOpenDate: parsed.data.expectedOpenDate ? new Date(parsed.data.expectedOpenDate) : undefined,
        notes: parsed.data.notes,
      },
      create: {
        userId,
        company: parsed.data.company,
        expectedOpenDate: parsed.data.expectedOpenDate ? new Date(parsed.data.expectedOpenDate) : undefined,
        notes: parsed.data.notes,
      },
    });
    return NextResponse.json(watch, { status: 201 });
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    throw err;
  }
}
