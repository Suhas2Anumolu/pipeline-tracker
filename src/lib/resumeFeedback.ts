import { callLLM, parseJsonResponse } from "@/lib/llm";

export type ResumeFeedback = {
  matchScore: number;
  criticalFixes: string[];
  missingKeywords: string[];
  summary: string;
};

const SYSTEM_PROMPT = `You are an expert AI Resume Reviewer and Technical Recruiter. Your sole task is to analyze the provided resume text against the provided job description.

CRITICAL INSTRUCTIONS:
1. Be constructively critical but highly professional in your tone.
2. Identify missing technical keywords, soft skills, or certifications.
3. Suggest exactly 3 immediate formatting or content fixes.
4. Provide an overall Match Score from 0 to 100 based on the job requirements.

OUTPUT FORMAT:
You must respond ONLY in clean, valid JSON format. Do not include markdown blocks like \`\`\`json. Use this exact JSON structure:
{
  "matchScore": 85,
  "criticalFixes": ["Fix 1", "Fix 2", "Fix 3"],
  "missingKeywords": ["Skill A", "Skill B"],
  "summary": "Your brief 3-sentence action plan here."
}`;

export async function generateResumeFeedback(resumeText: string, jdText: string): Promise<ResumeFeedback> {
  const userPrompt = `Job description:\n${jdText}\n\n---\n\nResume:\n${resumeText}`;
  const text = await callLLM(SYSTEM_PROMPT, userPrompt, 700);
  return parseJsonResponse<ResumeFeedback>(text, {
    matchScore: 0,
    criticalFixes: [],
    missingKeywords: [],
    summary: text,
  });
}
