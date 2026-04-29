import { NextResponse } from "next/server";
import { demoAnalysis, demoContractText } from "@/data/demo-contract";
import { analyzeContract } from "@/lib/ai/analyzeContract";
import { preprocessContractText } from "@/lib/parsers/preprocess";
import type { AnalysisSource, ContractAnalysis } from "@/types/contract";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const DEMO_TIMEOUT_MS = 55000;

function buildDemoSource(documentName: string, extractedCharacters: number): AnalysisSource {
  return {
    sourceKind: "demo",
    documentName,
    extractedCharacters
  };
}

function buildDemoPayload(analysis: ContractAnalysis, extractedCharacters: number) {
  return {
    analysisId: null,
    analysis,
    source: buildDemoSource(analysis.contractTitle || demoAnalysis.contractTitle, extractedCharacters)
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Demo analysis timed out.")), timeoutMs);
    })
  ]);
}

export async function GET() {
  const text = preprocessContractText(demoContractText);
  const extractedCharacters = text.length;

  try {
    if (!text) {
      throw new Error("Demo contract text is unavailable.");
    }

    const analysis = await withTimeout(
      analyzeContract(text, { allowFallbackAnalysis: false }),
      DEMO_TIMEOUT_MS
    );

    return NextResponse.json(buildDemoPayload(analysis, extractedCharacters));
  } catch (error) {
    console.warn("Demo AI analysis unavailable; using bundled demo analysis.", error);
    return NextResponse.json(buildDemoPayload(demoAnalysis, extractedCharacters));
  }
}
