import { z } from "zod";

export const RiskCategorySchema = z.enum(["Legal", "Financial", "Operational", "Compliance", "Technical"]);
export const SeveritySchema = z.enum(["High", "Medium", "Low"]);
export const MitigabilitySchema = z.enum(["High", "Medium", "Low"]);
export const DecisionRecommendationSchema = z.enum(["Accept", "Renegotiate", "Reject"]);
export const GapAnalysisActionSchema = z.enum(["Must Add", "Negotiate", "Optional"]);
export const GapAnalysisStatusSchema = z.enum(["Pending", "Accepted", "Rejected"]);
export const DomainSchema = z.union([
  z.enum(["Financial", "Legal", "Compliance", "Operational", "Technical", "Technical/Data"]),
  z.string().min(1)
]);
export const CategoryLabelSchema = z.union([RiskCategorySchema, z.string().min(1)]);
export const SourceClauseIdListSchema = z.array(z.string().min(1));
export const OptionalConfidenceSchema = z.preprocess((value) => {
  if (typeof value === "undefined") return undefined;
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  if (value < 0) return 0;
  if (value > 100) return 1;
  return Number((value > 1 ? value / 100 : value).toFixed(2));
}, z.number().min(0).max(1).optional());
export const ClauseEvidenceSchema = z.object({
  clauseId: z.string().min(1).optional(),
  clauseIds: SourceClauseIdListSchema.optional(),
  clauseTitle: z.string().min(1).optional(),
  sectionNumber: z.string().min(1).optional(),
  sectionRef: z.string().min(1).optional(),
  pageNumber: z.number().int().positive().optional(),
  quote: z.string().min(1).optional(),
  highlightedText: z.string().min(1).optional(),
  confidence: OptionalConfidenceSchema
});
export const SourceClauseSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  clauseTitle: z.string().min(1).optional(),
  sectionTitle: z.string().min(1).optional(),
  sectionNumber: z.string().min(1).optional(),
  sectionRef: z.string().min(1).optional(),
  pageNumber: z.number().int().positive().optional(),
  clauseType: z.string().min(1).optional(),
  domainSignals: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.unknown()).optional()
});
export const ContractClauseSchema = SourceClauseSchema;
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

const DEFAULT_RISK_CONFIDENCE = 0.75;
const DEFAULT_GAP_AI_CONFIDENCE = 0.75;
const DEFAULT_RISK_CLAUSE_TEXT = "Clause evidence was not provided by the analysis.";
const DEFAULT_RISK_RATIONALE = "Risk rationale was not provided by the analysis.";
const DEFAULT_RISK_BUSINESS_IMPACT = "Business impact was not provided by the analysis.";
const DEFAULT_RISK_RECOMMENDATION = "Review and revise this clause with legal counsel before approval.";
const DEFAULT_GAP_CATEGORY = "General";
const DEFAULT_GAP_RATIONALE = "No rationale provided.";
const DEFAULT_GAP_FIX = "No suggested fix provided.";
const DEFAULT_GAP_RECOMMENDED_CLAUSE = "Recommended clause language is not available yet.";
const DEFAULT_COMPATIBILITY_DECISION_RATIONALE =
  "Preliminary compatibility value; final decision is derived by the application.";
