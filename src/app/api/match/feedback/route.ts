import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";
import { generateResumeFeedback } from "@/lib/resumeFeedback";
import { LlmNotConfiguredError } from "@/lib/llm";

const schema = z.object({
  resumeText: z.string().min(1),
  jdText: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireCurrentUserId();

    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const feedback = await generateResumeFeedback(parsed.data.resumeText, parsed.data.jdText);
    return NextResponse.json(feedback);
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    if (err instanceof LlmNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: "NOT_CONFIGURED" }, { status: 501 });
    }
    console.error("Resume feedback generation failed:", err);
    return NextResponse.json({ error: "Couldn't generate feedback. Try again." }, { status: 500 });
  }
}
