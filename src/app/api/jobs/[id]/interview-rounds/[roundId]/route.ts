import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

export async function DELETE(_request: Request, { params }: { params: { id: string; roundId: string } }) {
  try {
    const userId = await requireCurrentUserId();

    const round = await prisma.interviewRound.findUnique({
      where: { id: params.roundId },
      include: { job: true },
    });
    if (!round || round.jobId !== params.id || round.job.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.interviewRound.delete({ where: { id: params.roundId } });
    revalidatePath("/dashboard");
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}
