export const GAP_PRIORITIES = ["Must Add", "Negotiate", "Optional"] as const;

export type GapPriority = (typeof GAP_PRIORITIES)[number];

export const GAP_PRIORITY_NORMALIZATION: Record<string, GapPriority> = {
  "must add": "Must Add",
  required: "Must Add",
  mandatory: "Must Add",
  critical: "Must Add",
  essential: "Must Add",
  "must have": "Must Add",
  "material gap": "Must Add",
  "high priority": "Must Add",
  negotiate: "Negotiate",
  recommended: "Negotiate",
  "should add": "Negotiate",
  "clarification needed": "Negotiate",
  "needs negotiation": "Negotiate",
  "medium priority": "Negotiate",
  important: "Negotiate",
  optional: "Optional",
  "nice to have": "Optional",
  "low priority": "Optional",
  enhancement: "Optional",
  "drafting improvement": "Optional",
  "governance enhancement": "Optional",
};

export const GAP_PRIORITY_GUIDANCE: Record<GapPriority, readonly string[]> = {
  "Must Add": [
    "missing critical enterprise protection",
    "absent confidentiality, liability, audit, deletion, or breach notification obligation",
    "material legal, compliance, security, operational, or financial exposure",
  ],
  Negotiate: [
    "missing governance mechanism that should be added",
    "absent transition, AI opt-out, residency, portability, or subprocessor notification provision",
    "important protection depending on business context",
  ],
  Optional: [
    "lower-impact governance enhancement",
    "optional reporting, benchmarking, or transparency provision",
    "drafting or maturity improvement",
  ],
};

export function normalizeGapPriority(value?: string): GapPriority {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return "Negotiate";
  }

  return GAP_PRIORITY_NORMALIZATION[normalized] ?? "Negotiate";
}

export function isGapPriority(value: string): value is GapPriority {
  return GAP_PRIORITIES.includes(value as GapPriority);
}

export function formatGapPriorityRulesForPrompt(): string {
  return [
    "Gap priorities:",
    "Must Add = critical missing protection with material exposure.",
    "Negotiate = important protection that should be requested.",
    "Optional = lower-impact maturity or clarity improvement.",
    "Use gap priority only for absent protections, not weak existing clauses.",
  ].join("\n");
}
