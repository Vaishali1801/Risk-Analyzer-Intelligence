import { z } from "zod";

export const RiskCategorySchema = z.enum(["Legal", "Financial", "Operational", "Compliance", "Technical"]);
export const SeveritySchema = z.enum(["High", "Medium", "Low"]);
export const MitigabilitySchema = z.enum(["High", "Medium", "Low"]);
export const DecisionRecommendationSchema = z.enum(["Accept", "Renegotiate", "Reject"]);
export const GapAnalysisActionSchema = z.enum(["Must Add", "Negotiate", "Optional"]);
export const GapAnalysisStatusSchema = z.enum(["Pending", "Accepted", "Rejected"]);
export const GapAnalysisClauseVariantsSchema = z.object({
  balanced: z.string().min(1),
  detailed: z.string().min(1),
  alternative: z.string().min(1),
  protective: z.string().min(1)
});
export const RiskClauseVariantsSchema = z.object({
  balanced: z.string().min(1).optional(),
  protective: z.string().min(1).optional(),
  standard: z.string().min(1).optional()
});

const OptionalRiskClauseVariantsSchema = z.preprocess((value) => {
  const record = getObjectRecord(value);
  if (!record) return undefined;

  const variants = {
    balanced: getCleanMultilineString(record.balanced),
    protective: getCleanMultilineString(record.protective),
    standard: getCleanMultilineString(record.standard)
  };
  const normalizedVariants = Object.fromEntries(Object.entries(variants).filter(([, variant]) => variant));

  return Object.keys(normalizedVariants).length ? normalizedVariants : undefined;
}, RiskClauseVariantsSchema.optional());

export const ContractRiskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(4),
  category: RiskCategorySchema,
  severity: SeveritySchema,
  clauseRef: z.string().min(1),
  clauseText: z.string().min(10),
  highlightedText: z.string().min(3),
  mitigability: MitigabilitySchema,
  confidence: z.number().min(0).max(1),
  whyRisky: z.string().min(10),
  impactIfIgnored: z.string().min(10),
  suggestedImprovement: z.string().min(10),
  clauseVariants: OptionalRiskClauseVariantsSchema
});

type RiskAnalysisNormalizationDiagnostics = {
  receivedCount: number;
  normalizedCount: number;
  fallbackCount: number;
  droppedCount: number;
  fallbackReasons: string[];
  droppedReasons: string[];
  fallbackItems: { index: number; id: string; reasons: string[]; item: unknown }[];
  droppedItems: { index: number; reasons: string[]; item: unknown }[];
};

type RiskAnalysisNormalizationResult = {
  items: z.infer<typeof ContractRiskSchema>[];
  diagnostics: RiskAnalysisNormalizationDiagnostics;
};

