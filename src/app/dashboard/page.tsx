import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Board from "@/components/Board";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const [jobs, resumeVersions] = await Promise.all([
    prisma.job.findMany({
      where: { userId: session.user.id },
      include: { resumeVersion: true, interviewRounds: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.resumeVersion.findMany({ where: { userId: session.user.id } }),
  ]);

  return <Board initialJobs={jobs} resumeVersions={resumeVersions} />;
}
