import { RISK_CATEGORIES } from "@/constants/risk";
import type { ContractAnalysis, ContractRisk, DecisionRecommendation, Severity } from "@/types/contract";

export function summarizeRisks(risks: ContractRisk[]) {
  return risks.reduce(
    (summary, risk) => {
      summary.total += 1;
      if (risk.severity === "High") summary.high += 1;
      if (risk.severity === "Medium") summary.medium += 1;
      if (risk.severity === "Low") summary.low += 1;
      summary.byCategory[risk.category] += 1;
      return summary;
    },
    {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCategory: {
        Legal: 0,
        Financial: 0,
        Operational: 0,
        Compliance: 0,
        Technical: 0
      }
    }
  );
}

export function computeDecision(risks: ContractRisk[]): {
  overallRiskLevel: Severity;
  decisionRecommendation: DecisionRecommendation;
  decisionRationale: string;
  nextActions: string[];
} {
  const summary = summarizeRisks(risks);
  const highNonMitigable = risks.filter((risk) => risk.severity === "High" && risk.mitigability === "Low").length;
  const lowConfidenceHighRisk = risks.filter((risk) => risk.severity === "High" && risk.confidence < 0.7).length;
  const exposedCategories = RISK_CATEGORIES.filter((category) => summary.byCategory[category] > 0).length;
  const exposureScore =
    summary.high * 5 + summary.medium * 2 + summary.low + highNonMitigable * 4 + Math.max(0, exposedCategories - 2);

  if (highNonMitigable >= 2 || (summary.high >= 4 && exposureScore >= 24) || exposureScore >= 30) {
    return {
      overallRiskLevel: "High",
      decisionRecommendation: "Reject",
      decisionRationale:
        "The contract contains multiple high-severity or low-mitigability exposures. The cumulative risk profile is not acceptable without major structural changes.",
      nextActions: [
        "Pause approval until high-severity exposures are removed or capped.",
        "Escalate to legal, finance, and the business owner for redline decisions.",
        "Request revised liability, payment, and termination terms before negotiation continues."
      ]
    };
  }

  if (summary.high > 0 || summary.medium >= 3 || exposureScore >= 8 || lowConfidenceHighRisk > 0) {
    return {
      overallRiskLevel: summary.high > 0 ? "High" : "Medium",
      decisionRecommendation: "Renegotiate",
      decisionRationale:
        "The risk profile is manageable only if the highlighted clauses are renegotiated. Most issues appear mitigable through clearer wording, caps, controls, or commercial concessions.",
      nextActions: [
        "Renegotiate the top three risks before signature.",
        "Ask the counterparty for clarifying language and measurable obligations.",
        "Document residual risk acceptance if any medium-severity items remain."
      ]
    };
  }

  return {
    overallRiskLevel: summary.medium > 0 ? "Medium" : "Low",
    decisionRecommendation: "Accept",
    decisionRationale:
      "The contract appears acceptable for business approval. Remaining risks are low or manageable with standard governance and implementation controls.",
    nextActions: [
      "Proceed with approval subject to ordinary business owner sign-off.",
      "Track the identified low-risk obligations during implementation.",
      "Store the reviewed version with the risk memo for auditability."
    ]
  };
}

export function applyDecisionLogic(analysis: ContractAnalysis): ContractAnalysis {
  const riskSummary = summarizeRisks(analysis.risks);
  const decision = computeDecision(analysis.risks);

  return {
    ...analysis,
    riskSummary,
    overallRiskLevel: decision.overallRiskLevel,
    decisionRecommendation: decision.decisionRecommendation,
    decisionRationale: decision.decisionRationale,
    nextActions: decision.nextActions,
    topCriticalRisks: analysis.risks
      .filter((risk) => risk.severity === "High")
      .slice(0, 3)
      .map((risk) => risk.title)
      .concat(analysis.topCriticalRisks)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, 5)
  };
}
