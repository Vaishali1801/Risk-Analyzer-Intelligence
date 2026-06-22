import { NextResponse } from "next/server";
import { analyzeContract } from "@/lib/ai/analyzeContract";
import { extractContractText, ParserError } from "@/lib/parsers/extractText";
import { preprocessContractText } from "@/lib/parsers/preprocess";
import {
  AnalyzeInputError,
  validatePastedTextPayload,
  validatePreparedText,
  validateUploadedFile
} from "@/lib/validation/analyze-input";
import type { AnalysisSource } from "@/types/contract";

export const runtime = "nodejs";
export const maxDuration = 60;

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

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let rawText = "";
    let source: AnalysisSource;

    if (contentType.includes("application/json")) {
      let body: unknown;

      try {
        body = await request.json();
      } catch {
        throw new AnalyzeInputError("Invalid request format. Please try again.", 400);
      }

      const pastedInput = validatePastedTextPayload(body);

      rawText = pastedInput.rawText;
      source = buildSource("paste", pastedInput.documentName, 0);
    } else {
      const formData = await request.formData();
      const file = formData.get("file");

      validateUploadedFile(file as File | null);

      const uploadedFile = file as File;
      rawText = await extractContractText(uploadedFile);
      source = buildSource("upload", uploadedFile.name, 0);
    }

    const text = preprocessContractText(rawText);
    source = buildSource(source.sourceKind, source.documentName, text.length);

    const analysisSourceKind = source.sourceKind === "upload" ? "upload" : "paste";
    validatePreparedText(text, analysisSourceKind);

    const analysis = await withTimeout(analyzeContract(text), 55000);

    return NextResponse.json({
      analysisId: null,
      analysis,
      source
    });
  } catch (error) {
    if (error instanceof AnalyzeInputError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

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
