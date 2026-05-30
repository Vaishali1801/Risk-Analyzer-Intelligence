import type { z } from "zod";
import type { ContractAnalysisSchema, ContractRiskSchema, GapAnalysisItemSchema } from "@/schemas/contract-analysis";

export type RiskCategory = "Legal" | "Financial" | "Operational" | "Compliance" | "Technical";
export type Severity = "High" | "Medium" | "Low";
export type Mitigability = "High" | "Medium" | "Low";
export type DecisionRecommendation = "Accept" | "Renegotiate" | "Reject";
export type AnalysisSourceKind = "upload" | "paste" | "demo";

export type ContractRisk = z.infer<typeof ContractRiskSchema>;
export type GapAnalysisItem = z.infer<typeof GapAnalysisItemSchema>;
export type ContractAnalysis = z.infer<typeof ContractAnalysisSchema>;

export type AnalysisSource = {
  sourceKind: AnalysisSourceKind;
  documentName: string;
  extractedCharacters: number;
};

export type AnalyzeApiResponse = {
  analysis?: ContractAnalysis;
  analysisId?: string | null;
  source?: AnalysisSource;
  error?: string;
  recovery?: string;
};
