export const SEVERITY_LEVELS = ["High", "Medium", "Low"] as const;

export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const SEVERITY_WEIGHTS: Record<SeverityLevel, number> = {
  High: 5,
  Medium: 3,
  Low: 1,
};

export const SEVERITY_NORMALIZATION: Record<string, SeverityLevel> = {
  critical: "High",
  severe: "High",
  major: "High",
  high: "High",
  elevated: "Medium",
  material: "Medium",
  moderate: "Medium",
  medium: "Medium",
  warning: "Medium",
  minor: "Low",
  low: "Low",
  informational: "Low",
};

export const SEVERITY_GUIDANCE: Record<SeverityLevel, readonly string[]> = {
  High: [
    "unlimited liability",
    "missing breach notification",
    "material compliance exposure",
  ],
  Medium: [
    "vague SLA commitments",
    "weak audit wording",
    "moderate operational concern",
  ],
  Low: [
    "drafting clarification",
    "limited governance concern",
    "minor wording ambiguity",
  ],
};

export function normalizeSeverity(value?: string): SeverityLevel {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return "Medium";
  }

  return SEVERITY_NORMALIZATION[normalized] ?? "Medium";
}

export function getSeverityWeight(severity: SeverityLevel): number {
  return SEVERITY_WEIGHTS[severity];
}

export function formatSeverityRulesForPrompt(): string {
  return [
    "Severity values:",
    "High = material enterprise exposure.",
    "Medium = moderate contractual concern.",
    "Low = limited drafting or governance concern.",
    "Use the single best severity value for the finding.",
  ].join("\n");
}
