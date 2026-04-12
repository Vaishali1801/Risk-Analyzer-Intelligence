import { ContractAnalysisSchema } from "@/schemas/contract-analysis";
import type { ContractAnalysis } from "@/types/contract";

const STORAGE_KEY = "contract-risk-analysis-session";

export type StoredAnalysisSession = {
  analysis: ContractAnalysis;
  sourceLabel: string;
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

    if (!analysis.success || typeof parsed.sourceLabel !== "string" || typeof parsed.savedAt !== "string") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return {
      analysis: analysis.data,
      sourceLabel: parsed.sourceLabel,
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
