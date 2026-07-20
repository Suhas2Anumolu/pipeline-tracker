import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserIdFromBearer, InvalidTokenError, CORS_HEADERS } from "@/lib/extensionAuth";

export async function GET(request: Request) {
  try {
    const userId = await requireUserIdFromBearer(request);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    return NextResponse.json({ connected: true, email: user?.email, name: user?.name }, { headers: CORS_HEADERS });
  } catch (err) {
    if (err instanceof InvalidTokenError) {
      return NextResponse.json({ error: err.message }, { status: 401, headers: CORS_HEADERS });
    }
    throw err;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
