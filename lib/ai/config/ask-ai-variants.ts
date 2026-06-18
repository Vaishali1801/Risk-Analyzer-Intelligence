export const RISK_VARIANT_KEYS = ["balanced", "protective", "standard"] as const;
export const GAP_VARIANT_KEYS = ["balanced", "detailed", "alternative", "protective"] as const;

export type RiskVariantKey = (typeof RISK_VARIANT_KEYS)[number];
export type GapVariantKey = (typeof GAP_VARIANT_KEYS)[number];

export const RISK_VARIANT_LABELS: Record<RiskVariantKey, string> = {
  balanced: "More Balanced",
  protective: "More Protective",
  standard: "Industry Standard",
};

export const GAP_VARIANT_LABELS: Record<GapVariantKey, string> = {
  balanced: "More Balanced",
  detailed: "More Detailed",
  alternative: "Alternative Version",
  protective: "More Protective",
};

export const RISK_VARIANT_CONTEXT: Record<RiskVariantKey, string> = {
  balanced: "Make the recommendation more commercially balanced while preserving reasonable protection.",
  protective: "Strengthen the recommendation to reduce enterprise/customer exposure and improve accountability.",
  standard: "Use common enterprise contract wording or market-aligned fallback wording.",
};

export const GAP_VARIANT_CONTEXT: Record<GapVariantKey, string> = {
  balanced: "Create a fair and practical version of the missing protection.",
  detailed:
    "Add practical detail, operational clarity, measurable obligations, or additional explanation without making the clause unnecessarily long.",
  alternative: "Provide a different acceptable drafting approach while preserving the same business objective.",
  protective: "Strengthen the missing protection to reduce enterprise/customer exposure and improve accountability.",
};

export const VARIANT_LENGTH_GUIDANCE = [
  "Variants should be concise and negotiation-ready.",
  "Do not make clauses unnecessarily long.",
  "Detailed should add useful operational clarity, not excessive wording.",
  "Protective should strengthen protection without becoming unrealistic or overly broad.",
  "Standard should be market-aligned and not overly complex.",
] as const;

const RISK_VARIANT_NORMALIZATION: Record<string, RiskVariantKey> = {
  balanced: "balanced",
  morebalanced: "balanced",
  protective: "protective",
  moreprotective: "protective",
  standard: "standard",
  industrystandard: "standard",
};

const GAP_VARIANT_NORMALIZATION: Record<string, GapVariantKey> = {
  balanced: "balanced",
  morebalanced: "balanced",
  detailed: "detailed",
  moredetailed: "detailed",
  details: "detailed",
  alternative: "alternative",
  alternate: "alternative",
  alternateversion: "alternative",
  alternativeversion: "alternative",
  protective: "protective",
  moreprotective: "protective",
};

export function normalizeRiskVariant(value?: string): RiskVariantKey {
  const normalized = normalizeVariantInput(value);
  return normalized ? RISK_VARIANT_NORMALIZATION[normalized] ?? "balanced" : "balanced";
}

export function normalizeGapVariant(value?: string): GapVariantKey {
  const normalized = normalizeVariantInput(value);
  return normalized ? GAP_VARIANT_NORMALIZATION[normalized] ?? "balanced" : "balanced";
}

export function isRiskVariant(value: string): value is RiskVariantKey {
  return RISK_VARIANT_KEYS.includes(value as RiskVariantKey);
}

export function isGapVariant(value: string): value is GapVariantKey {
  return GAP_VARIANT_KEYS.includes(value as GapVariantKey);
}

export function formatAskAiVariantRulesForPrompt(scope: "risk" | "gap"): string {
  const contexts = scope === "risk" ? RISK_VARIANT_CONTEXT : GAP_VARIANT_CONTEXT;
  const lengthGuidance =
    scope === "risk"
      ? "Keep variants concise, negotiation-ready, market-aligned, and practical."
      : "Keep variants concise and negotiation-ready; detailed should add useful clarity without excess.";

  return [
    `${scope === "risk" ? "Risk" : "Gap"} variants:`,
    ...Object.entries(contexts).map(([key, context]) => `${key} = ${context}`),
    lengthGuidance,
  ].join("\n");
}

function normalizeVariantInput(value?: string): string {
  return value?.trim().toLowerCase().replace(/[\s_-]+/g, "") ?? "";
}
