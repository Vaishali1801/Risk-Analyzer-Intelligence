import type { z } from "zod";
import type { ContractAnalysisSchema, ContractRiskSchema } from "@/schemas/contract-analysis";

export type RiskCategory = "Legal" | "Financial" | "Operational" | "Compliance" | "Technical";
export type Severity = "High" | "Medium" | "Low";
export type Mitigability = "High" | "Medium" | "Low";
export type DecisionRecommendation = "Accept" | "Renegotiate" | "Reject";

export type ContractRisk = z.infer<typeof ContractRiskSchema>;
export type ContractAnalysis = z.infer<typeof ContractAnalysisSchema>;

export type AnalyzeApiResponse = {
  analysis?: ContractAnalysis;
  extractedCharacters?: number;
  fileName?: string;
  error?: string;
  recovery?: string;
};
