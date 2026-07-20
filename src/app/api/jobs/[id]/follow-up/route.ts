import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";
import { generateFollowUp, LlmNotConfiguredError } from "@/lib/followUp";

const schema = z.object({
  kind: z.enum(["thank_you", "recruiter_follow_up", "referral_request", "negotiation"]),
  extraContext: z.string().optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCurrentUserId();

    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: { interviewRounds: true, resumeVersion: true },
    });
    if (!job || job.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const result = await generateFollowUp({ kind: parsed.data.kind, job, extraContext: parsed.data.extraContext });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    if (err instanceof LlmNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: "NOT_CONFIGURED" }, { status: 501 });
    }
    console.error("Follow-up generation failed:", err);
    return NextResponse.json({ error: "Couldn't generate that message. Try again." }, { status: 500 });
  }
}
