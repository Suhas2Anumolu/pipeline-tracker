import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  const postings = await prisma.jobPosting.findMany({
    where: {
      isActive: true,
      ...(q
        ? {
            OR: [
              { company: { contains: q, mode: "insensitive" } },
              { role: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ postedAt: "desc" }, { sourceSeenAt: "desc" }],
    take: 100,
  });

  return NextResponse.json(postings);
}