const DEFAULT_COMPATIBILITY_NEXT_ACTION = "Review identified risks and gaps before approval.";
const DEFAULT_COMPATIBILITY_TOP_CRITICAL_RISK = "Review identified contract risks";

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
  clauseVariants: OptionalRiskClauseVariantsSchema,
  sourceClauseIds: SourceClauseIdListSchema.optional(),
  evidence: ClauseEvidenceSchema.optional(),
  primaryCategory: CategoryLabelSchema.optional(),
  secondaryCategories: z.array(CategoryLabelSchema).optional(),
  domain: DomainSchema.optional(),
  domainSignals: z.array(z.string().min(1)).optional()
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
    const rawTitle = getCleanString(record.title);
    const category = normalizeRiskCategory(record.category, fallbackReasons);
    const severity = normalizeSeverity(record.severity, fallbackReasons, "Medium");
    const evidenceSectionRef = getEvidenceSectionRef(record.evidence);
    const clauseRef = getCleanString(record.clauseRef) || evidenceSectionRef || "Section unknown";
    const baseClauseText = getCleanMultilineString(record.clauseText);
    const baseHighlightedText = getCleanString(record.highlightedText);
    const clauseText = baseClauseText || baseHighlightedText;
    const highlightedText = baseHighlightedText || buildShortTextFallback(clauseText, 160);
    const title = getRiskTitleFallback(rawTitle, [baseHighlightedText, baseClauseText, getCleanString(record.whyRisky), `${category} Risk`]);
    const mitigability = normalizeMitigability(record.mitigability, fallbackReasons);
    const confidence = normalizeRiskConfidence(record.confidence, fallbackReasons);
    const rawWhyRisky = getCleanString(record.whyRisky);
    const rawImpactIfIgnored = getCleanString(record.impactIfIgnored);
    const rawSuggestedImprovement = getCleanString(record.suggestedImprovement);
    const sourceClauseIds = getCleanStringArray(record.sourceClauseIds);
    const evidence = normalizeClauseEvidence(record.evidence, fallbackReasons);
    const primaryCategory = getCleanString(record.primaryCategory);
    const secondaryCategories = getCleanStringArray(record.secondaryCategories);
    const domain = getCleanString(record.domain);
    const domainSignals = getCleanStringArray(record.domainSignals);
    const whyRisky = getTextMeetingMinimum(rawWhyRisky, DEFAULT_RISK_RATIONALE);
    const impactIfIgnored = getTextMeetingMinimum(rawImpactIfIgnored, DEFAULT_RISK_BUSINESS_IMPACT);
    const suggestedImprovement = getTextMeetingMinimum(rawSuggestedImprovement, DEFAULT_RISK_RECOMMENDATION);
    const hasRiskEvidence = baseClauseText.length >= 10 || baseHighlightedText.length >= 10;
    const hasRiskExplanation = Boolean(getCleanString(record.whyRisky));
    const normalizedClauseText = clauseText.length >= 10 ? clauseText : DEFAULT_RISK_CLAUSE_TEXT;
    const normalizedHighlightedText = highlightedText.length >= 3 ? highlightedText : buildShortTextFallback(normalizedClauseText, 160);

    if (!rawId) fallbackReasons.push("Missing id -> generated fallback id");
    if (!getCleanString(record.clauseRef)) {
      fallbackReasons.push(evidenceSectionRef ? "Missing clauseRef -> used evidence sectionRef" : "Missing clauseRef -> defaulted to Section unknown");
    }
    if (rawTitle.length < 4) fallbackReasons.push("Missing or short title -> derived fallback title");
    if (!hasRiskEvidence && !hasRiskExplanation) droppedReasons.push("Missing clause evidence and risk explanation");
    if (!hasRiskEvidence) fallbackReasons.push("Missing clauseText/highlightedText -> defaulted clause evidence");
    if (rawWhyRisky.length < 10) fallbackReasons.push("Missing or short whyRisky -> defaulted rationale");
    if (rawImpactIfIgnored.length < 10) fallbackReasons.push("Missing or short impactIfIgnored -> defaulted business impact");
    if (rawSuggestedImprovement.length < 10) fallbackReasons.push("Missing or short suggestedImprovement -> defaulted recommendation");

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
      clauseText: normalizedClauseText,
      highlightedText: normalizedHighlightedText,
      mitigability,
      confidence,
      whyRisky,
      impactIfIgnored,
      suggestedImprovement,
      clauseVariants: record.clauseVariants,
      sourceClauseIds,
      evidence,
      primaryCategory: primaryCategory || undefined,
      secondaryCategories,
      domain: domain || undefined,
      domainSignals
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
  aiConfidence: z.number().min(0).max(1),
  status: GapAnalysisStatusSchema,
  whyThisMatters: z.string().min(1),
  suggestedFix: z.string().min(1),
  recommendedClause: z.string().min(1),
  clauseVariants: GapAnalysisClauseVariantsSchema,
  sourceClauseIds: SourceClauseIdListSchema.optional(),
  evidence: ClauseEvidenceSchema.optional(),
  primaryCategory: CategoryLabelSchema.optional(),
  secondaryCategories: z.array(CategoryLabelSchema).optional(),
  domain: DomainSchema.optional(),
  domainSignals: z.array(z.string().min(1)).optional(),
  missingOrWeakProtection: z.string().min(1).optional()
});