export function normalizeRiskAnalysis(value: unknown): RiskAnalysisNormalizationResult {
  const diagnostics: RiskAnalysisNormalizationDiagnostics = {
    receivedCount: Array.isArray(value) ? value.length : 0,
    normalizedCount: 0,
    fallbackCount: 0,
    droppedCount: 0,
    fallbackReasons: [],
    droppedReasons: [],
    fallbackItems: [],
    droppedItems: []
  };

  if (!Array.isArray(value)) {
    return { items: [], diagnostics };
  }

  const usedIds = new Set<string>();
  const items = value.reduce<z.infer<typeof ContractRiskSchema>[]>((normalizedItems, item, index) => {
    const record = getObjectRecord(item);
    if (!record) {
      recordDroppedRiskItem(diagnostics, index, item, ["Invalid item shape"]);
      return normalizedItems;
    }

    const fallbackReasons: string[] = [];
    const droppedReasons: string[] = [];
    const rawId = getCleanString(record.id);
    const title = getCleanString(record.title);
    const category = normalizeRiskCategory(record.category, fallbackReasons);
    const severity = normalizeSeverity(record.severity, fallbackReasons, "Medium");
    const clauseRef = getCleanString(record.clauseRef) || "Section unknown";
    const baseClauseText = getCleanMultilineString(record.clauseText);
    const baseHighlightedText = getCleanString(record.highlightedText);
    const clauseText = baseClauseText || baseHighlightedText;
    const highlightedText = baseHighlightedText || buildShortTextFallback(clauseText, 160);
    const mitigability = normalizeMitigability(record.mitigability, fallbackReasons);
    const confidence = normalizeRiskConfidence(record.confidence);
    const whyRisky = getCleanString(record.whyRisky);
    const impactIfIgnored = getCleanString(record.impactIfIgnored);
    const suggestedImprovement = getCleanString(record.suggestedImprovement);

    if (!rawId) fallbackReasons.push("Missing id -> generated fallback id");
    if (!getCleanString(record.clauseRef)) fallbackReasons.push("Missing clauseRef -> defaulted to Section unknown");
    if (!title || title.length < 4) droppedReasons.push("Missing or short title");
    if (!clauseText || clauseText.length < 10) droppedReasons.push("Missing or short clauseText/highlightedText");
    if (!highlightedText || highlightedText.length < 3) droppedReasons.push("Missing or short highlightedText");
    if (confidence === null) droppedReasons.push("Invalid confidence");
    if (!whyRisky || whyRisky.length < 10) droppedReasons.push("Missing or short whyRisky");
    if (!impactIfIgnored || impactIfIgnored.length < 10) droppedReasons.push("Missing or short impactIfIgnored");
    if (!suggestedImprovement || suggestedImprovement.length < 10) droppedReasons.push("Missing or short suggestedImprovement");

    if (droppedReasons.length) {
      recordDroppedRiskItem(diagnostics, index, item, droppedReasons);
      return normalizedItems;
    }

    const id = getUniqueNormalizedId(rawId, "RISK", usedIds, fallbackReasons);
    const normalizedItem = {
      id,
      title,
      category,
      severity,
      clauseRef,
      clauseText,
      highlightedText,
      mitigability,
      confidence,
      whyRisky,
      impactIfIgnored,
      suggestedImprovement,
      clauseVariants: record.clauseVariants
    };
    const parsed = ContractRiskSchema.safeParse(normalizedItem);

    if (!parsed.success) {
      recordDroppedRiskItem(
        diagnostics,
        index,
        item,
        parsed.error.issues.map((issue) => issue.message)
      );
      return normalizedItems;
    }

    usedIds.add(parsed.data.id);
    if (fallbackReasons.length) {
      recordFallbackRiskItem(diagnostics, index, parsed.data.id, item, fallbackReasons);
    }

    normalizedItems.push(parsed.data);
    return normalizedItems;
  }, []);

  diagnostics.normalizedCount = items.length;
  logRiskAnalysisDiagnostics(diagnostics);

  return { items, diagnostics };
}

export const GapAnalysisItemSchema = z.object({
  id: z.string().min(1),
  clauseName: z.string().min(1),
  category: z.string().min(1),
  action: GapAnalysisActionSchema,
  impact: SeveritySchema,
  aiConfidence: z.number().min(0).max(100),
  status: GapAnalysisStatusSchema,
  whyThisMatters: z.string().min(1),
  suggestedFix: z.string().min(1),
  recommendedClause: z.string().min(1),
  clauseVariants: GapAnalysisClauseVariantsSchema
});

type GapAnalysisNormalizationDiagnostics = {
  receivedCount: number;
  normalizedCount: number;
  fallbackCount: number;
  droppedCount: number;
  fallbackReasons: string[];
  droppedReasons: string[];
  fallbackItems: { index: number; id: string; reasons: string[]; item: unknown }[];
  droppedItems: { index: number; reasons: string[]; item: unknown }[];
};

type GapAnalysisNormalizationResult = {
  items: z.infer<typeof GapAnalysisItemSchema>[];
  diagnostics: GapAnalysisNormalizationDiagnostics;
};

