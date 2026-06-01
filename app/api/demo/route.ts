import { NextResponse } from "next/server";
import { demoAnalysis, demoContractText, demoDocumentTitle } from "@/data/demo-contract";
import { preprocessContractText } from "@/lib/parsers/preprocess";
import type { AnalysisSource, ContractAnalysis } from "@/types/contract";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

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
    source: buildDemoSource(demoDocumentTitle, extractedCharacters)
  };
}

export async function GET() {
  const text = preprocessContractText(demoContractText);
  const extractedCharacters = text.length;

  return NextResponse.json(buildDemoPayload(demoAnalysis, extractedCharacters));
}
