export const RISK_DOMAINS = [
  "Financial",
  "Legal",
  "Compliance",
  "Operational",
  "Technical",
] as const;

export type RiskDomain = (typeof RISK_DOMAINS)[number];

export const DOMAIN_NORMALIZATION: Record<string, RiskDomain> = {
  financial: "Financial",
  commercial: "Financial",
  pricing: "Financial",
  payment: "Financial",
  billing: "Financial",
  revenue: "Financial",
  cost: "Financial",
  legal: "Legal",
  contractual: "Legal",
  liability: "Legal",
  indemnity: "Legal",
  ip: "Legal",
  "intellectual property": "Legal",
  termination: "Legal",
  warranty: "Legal",
  compliance: "Compliance",
  regulatory: "Compliance",
  privacy: "Compliance",
  audit: "Compliance",
  governance: "Compliance",
  "data protection": "Compliance",
  retention: "Compliance",
  operational: "Operational",
  operations: "Operational",
  "service delivery": "Operational",
  support: "Operational",
  sla: "Operational",
  availability: "Operational",
  transition: "Operational",
  "change management": "Operational",
  "vendor management": "Operational",
  subcontractor: "Operational",
  dependency: "Operational",
  technical: "Technical",
  data: "Technical",
  security: "Technical",
  cybersecurity: "Technical",
  "information security": "Technical",
  cloud: "Technical",
  platform: "Technical",
  "ai governance": "Technical",
  ai: "Technical",
  "incident response": "Technical",
  "disaster recovery": "Technical",
};

export const DOMAIN_GUIDANCE: Record<RiskDomain, readonly string[]> = {
  Financial: [
    "pricing uncertainty",
    "payment ambiguity",
    "uncapped commercial exposure",
    "billing dispute risk",
  ],
  Legal: [
    "liability imbalance",
    "broad indemnity",
    "unclear ownership rights",
    "termination ambiguity",
  ],
  Compliance: [
    "auditability weakness",
    "regulatory exposure",
    "privacy governance concern",
    "retention ambiguity",
  ],
  Operational: [
    "service delivery ambiguity",
    "unclear support ownership",
    "transition dependency",
    "vendor management gap",
  ],
  Technical: [
    "weak security obligations",
    "broad AI/data usage rights",
    "disaster recovery weakness",
    "platform control gap",
  ],
};

export function normalizeRiskDomain(value?: string): RiskDomain {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return "Operational";
  }

  return DOMAIN_NORMALIZATION[normalized] ?? "Operational";
}

export function isRiskDomain(value: string): value is RiskDomain {
  return RISK_DOMAINS.includes(value as RiskDomain);
}

export function formatCategoryRulesForPrompt(): string {
  return [
    "Categories:",
    "Financial = pricing, payment, and commercial exposure.",
    "Legal = liability, IP, and contractual enforceability.",
    "Compliance = regulatory, audit, privacy, and governance concerns.",
    "Operational = delivery, support, process, and accountability risks.",
    "Technical = security, data, platform, and control concerns.",
    "Use the single best category value for the finding.",
  ].join("\n");
}
