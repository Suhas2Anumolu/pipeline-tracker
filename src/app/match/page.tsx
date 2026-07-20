import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MatchTool from "@/components/MatchTool";

export default async function MatchPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const resumeVersions = await prisma.resumeVersion.findMany({ where: { userId: session.user.id } });
  const recentMatches = await prisma.resumeMatch.findMany({
    where: { userId: session.user.id },
    include: { resumeVersion: true },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return <MatchTool resumeVersions={resumeVersions} recentMatches={recentMatches} />;
}
