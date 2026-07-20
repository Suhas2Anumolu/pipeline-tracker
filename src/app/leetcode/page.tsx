import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LeetCodePanel from "@/components/LeetCodePanel";

export default async function LeetCodePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const stats = await prisma.leetCodeStats.findUnique({ where: { userId: session.user.id } });

  return (
    <LeetCodePanel
      initialStats={
        stats
          ? { ...stats, fetchedAt: stats.fetchedAt.toISOString() }
          : null
      }
    />
  );
}
