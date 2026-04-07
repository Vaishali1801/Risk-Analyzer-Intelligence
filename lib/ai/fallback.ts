import { ContractAnalysisSchema } from "@/schemas/contract-analysis";
import type { ContractAnalysis } from "@/types/contract";
import { applyDecisionLogic } from "./decision";

export function createFallbackAnalysis(reason: string): ContractAnalysis {
  const fallback = {
    contractTitle: "Contract Review Requires Manual Validation",
    executiveSummary:
      "The AI response could not be validated reliably, so this conservative fallback flags the contract for human review rather than presenting unverified findings. Use the retry path or demo mode to view the complete workflow.",
    overallRiskLevel: "High",
    decisionRecommendation: "Renegotiate",
    decisionRationale:
      "The analysis output failed validation. A decision should not rely on incomplete or malformed model output.",
    riskSummary: {
      total: 1,
      high: 1,
      medium: 0,
      low: 0,
      byCategory: {
        Legal: 1,
        Financial: 0,
        Operational: 0,
        Compliance: 0,
        Technical: 0
      }
    },
    topCriticalRisks: ["Validated AI analysis unavailable"],
    risks: [
      {
        id: "FALLBACK-1",
        title: "Validated AI analysis unavailable",
        category: "Legal",
        severity: "High",
        clauseRef: "System validation",
        clauseText: reason,
        highlightedText: "AI output failed validation",
        mitigability: "High",
        confidence: 0.5,
        whyRisky:
          "Rendering malformed or unvalidated AI output would create false confidence and could lead to an unsupported contract decision.",
        impactIfIgnored:
          "Business stakeholders may approve the contract based on incomplete analysis rather than a reliable risk review.",
        suggestedImprovement:
          "Retry the analysis, reduce document length, or route the contract to manual review before making an approval decision."
      }
    ],
    nextActions: [
      "Retry the analysis once.",
      "If retry fails, route the contract to manual legal review.",
      "Use demo mode to evaluate the product workflow without an API call."
    ]
  } satisfies ContractAnalysis;

  return applyDecisionLogic(ContractAnalysisSchema.parse(fallback));
}
