import type { Job, InterviewRound, ResumeVersion } from "@prisma/client";
import { callLLM, parseJsonResponse, LlmNotConfiguredError } from "@/lib/llm";

export { LlmNotConfiguredError };

export type FollowUpKind = "thank_you" | "recruiter_follow_up" | "referral_request" | "negotiation";

const KIND_INSTRUCTIONS: Record<FollowUpKind, string> = {
  thank_you:
    "Write a thank-you note to send after an interview round. Reference something specific from the round if interview details are provided. Warm but brief, not obsequious.",
  recruiter_follow_up:
    "Write a polite check-in to a recruiter about an application that's had no update in a while. Restate interest without sounding impatient or entitled. Ask a clear, answerable question about status/timeline.",
  referral_request:
    "Write a message asking a contact (a friend, alum, or LinkedIn connection) for a referral at the company. Should work as a LinkedIn message or short email — brief, specific about the role, make it easy for them to say yes with minimal effort on their part.",
  negotiation:
    "Write an offer negotiation message. Professional, appreciative of the offer, specific about what's being asked (comp, start date, or similar) without being presented as a demand. Assume reasonable, good-faith negotiation, not aggressive tactics.",
};

export async function generateFollowUp(params: {
  kind: FollowUpKind;
  job: Job & { interviewRounds: InterviewRound[]; resumeVersion: ResumeVersion | null };
  extraContext?: string;
}): Promise<{ subject: string; body: string }> {
  const { kind, job, extraContext } = params;

  const roundsSummary = job.interviewRounds.length
    ? job.interviewRounds
        .map((r) => `- ${r.roundName}${r.interviewer ? ` with ${r.interviewer}` : ""}${r.outcome ? ` (${r.outcome})` : ""}`)
        .join("\n")
    : "No interview rounds logged yet.";

  const contextBlock = [
    `Company: ${job.company}`,
    `Role: ${job.role}`,
    `Current stage: ${job.status}`,
    `Applied: ${job.appliedDate.toDateString()}`,
    `Interview rounds:\n${roundsSummary}`,
    extraContext ? `Additional context from the user: ${extraContext}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const systemPrompt = `You help a student job-seeker draft short, natural outreach messages tied to a specific application. Write like a real person, not corporate-speak — no "I hope this email finds you well," no excessive exclamation points. Keep emails to 100-180 words. Respond with ONLY a JSON object of the shape {"subject": string, "body": string} — subject can be an empty string for messages that aren't emails (e.g. a LinkedIn DM). No markdown fences, no commentary, just the JSON object.`;

  const userPrompt = `Task: ${KIND_INSTRUCTIONS[kind]}\n\nApplication context:\n${contextBlock}`;

  const text = await callLLM(systemPrompt, userPrompt, 500);
  return parseJsonResponse(text, { subject: "", body: text });
}