export function normalizeGapAnalysis(value: unknown): GapAnalysisNormalizationResult {
  const diagnostics: GapAnalysisNormalizationDiagnostics = {
    receivedCount: Array.isArray(value) ? value.length : 0,
    normalizedCount: 0,
    fallbackCount: 0,
    droppedCount: 0,
    fallbackReasons: [],
    droppedReasons: [],
    fallbackItems: [],
    droppedItems: []
  };

  if (!Array.isArray(value)) {
    return { items: [], diagnostics };
  }

  const usedIds = new Set<string>();
  const items = value.reduce<z.infer<typeof GapAnalysisItemSchema>[]>((normalizedItems, item, index) => {
    const record = getObjectRecord(item);
    if (!record) {
      recordDroppedGapItem(diagnostics, index, item, ["Invalid item shape"]);
      return normalizedItems;
    }

    const fallbackReasons: string[] = [];
    const rawId = getCleanString(record.id);
    if (!rawId) fallbackReasons.push("Missing id -> generated fallback id");

    let clauseName = getCleanString(record.clauseName);
    if (!clauseName) {
      const title = getCleanString(record.title);
      if (title) {
        clauseName = title;
        fallbackReasons.push("title used as clauseName alias");
      }
    }

    const whyThisMatters = getCleanString(record.whyThisMatters);
    const suggestedFix = getCleanString(record.suggestedFix);
    const category = getCleanString(record.category);
    const aiConfidence = normalizeGapAiConfidence(record.aiConfidence);
    const status = normalizeGapStatus(record.status, fallbackReasons);
    const recommendedClause = getCleanMultilineString(record.recommendedClause);
    const clauseVariants = normalizeGapClauseVariants(record.clauseVariants);
    const droppedReasons: string[] = [];

    if (!clauseName) droppedReasons.push("Missing clauseName/title");
    if (!category) droppedReasons.push("Missing category");
    if (aiConfidence === null) droppedReasons.push("Invalid aiConfidence");
    if (!whyThisMatters) droppedReasons.push("Missing whyThisMatters");
    if (!suggestedFix) droppedReasons.push("Missing suggestedFix");
    if (!recommendedClause) droppedReasons.push("Missing recommendedClause");
    if (!clauseVariants) droppedReasons.push("Missing or incomplete clauseVariants");

    if (droppedReasons.length) {
      recordDroppedGapItem(diagnostics, index, item, droppedReasons);
      return normalizedItems;
    }

    const action = normalizeGapAction(record.action, fallbackReasons);
    const impact = normalizeGapImpact(record.impact, fallbackReasons);
    const id = getUniqueNormalizedId(rawId, "GAP", usedIds, fallbackReasons);
    const normalizedItem = {
      id,
      clauseName,
      category,
      action,
      impact,
      aiConfidence,
      status,
      whyThisMatters,
      suggestedFix,
      recommendedClause,
      clauseVariants
    };
    const parsed = GapAnalysisItemSchema.safeParse(normalizedItem);

    if (!parsed.success) {
      recordDroppedGapItem(
        diagnostics,
        index,
        item,
        parsed.error.issues.map((issue) => issue.message)
      );
      return normalizedItems;
    }

    usedIds.add(parsed.data.id);
    if (fallbackReasons.length) {
      recordFallbackGapItem(diagnostics, index, parsed.data.id, item, fallbackReasons);
    }

    normalizedItems.push(parsed.data);
    return normalizedItems;
  }, []);

  diagnostics.normalizedCount = items.length;
  logGapAnalysisDiagnostics(diagnostics);

  return { items, diagnostics };
}

const OptionalGapAnalysisSchema = z.preprocess((value) => {
  if (typeof value === "undefined") return undefined;
  return normalizeGapAnalysis(value).items;
}, z.array(GapAnalysisItemSchema).optional());

const RiskAnalysisSchema = z.preprocess((value) => {
  return normalizeRiskAnalysis(value).items;
}, z.array(ContractRiskSchema).min(1).max(30));

function getObjectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getCleanString(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function getCleanMultilineString(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getNormalizedToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getUniqueNormalizedId(rawId: string, prefix: "RISK" | "GAP", usedIds: Set<string>, fallbackReasons: string[]) {
  const normalizedId = rawId.trim();
  if (normalizedId && !usedIds.has(normalizedId)) return normalizedId;

  if (normalizedId) fallbackReasons.push(`Duplicate id ${normalizedId} -> generated fallback id`);

  let suffix = 1;
  let fallbackId = `${prefix}-${suffix}`;
  while (usedIds.has(fallbackId)) {
    suffix += 1;
    fallbackId = `${prefix}-${suffix}`;
  }

  return fallbackId;
}

function buildShortTextFallback(value: string, maxLength: number) {
  const normalized = getCleanString(value);
  return normalized.length > maxLength ? normalized.slice(0, maxLength).trimEnd() : normalized;
}

function normalizeRiskCategory(value: unknown, fallbackReasons: string[]): z.infer<typeof RiskCategorySchema> {
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "legal") return "Legal";
  if (normalizedValue === "financial" || normalizedValue === "finance") return "Financial";
  if (normalizedValue === "operational" || normalizedValue === "operations") return "Operational";
  if (normalizedValue === "compliance") return "Compliance";
  if (normalizedValue === "technical" || normalizedValue === "technology") return "Technical";

  fallbackReasons.push("Unknown category -> defaulted to Operational");
  return "Operational";
}

function normalizeSeverity(value: unknown, fallbackReasons: string[], fallback: z.infer<typeof SeveritySchema>): z.infer<typeof SeveritySchema> {
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "high") return "High";
  if (normalizedValue === "medium") return "Medium";
  if (normalizedValue === "low") return "Low";

  fallbackReasons.push(`Unknown severity -> defaulted to ${fallback}`);
  return fallback;
}

function normalizeMitigability(value: unknown, fallbackReasons: string[]): z.infer<typeof MitigabilitySchema> {
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "high") return "High";
  if (normalizedValue === "medium") return "Medium";
  if (normalizedValue === "low") return "Low";

  fallbackReasons.push("Unknown mitigability -> defaulted to Medium");
  return "Medium";
}

function normalizeRiskConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) return null;

  const normalized = value > 1 ? value / 100 : value;
  if (normalized < 0 || normalized > 1) return null;

  return Number(normalized.toFixed(2));
}

function normalizeGapAction(value: unknown, fallbackReasons: string[]): z.infer<typeof GapAnalysisActionSchema> {
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "must add") return "Must Add";
  if (normalizedValue === "negotiate") return "Negotiate";
  if (normalizedValue === "optional") return "Optional";

  fallbackReasons.push("Unknown action -> defaulted to Negotiate");
  return "Negotiate";
}

function normalizeGapImpact(value: unknown, fallbackReasons: string[]): z.infer<typeof SeveritySchema> {
  return normalizeSeverity(value, fallbackReasons, "Medium");
}

function normalizeGapAiConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) return null;

  const percent = value <= 1 ? value * 100 : value;
  if (percent < 0 || percent > 100) return null;

  return Math.round(percent);
}

function normalizeGapStatus(value: unknown, fallbackReasons: string[]): z.infer<typeof GapAnalysisStatusSchema> {
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "pending") return "Pending";
  if (normalizedValue === "accepted") return "Accepted";
  if (normalizedValue === "rejected") return "Rejected";

  fallbackReasons.push("Unknown status -> defaulted to Pending");
  return "Pending";
}

function normalizeGapClauseVariants(value: unknown): z.infer<typeof GapAnalysisClauseVariantsSchema> | null {
  const record = getObjectRecord(value);
  if (!record) return null;

  const clauseVariants = {
    balanced: getCleanMultilineString(record.balanced),
    detailed: getCleanMultilineString(record.detailed),
    alternative: getCleanMultilineString(record.alternative),
    protective: getCleanMultilineString(record.protective)
  };

  const parsed = GapAnalysisClauseVariantsSchema.safeParse(clauseVariants);
  return parsed.success ? parsed.data : null;
}

function recordFallbackRiskItem(
  diagnostics: RiskAnalysisNormalizationDiagnostics,
  index: number,
  id: string,
  item: unknown,
  reasons: string[]
) {
  diagnostics.fallbackCount += 1;
  diagnostics.fallbackReasons.push(...reasons);
  diagnostics.fallbackItems.push({ index, id, reasons, item });
}

