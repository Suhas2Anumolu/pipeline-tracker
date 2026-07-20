import { PrismaClient, Source, Status, Stage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@pipeline.dev" },
    update: {},
    create: {
      email: "demo@pipeline.dev",
      name: "Demo Student",
      passwordHash,
    },
  });

  const versions = ["Resume_V5", "Resume_V6", "Resume_V7", "Resume_V8"];
  const resumeTexts: Record<string, string> = {
    Resume_V7:
      "Software engineering student with experience in Python, Java, and React. Built REST APIs with Django and worked with PostgreSQL and Git. Coursework in data structures and algorithms, distributed systems.",
    Resume_V8:
      "Software engineering student with experience in Python, TypeScript, React, and Node.js. Built and deployed microservices with Docker and Kubernetes on AWS, using Kafka for event streaming and Redis for caching. Strong background in distributed systems, system design, and CI/CD.",
  };
  const resumeVersions: Record<string, string> = {};
  for (const label of versions) {
    const rv = await prisma.resumeVersion.upsert({
      where: { userId_label: { userId: user.id, label } },
      update: {},
      create: { userId: user.id, label, resumeText: resumeTexts[label] },
    });
    resumeVersions[label] = rv.id;
  }

  const jobs = [
    { company: "Google", role: "SWE Intern", resumeVersion: "Resume_V8", source: Source.REFERRAL, status: Status.INTERVIEWING, peak: Stage.INTERVIEWING, deadline: "2026-07-30" },
    { company: "Meta", role: "SWE Intern", resumeVersion: "Resume_V8", source: Source.LINKEDIN, status: Status.OFFER, peak: Stage.OFFER, deadline: "2026-08-01" },
    { company: "Databricks", role: "SWE Intern", resumeVersion: "Resume_V7", source: Source.SIMPLIFY, status: Status.OA, peak: Stage.OA, deadline: "2026-08-10" },
    { company: "Citadel", role: "Quant Dev Intern", resumeVersion: "Resume_V7", source: Source.COMPANY_SITE, status: Status.REJECTED, peak: Stage.OA, deadline: "2026-07-25" },
    { company: "Jane Street", role: "SWE Intern", resumeVersion: "Resume_V6", source: Source.REFERRAL, status: Status.INTERVIEWING, peak: Stage.INTERVIEWING, deadline: "2026-08-05" },
    { company: "Nvidia", role: "SWE Intern", resumeVersion: "Resume_V5", source: Source.LINKEDIN, status: Status.REJECTED, peak: Stage.APPLIED, deadline: "2026-07-15" },
    { company: "Stripe", role: "Backend Intern", resumeVersion: "Resume_V8", source: Source.GITHUB_REPO, status: Status.APPLIED, peak: Stage.APPLIED, deadline: "2026-08-15" },
    { company: "Snowflake", role: "SWE Intern", resumeVersion: "Resume_V7", source: Source.SIMPLIFY, status: Status.OA, peak: Stage.OA, deadline: "2026-07-28" },
  ];

  for (const j of jobs) {
    const created = await prisma.job.create({
      data: {
        company: j.company,
        role: j.role,
        source: j.source,
        status: j.status,
        peak: j.peak,
        deadline: new Date(j.deadline),
        userId: user.id,
        resumeVersionId: resumeVersions[j.resumeVersion],
      },
    });

    if (j.company === "Google") {
      await prisma.interviewRound.createMany({
        data: [
          {
            jobId: created.id,
            roundName: "Phone screen",
            interviewer: "Alex (recruiter)",
            outcome: "Passed",
            questions: "General background, why Google, one easy array/string problem.",
          },
          {
            jobId: created.id,
            roundName: "Technical 1",
            interviewer: "Priya",
            outcome: "Pending",
            questions: "Graph traversal problem, focused on BFS vs DFS tradeoffs.",
          },
        ],
      });
    }
  }

  console.log("Seeded demo user: demo@pipeline.dev / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
