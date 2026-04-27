import type { RiskCategory } from "@/types/contract";

type ClauseActionRisk = {
  category: RiskCategory;
  whyRisky?: string;
  whyItMatters?: string;
  suggestedImprovement?: string;
  originalRecommendedDraft?: string;
};

export function buildClauseAction(type: "simplify" | "safer" | "hidden" | "standard", risk: ClauseActionRisk) {
  const whyItMatters = risk.whyItMatters ?? risk.whyRisky ?? "";
  const recommendedDraft = risk.originalRecommendedDraft ?? risk.suggestedImprovement ?? "";

  if (type === "simplify") {
    return `Plain-English version: This clause may create ${risk.category.toLowerCase()} exposure because ${whyItMatters.toLowerCase()}`;
  }

  if (type === "safer") {
    return recommendedDraft;
  }

  if (type === "hidden") {
    return "Hidden risk to probe: whether this clause shifts uncapped costs, timing obligations, audit burden, or operational dependencies to your organization without a matching remedy.";
  }

  return "Standard position: define the obligation precisely, cap exposure where commercially appropriate, include cure periods, and require objective evidence before penalties or termination rights apply.";
}
