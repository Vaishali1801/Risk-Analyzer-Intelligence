import { NextResponse } from "next/server";
import { demoAnalysis, demoContractText } from "@/data/demo-contract";
import { preprocessContractText } from "@/lib/parsers/preprocess";

export const runtime = "nodejs";

export async function GET() {
  const extractedCharacters = preprocessContractText(demoContractText).length;

  return NextResponse.json({
    analysisId: null,
    analysis: demoAnalysis,
    source: {
      sourceKind: "demo",
      documentName: demoAnalysis.contractTitle,
      extractedCharacters
    }
  });
}
