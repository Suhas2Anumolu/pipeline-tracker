import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { scoreMatch } from "@/lib/match";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

const matchSchema = z.object({
  jdText: z.string().min(1),
  jdCompany: z.string().optional(),
  jdRole: z.string().optional(),
  mode: z.enum(["text", "versions"]).default("text"),
  // required when mode === "text"
  resumeText: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireCurrentUserId();

    const body = await request.json();
    const parsed = matchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { jdText, jdCompany, jdRole, mode } = parsed.data;

    if (mode === "text") {
      if (!parsed.data.resumeText) {
        return NextResponse.json({ error: "resumeText is required when mode is 'text'" }, { status: 400 });
      }
      const result = scoreMatch(parsed.data.resumeText, jdText);
      const saved = await prisma.resumeMatch.create({
        data: {
          userId,
          jdText,
          jdCompany,
          jdRole,
          matchScore: result.matchScore,
          matchingSkills: result.matchingSkills,
          missingSkills: result.missingSkills,
        },
      });
      return NextResponse.json({ mode, primary: { ...result, id: saved.id }, versions: [] });
    }

    // mode === "versions": score the JD against every saved resume version
    // that has text on file, and recommend whichever scores highest.
    const versions = await prisma.resumeVersion.findMany({
      where: { userId, resumeText: { not: null } },
    });

    if (versions.length === 0) {
      return NextResponse.json(
        { error: "No saved resume versions have text on file yet. Add resume text on the Resume versions page, or use 'Paste resume text' instead." },
        { status: 400 }
      );
    }

    const scored = versions
      .map((v) => ({
        resumeVersionId: v.id,
        label: v.label,
        ...scoreMatch(v.resumeText ?? "", jdText),
      }))
      .sort((a, b) => b.matchScore - a.matchScore);

    const best = scored[0];
    const saved = await prisma.resumeMatch.create({
      data: {
        userId,
        resumeVersionId: best.resumeVersionId,
        jdText,
        jdCompany,
        jdRole,
        matchScore: best.matchScore,
        matchingSkills: best.matchingSkills,
        missingSkills: best.missingSkills,
      },
    });

    return NextResponse.json({
      mode,
      primary: { ...best, id: saved.id },
      versions: scored,
      recommendedResumeVersion: best.label,
    });
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const matches = await prisma.resumeMatch.findMany({
      where: { userId },
      include: { resumeVersion: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(matches);
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    throw err;
  }
}
