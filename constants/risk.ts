import type { DecisionRecommendation, Mitigability, RiskCategory, Severity } from "@/types/contract";

export const RISK_CATEGORIES: RiskCategory[] = ["Legal", "Financial", "Operational", "Compliance", "Technical"];
export const SEVERITIES: Severity[] = ["High", "Medium", "Low"];
export const MITIGABILITY: Mitigability[] = ["High", "Medium", "Low"];

export const severityRank: Record<Severity, number> = {
  High: 3,
  Medium: 2,
  Low: 1
};

export const severityStyles: Record<Severity, string> = {
  High: "border-red-200 bg-red-50 text-red-700",
  Medium: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700"
};

export const decisionStyles: Record<DecisionRecommendation, string> = {
  Accept: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Renegotiate: "border-amber-200 bg-amber-50 text-amber-700",
  Reject: "border-red-200 bg-red-50 text-red-700"
};

export const categoryPalette: Record<RiskCategory, string> = {
  Legal: "#4f46e5",
  Financial: "#ef4444",
  Operational: "#f59e0b",
  Compliance: "#0ea5e9",
  Technical: "#10b981"
};
