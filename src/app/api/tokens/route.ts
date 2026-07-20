import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";
import { generateApiToken, hashApiToken, maskApiToken } from "@/lib/apiToken";

const createSchema = z.object({ label: z.string().min(1) });

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const tokens = await prisma.apiToken.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, lastUsedAt: true, createdAt: true, tokenHash: true },
    });
    // Never return the hash — it's not the plaintext, but there's no reason
    // to expose it either. Client only needs id/label/timestamps.
    return NextResponse.json(tokens.map(({ tokenHash: _tokenHash, ...t }) => t));
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

    const plaintext = generateApiToken();
    const tokenHash = hashApiToken(plaintext);

    const token = await prisma.apiToken.create({
      data: { userId, label: parsed.data.label, tokenHash },
    });

    // The only time the plaintext is ever returned. Store it now — it can't
    // be retrieved again, only revoked and replaced.
    return NextResponse.json(
      { id: token.id, label: token.label, createdAt: token.createdAt, token: plaintext, masked: maskApiToken(plaintext) },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof StaleSessionError) return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    throw err;
  }
}
