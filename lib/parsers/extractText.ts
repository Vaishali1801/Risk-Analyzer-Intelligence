export class ParserError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = "ParserError";
    this.statusCode = statusCode;
  }
}

function extensionFor(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

export async function extractContractText(file: File): Promise<string> {
  const extension = extensionFor(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (extension === "pdf" || file.type === "application/pdf") {
    try {
      const pdfParseModule = (await import("pdf-parse")) as unknown as {
        default: (data: Buffer) => Promise<{ text: string }>;
      };
      const pdfParse = pdfParseModule.default;
      const parsed = await pdfParse(buffer);
      return parsed.text;
    } catch {
      throw new ParserError("We could not parse this PDF. Try exporting it as a text-based PDF or DOCX.");
    }
  }

  if (
    extension === "docx" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    try {
      const mammoth = await import("mammoth");
      const parsed = await mammoth.extractRawText({ buffer });
      return parsed.value;
    } catch {
      throw new ParserError("We could not parse this DOCX file. Please try a different DOCX export.");
    }
  }

  throw new ParserError("Unsupported file type. Please upload a PDF or DOCX contract.", 415);
}
