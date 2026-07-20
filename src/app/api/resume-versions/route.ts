import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

const createSchema = z.object({
  label: z.string().min(1),
  resumeText: z.string().optional(),
});

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const versions = await prisma.resumeVersion.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(versions);
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

    const version = await prisma.resumeVersion.create({
      data: { userId, label: parsed.data.label, resumeText: parsed.data.resumeText },
    });
    revalidatePath("/resumes");
    revalidatePath("/match");
    return NextResponse.json(version, { status: 201 });
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    throw err;
  }
}
