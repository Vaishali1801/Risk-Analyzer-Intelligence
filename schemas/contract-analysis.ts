import { z } from "zod";

export const RiskCategorySchema = z.enum(["Legal", "Financial", "Operational", "Compliance", "Technical"]);
export const SeveritySchema = z.enum(["High", "Medium", "Low"]);
export const MitigabilitySchema = z.enum(["High", "Medium", "Low"]);
export const DecisionRecommendationSchema = z.enum(["Accept", "Renegotiate", "Reject"]);
export const GapAnalysisActionSchema = z.enum(["Must Add", "Negotiate", "Optional"]);

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
  suggestedImprovement: z.string().min(10)
});

export const GapAnalysisItemSchema = z.object({
  id: z.string().min(1),
  clauseName: z.string().min(1),
  action: GapAnalysisActionSchema,
  impact: SeveritySchema,
  whyThisMatters: z.string().min(1),
  suggestedFix: z.string().min(1)
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

  const items = value.reduce<z.infer<typeof GapAnalysisItemSchema>[]>((normalizedItems, item, index) => {
    const record = getObjectRecord(item);
    if (!record) {
      recordDroppedGapItem(diagnostics, index, item, ["Invalid item shape"]);
      return normalizedItems;
    }

    const fallbackReasons: string[] = [];
    const id = getCleanString(record.id) || `GAP-${index + 1}`;
    if (!getCleanString(record.id)) {
      fallbackReasons.push(`Missing id -> generated ${id}`);
    }

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
    const droppedReasons: string[] = [];

    if (!clauseName) droppedReasons.push("Missing clauseName/title");
    if (!whyThisMatters) droppedReasons.push("Missing whyThisMatters");
    if (!suggestedFix) droppedReasons.push("Missing suggestedFix");

    if (droppedReasons.length) {
      recordDroppedGapItem(diagnostics, index, item, droppedReasons);
      return normalizedItems;
    }

    const action = normalizeGapAction(record.action, fallbackReasons);
    const impact = normalizeGapImpact(record.impact, fallbackReasons);
    const normalizedItem = {
      id,
      clauseName,
      action,
      impact,
      whyThisMatters,
      suggestedFix
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

    if (fallbackReasons.length) {
      recordFallbackGapItem(diagnostics, index, id, item, fallbackReasons);
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

function getObjectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getCleanString(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function getNormalizedToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "high") return "High";
  if (normalizedValue === "medium") return "Medium";
  if (normalizedValue === "low") return "Low";

  fallbackReasons.push("Unknown impact -> defaulted to Medium");
  return "Medium";
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
  risks: z.array(ContractRiskSchema).min(1).max(30),
  gapAnalysis: OptionalGapAnalysisSchema,
  nextActions: z.array(z.string().min(6)).min(1).max(6)
});
