import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const userId = await requireCurrentUserId();
    const watch = await prisma.seasonWatch.findUnique({ where: { id: params.id } });
    if (!watch || watch.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.seasonWatch.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    throw err;
  }
}