export const DomainFindingSchema = z.object({
  domain: DomainSchema,
  risks: z.array(ContractRiskSchema).optional(),
  gaps: z.array(GapAnalysisItemSchema).optional(),
  recommendations: z.array(z.string().min(1)).optional(),
  sourceClauseIds: SourceClauseIdListSchema.optional(),
  confidence: OptionalConfidenceSchema,
  primaryDomainSignals: z.array(z.string().min(1)).optional(),
  secondaryDomainSignals: z.array(z.string().min(1)).optional()
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

    const whyThisMatters = getCleanString(record.whyThisMatters) || DEFAULT_GAP_RATIONALE;
    const suggestedFix = getCleanString(record.suggestedFix) || DEFAULT_GAP_FIX;
    const category = getCleanString(record.category) || DEFAULT_GAP_CATEGORY;
    const aiConfidence = normalizeGapAiConfidence(record.aiConfidence, fallbackReasons);
    const status = normalizeGapStatus(record.status, fallbackReasons);
    const recommendedClause = getCleanMultilineString(record.recommendedClause) || DEFAULT_GAP_RECOMMENDED_CLAUSE;
    const clauseVariants = normalizeGapClauseVariants(record.clauseVariants, recommendedClause, fallbackReasons);
    const sourceClauseIds = getCleanStringArray(record.sourceClauseIds);
    const evidence = normalizeClauseEvidence(record.evidence, fallbackReasons);
    const primaryCategory = getCleanString(record.primaryCategory);
    const secondaryCategories = getCleanStringArray(record.secondaryCategories);
    const domain = getCleanString(record.domain);
    const domainSignals = getCleanStringArray(record.domainSignals);
    const missingOrWeakProtection = getCleanString(record.missingOrWeakProtection);
    const droppedReasons: string[] = [];

    if (!clauseName) droppedReasons.push("Missing clauseName/title");
    if (!getCleanString(record.category)) fallbackReasons.push("Missing category -> defaulted to General");
    if (!getCleanString(record.whyThisMatters)) fallbackReasons.push("Missing whyThisMatters -> defaulted rationale");
    if (!getCleanString(record.suggestedFix)) fallbackReasons.push("Missing suggestedFix -> defaulted suggested fix");
    if (!getCleanMultilineString(record.recommendedClause)) fallbackReasons.push("Missing recommendedClause -> defaulted recommended clause");

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
      clauseVariants,
      sourceClauseIds,
      evidence,
      primaryCategory: primaryCategory || undefined,
      secondaryCategories,
      domain: domain || undefined,
      domainSignals,
      missingOrWeakProtection: missingOrWeakProtection || undefined
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

function getCleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return undefined;

  const cleaned = value.map((item) => getCleanString(item)).filter(Boolean);
  return cleaned.length ? Array.from(new Set(cleaned)) : undefined;
}

function normalizeOptionalConfidence(value: unknown, fallbackReasons: string[], fieldName: string) {
  if (typeof value === "undefined") return undefined;

  if (typeof value !== "number" || !Number.isFinite(value)) {
    fallbackReasons.push(`${fieldName} confidence ignored because it was not numeric`);
    return undefined;
  }

  if (value < 0) {
    fallbackReasons.push(`${fieldName} confidence below range -> clamped to 0%`);
    return 0;
  }

  if (value > 100) {
    fallbackReasons.push(`${fieldName} confidence above range -> clamped to 1.0 (100% display)`);
    return 1;
  }

  return Number((value > 1 ? value / 100 : value).toFixed(2));
}

function normalizeClauseEvidence(value: unknown, fallbackReasons: string[]) {
  const record = getObjectRecord(value);
  if (!record) return undefined;

  const evidence = {
    clauseId: getCleanString(record.clauseId) || undefined,
    clauseIds: getCleanStringArray(record.clauseIds),
    clauseTitle: getCleanString(record.clauseTitle) || undefined,
    sectionNumber: getCleanString(record.sectionNumber) || undefined,
    sectionRef: getCleanString(record.sectionRef) || undefined,
    pageNumber: normalizePositiveInteger(record.pageNumber),
    quote: getCleanMultilineString(record.quote) || undefined,
    highlightedText: getCleanString(record.highlightedText) || undefined,
    confidence: normalizeOptionalConfidence(record.confidence, fallbackReasons, "Evidence")
  };
  const normalizedEvidence = Object.fromEntries(Object.entries(evidence).filter(([, item]) => typeof item !== "undefined"));

  return Object.keys(normalizedEvidence).length ? normalizedEvidence : undefined;
}

function getEvidenceSectionRef(value: unknown) {
  const record = getObjectRecord(value);
  return record ? getCleanString(record.sectionRef) : "";
}

function normalizePositiveInteger(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const integer = Math.trunc(value);
  return integer > 0 ? integer : undefined;
}

function getTextMeetingMinimum(value: string, fallback: string, minLength = 10) {
  return value.length >= minLength ? value : fallback;
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

function getRiskTitleFallback(rawTitle: string, candidates: string[]) {
  const candidate = [rawTitle, ...candidates].map((value) => getCleanString(value)).find((value) => value.length >= 4) || "Contract Risk";
  const sentenceMatch = candidate.match(/^.*?[.!?](?=\s|$)/);
  const title = sentenceMatch?.[0] || candidate;
  const conciseTitle = title.replace(/[.!?]+$/, "").trim();
  return buildShortTextFallback(conciseTitle || "Contract Risk", 72);
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

function normalizeRiskConfidence(value: unknown, fallbackReasons: string[]) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fallbackReasons.push("Missing confidence -> defaulted to 75%");
    return DEFAULT_RISK_CONFIDENCE;
  }

  if (value < 0) {
    fallbackReasons.push("Confidence below range -> clamped to 0%");
    return 0;
  }

  if (value > 100) {
    fallbackReasons.push("Confidence above range -> clamped to 1.0 (100% display)");
    return 1;
  }

  const normalized = value > 1 ? value / 100 : value;
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

function normalizeGapAiConfidence(value: unknown, fallbackReasons: string[]) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fallbackReasons.push("Missing aiConfidence -> defaulted to 75%");
    return DEFAULT_GAP_AI_CONFIDENCE;
  }

  if (value < 0) {
    fallbackReasons.push("aiConfidence below range -> clamped to 0%");
    return 0;
  }

  if (value > 100) {
    fallbackReasons.push("aiConfidence above range -> clamped to 1.0 (100% display)");
    return 1;
  }

  const normalized = value > 1 ? value / 100 : value;
  return Number(normalized.toFixed(2));
}

