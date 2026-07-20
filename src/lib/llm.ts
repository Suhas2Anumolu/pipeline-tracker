// Powers the AI follow-up generator and resume feedback. Supports three
// providers, switched via LLM_PROVIDER in .env:
//   - anthropic (default): Claude, needs ANTHROPIC_API_KEY
//   - deepseek: needs DEEPSEEK_API_KEY — much cheaper per token
//     (https://api-docs.deepseek.com), OpenAI-compatible wire format.
//     New accounts get a one-time 5M free token grant; it's not a
//     perpetually free API, just a very cheap one.
//   - gemini: needs GEMINI_API_KEY from https://aistudio.google.com/apikey.
//     Google AI Studio's free tier is genuinely free (rate-limited, not a
//     trial credit that runs out) — the most likely reason someone already
//     has this key sitting around.

export class LlmNotConfiguredError extends Error {
  constructor(envVar: string, url: string) {
    super(`${envVar} is not set. Add one from ${url} to .env to enable this.`);
  }
}

type Provider = "anthropic" | "deepseek" | "gemini";

function getProvider(): Provider {
  const raw = (process.env.LLM_PROVIDER || "anthropic").toLowerCase();
  if (raw === "deepseek") return "deepseek";
  if (raw === "gemini") return "gemini";
  return "anthropic";
}

export async function callLLM(system: string, userPrompt: string, maxTokens = 700): Promise<string> {
  const provider = getProvider();
  if (provider === "deepseek") return callDeepSeek(system, userPrompt, maxTokens);
  if (provider === "gemini") return callGemini(system, userPrompt, maxTokens);
  return callAnthropic(system, userPrompt, maxTokens);
}

async function callAnthropic(system: string, userPrompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new LlmNotConfiguredError("ANTHROPIC_API_KEY", "https://console.anthropic.com");

  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Anthropic API returned ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return (data.content ?? [])
    .filter((block: { type: string }) => block.type === "text")
    .map((block: { text: string }) => block.text)
    .join("\n");
}

async function callDeepSeek(system: string, userPrompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new LlmNotConfiguredError("DEEPSEEK_API_KEY", "https://platform.deepseek.com/api_keys");

  // deepseek-chat is a legacy alias for this exact model, being retired
  // 2026-07-24 — using the real V4 model id directly so this doesn't quietly
  // break right after you set it up.
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`DeepSeek API returned ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(system: string, userPrompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LlmNotConfiguredError("GEMINI_API_KEY", "https://aistudio.google.com/apikey");

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini API returned ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? "").join("\n");
}

export function parseJsonResponse<T>(text: string, fallback: T): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return fallback;
  }
}
