import { z } from "zod";

export const RiskCategorySchema = z.enum(["Legal", "Financial", "Operational", "Compliance", "Technical"]);
export const SeveritySchema = z.enum(["High", "Medium", "Low"]);
export const MitigabilitySchema = z.enum(["High", "Medium", "Low"]);
export const DecisionRecommendationSchema = z.enum(["Accept", "Renegotiate", "Reject"]);

export const ContractRiskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(4),
  category: RiskCategorySchema,
  severity: SeveritySchema,
  clauseRef: z.string().min(1),
  clauseText: z.string().min(10),
  highlightedText: z.string().min(3),
  mitigability: MitigabilitySchema,
  confidence: z.number().min(0).max(1),
  whyRisky: z.string().min(10),
  impactIfIgnored: z.string().min(10),
  suggestedImprovement: z.string().min(10)
});

export const RiskSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
  byCategory: z.object({
    Legal: z.number().int().nonnegative(),
    Financial: z.number().int().nonnegative(),
    Operational: z.number().int().nonnegative(),
    Compliance: z.number().int().nonnegative(),
    Technical: z.number().int().nonnegative()
  })
});

export const ContractAnalysisSchema = z.object({
  contractTitle: z.string().min(3),
  executiveSummary: z.string().min(40),
  overallRiskLevel: SeveritySchema,
  decisionRecommendation: DecisionRecommendationSchema,
  decisionRationale: z.string().min(20),
  riskSummary: RiskSummarySchema,
  topCriticalRisks: z.array(z.string().min(3)).min(1).max(5),
  risks: z.array(ContractRiskSchema).min(1).max(30),
  nextActions: z.array(z.string().min(6)).min(1).max(6)
});
