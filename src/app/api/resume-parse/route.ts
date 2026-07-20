import { NextResponse } from "next/server";
import { extractResumeText, UnsupportedFileError } from "@/lib/resumeParsing";
import { analyzeAtsCompatibility } from "@/lib/atsCheck";
import { requireCurrentUserId, StaleSessionError } from "@/lib/session";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
  try {
    await requireCurrentUserId();

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { text, fileType } = await extractResumeText(buffer, file.name);

    if (text.trim().length === 0) {
      return NextResponse.json(
        { error: "Couldn't extract any text from that file. It may be a scanned image — try pasting the text directly instead." },
        { status: 422 }
      );
    }

    const atsChecks = analyzeAtsCompatibility(text);

    return NextResponse.json({ text, fileType, atsChecks });
  } catch (err) {
    if (err instanceof StaleSessionError) {
      return NextResponse.json({ error: err.message, code: "STALE_SESSION" }, { status: 401 });
    }
    if (err instanceof UnsupportedFileError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Resume parse failed:", err);
    return NextResponse.json({ error: "Couldn't parse that file. Try a different format, or paste the text directly." }, { status: 500 });
  }
}