function recordDroppedRiskItem(
  diagnostics: RiskAnalysisNormalizationDiagnostics,
  index: number,
  item: unknown,
  reasons: string[]
) {
  diagnostics.droppedCount += 1;
  diagnostics.droppedReasons.push(...reasons);
  diagnostics.droppedItems.push({ index, reasons, item });
}

function logRiskAnalysisDiagnostics(diagnostics: RiskAnalysisNormalizationDiagnostics) {
  if (process.env.NODE_ENV !== "development" || typeof window !== "undefined") return;
  if (!diagnostics.fallbackCount && !diagnostics.droppedCount) return;

  console.warn("[risks] normalization diagnostics", {
    receivedCount: diagnostics.receivedCount,
    normalizedCount: diagnostics.normalizedCount,
    fallbackCount: diagnostics.fallbackCount,
    droppedCount: diagnostics.droppedCount,
    fallbackReasons: diagnostics.fallbackReasons,
    droppedReasons: diagnostics.droppedReasons
  });

  diagnostics.fallbackItems.forEach((item) => {
    console.warn("[risks] normalized item with fallback", item);
  });

  diagnostics.droppedItems.forEach((item) => {
    console.warn("[risks] dropped item", item);
  });
}

function recordFallbackGapItem(
  diagnostics: GapAnalysisNormalizationDiagnostics,
  index: number,
  id: string,
  item: unknown,
  reasons: string[]
) {
  diagnostics.fallbackCount += 1;
  diagnostics.fallbackReasons.push(...reasons);
  diagnostics.fallbackItems.push({ index, id, reasons, item });
}

function recordDroppedGapItem(
  diagnostics: GapAnalysisNormalizationDiagnostics,
  index: number,
  item: unknown,
  reasons: string[]
) {
  diagnostics.droppedCount += 1;
  diagnostics.droppedReasons.push(...reasons);
  diagnostics.droppedItems.push({ index, reasons, item });
}

function logGapAnalysisDiagnostics(diagnostics: GapAnalysisNormalizationDiagnostics) {
  if (process.env.NODE_ENV !== "development" || typeof window !== "undefined") return;
  if (!diagnostics.fallbackCount && !diagnostics.droppedCount) return;

  console.warn("[gapAnalysis] normalization diagnostics", {
    receivedCount: diagnostics.receivedCount,
    normalizedCount: diagnostics.normalizedCount,
    fallbackCount: diagnostics.fallbackCount,
    droppedCount: diagnostics.droppedCount,
    fallbackReasons: diagnostics.fallbackReasons,
    droppedReasons: diagnostics.droppedReasons
  });

  diagnostics.fallbackItems.forEach((item) => {
    console.warn("[gapAnalysis] normalized item with fallback", item);
  });

  diagnostics.droppedItems.forEach((item) => {
    console.warn("[gapAnalysis] dropped item", item);
  });
}

export const RiskSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  high: z.number().int().nonnegative(),
  medium: z.number().int().nonnegative(),
  low: z.number().int().nonnegative(),
  byCategory: z.object({
    Legal: z.number().int().nonnegative(),
    Financial: z.number().int().nonnegative(),
    Operational: z.number().int().nonnegative(),
    Compliance: z.number().int().nonnegative(),
    Technical: z.number().int().nonnegative()
  })
});

export const ContractAnalysisSchema = z.object({
  contractTitle: z.string().min(3),
  executiveSummary: z.string().min(40),
  aiInsight: z.string().optional(),
  overallRiskLevel: SeveritySchema,
  decisionRecommendation: DecisionRecommendationSchema,
  decisionRationale: z.string().min(20),
  riskSummary: RiskSummarySchema,
  topCriticalRisks: z.array(z.string().min(3)).min(1).max(5),
  risks: RiskAnalysisSchema,
  gapAnalysis: OptionalGapAnalysisSchema,
  nextActions: z.array(z.string().min(6)).min(1).max(6)
});
