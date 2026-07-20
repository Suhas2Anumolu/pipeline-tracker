import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserIdFromBearer, InvalidTokenError, CORS_HEADERS } from "@/lib/extensionAuth";

const createJobSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  source: z.enum(["LINKEDIN", "SIMPLIFY", "REFERRAL", "COMPANY_SITE", "GITHUB_REPO", "OTHER"]).default("OTHER"),
  sourceUrl: z.string().url().optional(),
  deadline: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserIdFromBearer(request);

    const body = await request.json();
    const parsed = createJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: CORS_HEADERS });
    }

    const job = await prisma.job.create({
      data: {
        company: parsed.data.company,
        role: parsed.data.role,
        source: parsed.data.source,
        sourceUrl: parsed.data.sourceUrl,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : undefined,
        userId,
        status: "APPLIED",
        peak: "APPLIED",
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/resumes");
    revalidatePath("/analytics");

    return NextResponse.json({ ok: true, job }, { status: 201, headers: CORS_HEADERS });
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: CORS_HEADERS });
    }
    console.error("Extension job creation failed:", err);
    return NextResponse.json({ error: "Something went wrong saving that application." }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
