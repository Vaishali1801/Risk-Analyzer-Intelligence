import { NextResponse } from "next/server";
import { analyzeContract } from "@/lib/ai/analyzeContract";
import { extractContractText, ParserError } from "@/lib/parsers/extractText";
import { preprocessContractText } from "@/lib/parsers/preprocess";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Analysis timed out. Try a shorter contract or use demo mode.")), timeoutMs);
    })
  ]);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please upload a PDF or DOCX contract." }, { status: 400 });
    }

    if (file.size === 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File is too large. Please upload a contract under 12 MB." }, { status: 400 });
    }

    const rawText = await extractContractText(file);
    const text = preprocessContractText(rawText);

    if (text.length < 200) {
      return NextResponse.json(
        { error: "We could not extract enough contract text to analyze. Please try a clearer PDF or DOCX." },
        { status: 422 }
      );
    }

    const analysis = await withTimeout(analyzeContract(text), 55000);

    return NextResponse.json({
      analysis,
      extractedCharacters: text.length,
      fileName: file.name
    });
  } catch (error) {
    if (error instanceof ParserError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const message = error instanceof Error ? error.message : "Unexpected analysis failure.";
    const status = message.includes("OPENAI_API_KEY") ? 503 : 500;

    return NextResponse.json(
      {
        error: message,
        recovery: "Use demo mode to explore the full product flow without an API call."
      },
      { status }
    );
  }
}
