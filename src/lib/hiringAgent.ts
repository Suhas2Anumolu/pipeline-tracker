import { spawn } from "child_process";
import { readFile } from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";

// This calls HackerRank's actual open-sourced tool unmodified:
// https://github.com/interviewstreet/hiring-agent (MIT © HackerRank)
//
// We deliberately do NOT reimplement its prompts or scoring logic — the
// exact rubric lives in prompts/templates/*.jinja in that repo and is
// tuned/maintained by HackerRank. Reimplementing it from a README summary
// would produce something that just resembles their tool without actually
// being it. Instead this shells out to their real `score.py` CLI, exactly
// as documented in their own README:
//   python score.py /path/to/resume.pdf
//
// Setup (one-time, outside this project):
//   git clone https://github.com/interviewstreet/hiring-agent
//   cd hiring-agent && python -m venv .venv && source .venv/bin/activate
//   pip install -r requirements.txt
//   cp .env.example .env   # set LLM_PROVIDER + GEMINI_API_KEY, or run Ollama
// Then set HIRING_AGENT_DIR in this project's .env to that clone's path.

export class HiringAgentNotConfiguredError extends Error {}
export class HiringAgentRunError extends Error {
  constructor(message: string, public stderr: string) {
    super(message);
  }
}

export type HiringAgentResult = {
  stdout: string;
  fields: Record<string, string> | null;
};

const TIMEOUT_MS = 5 * 60 * 1000; // LLM calls (especially local Ollama) can be slow

export async function runHiringAgent(pdfPath: string): Promise<HiringAgentResult> {
  const agentDir = process.env.HIRING_AGENT_DIR;
  if (!agentDir) {
    throw new HiringAgentNotConfiguredError(
      "HIRING_AGENT_DIR is not set. Clone https://github.com/interviewstreet/hiring-agent, set it up per its README, then set HIRING_AGENT_DIR in .env to point at that folder."
    );
  }

  const pythonBin = process.env.HIRING_AGENT_PYTHON || path.join(agentDir, ".venv", "bin", "python");

  const { stdout, stderr, exitCode } = await new Promise<{ stdout: string; stderr: string; exitCode: number | null }>(
    (resolve, reject) => {
      const child = spawn(pythonBin, ["score.py", pdfPath], { cwd: agentDir });
      let stdout = "";
      let stderr = "";

      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new HiringAgentRunError("Hiring agent timed out after 5 minutes.", stderr));
      }, TIMEOUT_MS);

      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));
      child.on("error", (err) => {
        clearTimeout(timer);
        reject(
          new HiringAgentRunError(
            `Couldn't launch the hiring agent (${err.message}). Check HIRING_AGENT_DIR and that its venv is set up.`,
            stderr
          )
        );
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code });
      });
    }
  );

  if (exitCode !== 0) {
    throw new HiringAgentRunError(`hiring-agent exited with code ${exitCode}.`, stderr);
  }

  // In DEVELOPMENT_MODE (the repo's default while iterating), score.py
  // appends a row to resume_evaluations.csv — that's the structured data
  // source. We read the last row generically (by whatever the header says)
  // rather than hardcoding column names we can't verify without the exact
  // evaluator.py source, so this stays robust if their CSV schema changes.
  let fields: Record<string, string> | null = null;
  try {
    const csvPath = path.join(agentDir, "resume_evaluations.csv");
    const csvRaw = await readFile(csvPath, "utf-8");
    const rows: Record<string, string>[] = parse(csvRaw, { columns: true, skip_empty_lines: true });
    fields = rows.length > 0 ? rows[rows.length - 1] : null;
  } catch {
    // DEVELOPMENT_MODE may be off, or the CSV may not exist yet — the
    // stdout summary is still returned, just without structured fields.
    fields = null;
  }

  return { stdout, fields };
}
