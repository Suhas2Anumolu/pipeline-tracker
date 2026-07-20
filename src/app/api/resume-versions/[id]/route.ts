import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

const updateSchema = z.object({
  resumeText: z.string().optional(),
  label: z.string().min(1).optional(),
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCurrentUserId();
    const existing = await prisma.resumeVersion.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const updated = await prisma.resumeVersion.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    throw err;
  }
}
