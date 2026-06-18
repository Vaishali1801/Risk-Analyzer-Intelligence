export const IMPACT_LEVELS = ["High", "Medium", "Low"] as const;

export type ImpactLevel = (typeof IMPACT_LEVELS)[number];

export const IMPACT_NORMALIZATION: Record<string, ImpactLevel> = {
  high: "High",
  critical: "High",
  severe: "High",
  material: "High",
  major: "High",
  medium: "Medium",
  moderate: "Medium",
  elevated: "Medium",
  important: "Medium",
  low: "Low",
  minor: "Low",
  informational: "Low",
  optional: "Low",
};

export const IMPACT_GUIDANCE: Record<ImpactLevel, readonly string[]> = {
  High: [
    "missing critical enterprise protection",
    "material legal, compliance, security, operational, or financial exposure",
    "absent confidentiality, liability, audit, deletion, or breach notification obligation",
  ],
  Medium: [
    "missing governance mechanism requiring negotiation",
    "absent transition, data residency, portability, or subprocessor notification provision",
    "moderate operational or compliance exposure",
  ],
  Low: [
    "lower-impact governance enhancement",
    "optional reporting or transparency improvement",
    "drafting or maturity improvement",
  ],
};

export function normalizeImpact(value?: string): ImpactLevel {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return "Medium";
  }

  return IMPACT_NORMALIZATION[normalized] ?? "Medium";
}

export function isImpactLevel(value: string): value is ImpactLevel {
  return IMPACT_LEVELS.includes(value as ImpactLevel);
}

export function formatImpactRulesForPrompt(): string {
  return [
    "Gap impact:",
    "High = missing protection creates material enterprise exposure.",
    "Medium = missing protection creates moderate operational or compliance concern.",
    "Low = lower-impact governance or drafting improvement.",
    "Use impact for missing protections, not weak existing clauses.",
  ].join("\n");
}
