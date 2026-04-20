import { NextResponse } from "next/server";
import { analyzeContract } from "@/lib/ai/analyzeContract";
import { extractContractText, ParserError } from "@/lib/parsers/extractText";
import { preprocessContractText } from "@/lib/parsers/preprocess";
import type { AnalysisSource } from "@/types/contract";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE_BYTES = 12 * 1024 * 1024;
const MIN_TEXT_LENGTH = 200;

function buildSource(sourceKind: AnalysisSource["sourceKind"], documentName: string, extractedCharacters: number): AnalysisSource {
  return {
    sourceKind,
    documentName,
    extractedCharacters
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Analysis timed out. Try a shorter contract or use demo mode.")), timeoutMs);
    })
  ]);
}

function normalizeDocumentName(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let rawText = "";
    let source: AnalysisSource;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { text?: string; documentName?: string };
      const text = typeof body.text === "string" ? body.text.trim() : "";

      if (!text) {
        return NextResponse.json({ error: "Paste contract text before running the review." }, { status: 400 });
      }

      rawText = text;
      source = buildSource("paste", normalizeDocumentName(body.documentName, "Pasted Document"), 0);
    } else {
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

      rawText = await extractContractText(file);
      source = buildSource("upload", file.name, 0);
    }

    const text = preprocessContractText(rawText);
    source = buildSource(source.sourceKind, source.documentName, text.length);

    if (text.length < MIN_TEXT_LENGTH) {
      return NextResponse.json(
        {
          error:
            source.sourceKind === "paste"
              ? "We could not analyze this text because it is too short. Paste a longer contract or clause set."
              : "We could not extract enough contract text to analyze. Please try a clearer PDF or DOCX."
        },
        { status: 422 }
      );
    }

    const analysis = await withTimeout(analyzeContract(text), 55000);

    return NextResponse.json({
      analysisId: null,
      analysis,
      source
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