function normalizeGapStatus(value: unknown, fallbackReasons: string[]): z.infer<typeof GapAnalysisStatusSchema> {
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "pending") return "Pending";
  if (normalizedValue === "accepted" || normalizedValue === "rejected") {
    // AI/raw gap statuses are compatibility input only; human review state creates Accepted/Rejected.
    fallbackReasons.push("AI-provided review status -> defaulted to Pending");
    return "Pending";
  }

  fallbackReasons.push("Unknown status -> defaulted to Pending");
  return "Pending";
}

function normalizeGapClauseVariants(
  value: unknown,
  recommendedClause: string,
  fallbackReasons: string[]
): z.infer<typeof GapAnalysisClauseVariantsSchema> {
  const record = getObjectRecord(value);
  if (!record) {
    fallbackReasons.push("Missing clauseVariants -> defaulted all variants");
  }

  const clauseVariants = {
    balanced: getCleanMultilineString(record?.balanced) || recommendedClause,
    detailed: getCleanMultilineString(record?.detailed) || recommendedClause,
    alternative: getCleanMultilineString(record?.alternative) || recommendedClause,
    protective: getCleanMultilineString(record?.protective) || recommendedClause
  };

  if (record) {
    (["balanced", "detailed", "alternative", "protective"] as const).forEach((key) => {
      if (!getCleanMultilineString(record[key])) {
        fallbackReasons.push(`Missing ${key} clause variant -> defaulted to recommended clause`);
      }
    });
  }

  return clauseVariants;
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

function preprocessContractAnalysis(value: unknown) {
  const record = getObjectRecord(value);
  if (!record) return value;

  const risks = Array.isArray(record.risks) ? record.risks : [];
  const gapAnalysis = typeof record.gapAnalysis === "undefined" && Array.isArray(record.gaps) ? record.gaps : record.gapAnalysis;
  const gaps = Array.isArray(gapAnalysis) ? gapAnalysis : [];

  return {
    ...record,
    gapAnalysis,
    overallRiskLevel: typeof record.overallRiskLevel === "undefined" ? "Medium" : record.overallRiskLevel,
    decisionRecommendation: typeof record.decisionRecommendation === "undefined" ? "Renegotiate" : record.decisionRecommendation,
    decisionRationale: typeof record.decisionRationale === "undefined" ? DEFAULT_COMPATIBILITY_DECISION_RATIONALE : record.decisionRationale,
    riskSummary: typeof record.riskSummary === "undefined" ? buildCompatibilityRiskSummary(risks) : record.riskSummary,
    topCriticalRisks: typeof record.topCriticalRisks === "undefined" ? buildCompatibilityTopCriticalRisks(risks) : record.topCriticalRisks,
    nextActions: typeof record.nextActions === "undefined" ? buildCompatibilityNextActions(risks, gaps) : record.nextActions
  };
}

function buildCompatibilityRiskSummary(risks: unknown[]) {
  return risks.reduce<z.infer<typeof RiskSummarySchema>>(
    (summary, risk) => {
      const record = getObjectRecord(risk);
      const severity = normalizeCompatibilitySeverity(record?.severity);
      const category = normalizeCompatibilityRiskCategory(record?.category);

      summary.total += 1;
      summary[severity.toLowerCase() as "high" | "medium" | "low"] += 1;
      summary.byCategory[category] += 1;
      return summary;
    },
    {
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      byCategory: {
        Legal: 0,
        Financial: 0,
        Operational: 0,
        Compliance: 0,
        Technical: 0
      }
    }
  );
}

function buildCompatibilityTopCriticalRisks(risks: unknown[]) {
  const titles = risks
    .map((risk) => {
      const record = getObjectRecord(risk);
      if (!record) return "";

      return getRiskTitleFallback(getCleanString(record.title), [
        getCleanString(record.highlightedText),
        getCleanMultilineString(record.clauseText),
        getCleanString(record.whyRisky),
        `${normalizeCompatibilityRiskCategory(record.category)} Risk`
      ]);
    })
    .filter((title) => title.length >= 3)
    .slice(0, 5);

  return titles.length ? titles : [DEFAULT_COMPATIBILITY_TOP_CRITICAL_RISK];
}

function buildCompatibilityNextActions(risks: unknown[], gaps: unknown[]) {
  if (risks.length && gaps.length) return [DEFAULT_COMPATIBILITY_NEXT_ACTION];
  if (risks.length) return ["Review identified risks before approval."];
  if (gaps.length) return ["Review identified gaps before approval."];
  return [DEFAULT_COMPATIBILITY_NEXT_ACTION];
}

function normalizeCompatibilitySeverity(value: unknown): z.infer<typeof SeveritySchema> {
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "high") return "High";
  if (normalizedValue === "low") return "Low";
  return "Medium";
}

function normalizeCompatibilityRiskCategory(value: unknown): z.infer<typeof RiskCategorySchema> {
  const normalizedValue = getNormalizedToken(value);
  if (normalizedValue === "legal") return "Legal";
  if (normalizedValue === "financial" || normalizedValue === "finance") return "Financial";
  if (normalizedValue === "compliance") return "Compliance";
  if (normalizedValue === "technical" || normalizedValue === "technology") return "Technical";
  return "Operational";
}

const ContractAnalysisObjectSchema = z.object({
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
  domainFindings: z.array(DomainFindingSchema).optional(),
  sourceClauses: z.array(SourceClauseSchema).optional(),
  nextActions: z.array(z.string().min(6)).min(1).max(6)
});

export const ContractAnalysisSchema = z.preprocess(preprocessContractAnalysis, ContractAnalysisObjectSchema);
