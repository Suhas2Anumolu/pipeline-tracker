import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

const createRoundSchema = z.object({
  roundName: z.string().min(1),
  interviewer: z.string().optional(),
  questions: z.string().optional(),
  outcome: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});

async function assertOwnsJob(jobId: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== userId) return false;
  return true;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCurrentUserId();
    if (!(await assertOwnsJob(params.id, userId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createRoundSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const round = await prisma.interviewRound.create({
      data: {
        jobId: params.id,
        roundName: parsed.data.roundName,
        interviewer: parsed.data.interviewer,
        questions: parsed.data.questions,
        outcome: parsed.data.outcome,
        scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : undefined,
      },
    });

    revalidatePath("/dashboard");
    return NextResponse.json(round, { status: 201 });
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}
