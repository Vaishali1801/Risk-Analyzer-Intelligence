import type { ContractRisk } from "@/types/contract";

export function buildClauseAction(type: "simplify" | "safer" | "hidden" | "standard", risk: ContractRisk) {
  if (type === "simplify") {
    return `Plain-English version: This clause may create ${risk.category.toLowerCase()} exposure because ${risk.whyRisky.toLowerCase()}`;
  }

  if (type === "safer") {
    return risk.suggestedImprovement;
  }

  if (type === "hidden") {
    return "Hidden risk to probe: whether this clause shifts uncapped costs, timing obligations, audit burden, or operational dependencies to your organization without a matching remedy.";
  }

  return "Standard position: define the obligation precisely, cap exposure where commercially appropriate, include cure periods, and require objective evidence before penalties or termination rights apply.";
}
