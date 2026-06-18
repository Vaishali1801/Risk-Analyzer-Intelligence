export const DEFAULT_CONFIDENCE_SCORE = 0.6;

export const CONFIDENCE_GUIDANCE = [
  "Confidence must be a decimal from 0 to 1.",
  "Higher confidence means stronger contract evidence.",
  "Lower confidence means indirect or ambiguous evidence.",
  "Do not inflate confidence when evidence is weak.",
  "Use around 0.6 when evidence requires human review.",
] as const;

export function normalizeConfidenceScore(value?: number | string): number {
  if (value === undefined) {
    return DEFAULT_CONFIDENCE_SCORE;
  }

  const parsedValue = parseConfidenceValue(value);

  if (parsedValue === null) {
    return DEFAULT_CONFIDENCE_SCORE;
  }

  const normalized =
    parsedValue.isPercentageString || (parsedValue.score > 1 && parsedValue.score <= 100)
      ? parsedValue.score / 100
      : parsedValue.score;

  return Math.min(1, Math.max(0, normalized));
}

export function formatConfidenceRulesForPrompt(): string {
  return [
    "Confidence:",
    "Use a number from 0 to 1.",
    "Higher confidence means stronger contract evidence.",
    "Lower confidence means indirect or ambiguous support.",
    "Do not inflate confidence where evidence is weak.",
    "Use around 0.6 when evidence requires human review.",
  ].join("\n");
}

function parseConfidenceValue(value: number | string): { score: number; isPercentageString: boolean } | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? { score: value, isPercentageString: false } : null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const hasPercentSign = trimmed.endsWith("%");
  const numericText = hasPercentSign ? trimmed.slice(0, -1).trim() : trimmed;
  const parsed = Number(numericText);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return { score: parsed, isPercentageString: hasPercentSign };
}
