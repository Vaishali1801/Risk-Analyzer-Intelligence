import { ContractAnalysisSchema } from "@/schemas/contract-analysis";
import type { AnalysisSource, ContractAnalysis } from "@/types/contract";

const STORAGE_KEY = "contract-risk-analysis-session";

export type StoredAnalysisSession = {
  analysisId: string | null;
  analysis: ContractAnalysis;
  source: AnalysisSource;
  savedAt: string;
};

export function writeAnalysisSession(session: StoredAnalysisSession) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function readAnalysisSession() {
  if (typeof window === "undefined") return null;

  const rawSession = window.sessionStorage.getItem(STORAGE_KEY);
  if (!rawSession) return null;

  try {
    const parsed = JSON.parse(rawSession) as Partial<StoredAnalysisSession>;
    const analysis = ContractAnalysisSchema.safeParse(parsed.analysis);
    const source = parsed.source;

    const validSource =
      source &&
      typeof source === "object" &&
      (source.sourceKind === "upload" || source.sourceKind === "paste" || source.sourceKind === "demo") &&
      typeof source.documentName === "string" &&
      typeof source.extractedCharacters === "number";

    if (
      !analysis.success ||
      !validSource ||
      typeof parsed.savedAt !== "string" ||
      (parsed.analysisId !== null && typeof parsed.analysisId !== "string" && typeof parsed.analysisId !== "undefined")
    ) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      analysisId: parsed.analysisId ?? null,
      analysis: analysis.data,
      source: source as AnalysisSource,
      savedAt: parsed.savedAt
    } satisfies StoredAnalysisSession;
  } catch {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearAnalysisSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(STORAGE_KEY);
}
