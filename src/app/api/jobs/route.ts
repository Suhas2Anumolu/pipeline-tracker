import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

const createJobSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  source: z.enum(["LINKEDIN", "SIMPLIFY", "REFERRAL", "COMPANY_SITE", "GITHUB_REPO", "OTHER"]),
  resumeVersionId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  deadline: z.string().datetime().optional(),
});

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const jobs = await prisma.job.findMany({
      where: { userId },
      include: { resumeVersion: true, interviewRounds: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(jobs);
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const job = await prisma.job.create({
      data: {
        company: parsed.data.company,
        role: parsed.data.role,
        source: parsed.data.source,
        resumeVersionId: parsed.data.resumeVersionId,
        sourceUrl: parsed.data.sourceUrl,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
        userId,
        status: "APPLIED",
        peak: "APPLIED",
      },
      include: { resumeVersion: true, interviewRounds: true },
    });

    // Discover creates jobs via this route while the user stays on /discover —
    // without this, the Router Cache can serve a stale /dashboard for up to
    // 30s after navigating there, hiding the newly added job.
    revalidatePath("/dashboard");
    revalidatePath("/resumes");
    revalidatePath("/analytics");

    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}
