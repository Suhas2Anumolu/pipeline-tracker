import { NextResponse } from "next/server";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";
import { runHiringAgent, HiringAgentNotConfiguredError, HiringAgentRunError } from "@/lib/hiringAgent";

// hiring-agent's own pipeline (pymupdf_rag.py) expects an actual PDF, not
// extracted text — it re-derives structure (headings, sections) from the
// PDF itself, so this route intentionally only accepts .pdf uploads.
export async function POST(request: Request) {
  let tmpPath: string | null = null;
  try {
    await requireCurrentUserId();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "hiring-agent requires a PDF file (it parses PDF structure directly)." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const dir = await mkdtemp(path.join(tmpdir(), "hiring-agent-"));
    tmpPath = path.join(dir, "resume.pdf");
    await writeFile(tmpPath, Buffer.from(await file.arrayBuffer()));

    const result = await runHiringAgent(tmpPath);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    if (err instanceof HiringAgentNotConfiguredError) {
      return NextResponse.json({ error: err.message, code: "NOT_CONFIGURED" }, { status: 501 });
    }
    if (err instanceof HiringAgentRunError) {
      console.error("hiring-agent stderr:", err.stderr);
      return NextResponse.json({ error: err.message, code: "RUN_ERROR" }, { status: 502 });
    }
    console.error("Unexpected hiring-agent error:", err);
    return NextResponse.json({ error: "Something went wrong running the hiring agent." }, { status: 500 });
  } finally {
    if (tmpPath) {
      await unlink(tmpPath).catch(() => {});
    }
  }
}
