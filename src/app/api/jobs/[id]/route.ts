import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { STAGE_ORDER, stageIndex } from "@/types";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

const updateSchema = z.object({
  status: z.enum(["APPLIED", "OA", "INTERVIEWING", "OFFER", "REJECTED"]).optional(),
  notes: z.string().optional(),
  resumeVersionId: z.string().nullable().optional(),
});

async function getOwnedJob(id: string, userId: string) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== userId) return null;
  return job;
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCurrentUserId();

    const existing = await getOwnedJob(params.id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    // peak tracks the furthest pipeline stage ever reached, independent of a
    // later rejection, so funnel/resume conversion stats stay accurate.
    let peak = existing.peak;
    if (parsed.data.status && parsed.data.status !== "REJECTED") {
      const newIdx = stageIndex(parsed.data.status);
      const peakIdx = Math.max(stageIndex(peak), newIdx);
      peak = STAGE_ORDER[peakIdx];
    }

    const job = await prisma.job.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status,
        notes: parsed.data.notes,
        resumeVersionId: parsed.data.resumeVersionId,
        peak,
      },
      include: { resumeVersion: true, interviewRounds: true },
    });

    revalidatePath("/dashboard");
    revalidatePath("/resumes");
    revalidatePath("/analytics");

    return NextResponse.json(job);
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCurrentUserId();

    const existing = await getOwnedJob(params.id, userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.job.delete({ where: { id: params.id } });

    revalidatePath("/dashboard");
    revalidatePath("/resumes");
    revalidatePath("/analytics");

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}
