import mammoth from "mammoth";

export type ParsedFile = {
  text: string;
  fileType: "pdf" | "docx" | "txt";
};

export class UnsupportedFileError extends Error {}

export async function extractResumeText(buffer: Buffer, filename: string): Promise<ParsedFile> {
  const ext = filename.toLowerCase().split(".").pop();

  if (ext === "pdf") {
    // pdf-parse ships a debug script that runs on import in some setups —
    // dynamic import keeps it out of the main bundle and avoids that path.
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return { text: data.text, fileType: "pdf" };
  }

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value, fileType: "docx" };
  }

  if (ext === "txt") {
    return { text: buffer.toString("utf-8"), fileType: "txt" };
  }

  throw new UnsupportedFileError(`Unsupported file type ".${ext}". Upload a PDF, DOCX, or TXT file.`);
}
