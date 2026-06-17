import { RISK_CATEGORIES, severityRank, severityStyles } from "@/constants/risk";
import { getReportDocumentName } from "@/lib/reporting/metadata";
import type { AnalysisSource, ContractAnalysis, ContractRisk, DecisionRecommendation, GapAnalysisItem, RiskCategory, Severity } from "@/types/contract";

export type ReviewStatus = "pending" | "needs_change" | "accepted";
export type FinalReviewDecision = "Revised" | "Accepted" | "Pending";
export type FinalGapReviewDecision = "Accepted" | "Rejected" | "Pending";
export type FinalGapReviewCounts = Record<FinalGapReviewDecision, number>;
export type FinalOverallDecision = "Hold for Review" | "Approve with Changes" | "Approve";
export type GapReviewDecision = "accepted" | "rejected";
export type GapReviewById = Record<string, GapReviewDecision | FinalGapReviewDecision | undefined>;
export type SafeRiskCategory = RiskCategory | "Uncategorized";
export type SafeSeverity = Severity | "Unknown";
export type RiskClauseVariantKey = "balanced" | "protective" | "standard";
export type RiskClauseVariants = Partial<Record<RiskClauseVariantKey, string>>;
export type NormalizedClauseEvidence = NonNullable<ContractRisk["evidence"]>;

export type NormalizedFinding = {
  riskId: string;
  riskTitle: string;
  sectionRef: string;
  category: SafeRiskCategory;
  severity: SafeSeverity;
  confidence: number | null;
  clauseSnippet: string;
  fullClauseText: string;
  flaggedText: string;
  whyItMatters: string;
  businessImpact: string;
  originalRecommendedDraft: string;
  clauseVariants: RiskClauseVariants;
  sourceClauseIds: string[];
  evidence?: NormalizedClauseEvidence;
  primaryCategory: string;
  secondaryCategories: string[];
  domain?: string;
  domainSignals: string[];
};

export type RiskReviewState = {
  status: ReviewStatus;
  currentDraft: string;
  savedRecommendation?: string;
  lastUpdated?: string;
};

export type ReviewByRiskId = Record<string, RiskReviewState>;

export type NormalizedDocumentAnalysis = {
  documentName: string;
  contractTitle?: string;
  sourceType: AnalysisSource["sourceKind"];
  receivedForReviewDate?: string;
  analysisGeneratedAt: string;
  savedAt: string;
  executiveSummary: string;
  decisionRationale: string;
  nextActions: string[];
  aiInsight: string;
  overallRiskLevel: Severity;
  rawAiDecisionRecommendation: DecisionRecommendation;
  findings: NormalizedFinding[];
  gapAnalysis: GapAnalysisItem[];
  topCriticalRiskIds: string[];
  summary: {
    totalRiskCount: number;
    severityMix: Record<Severity, number>;
    categoryMix: Record<SafeRiskCategory, number>;
  };
};

export type FinalReviewRow = {
  finding: NormalizedFinding;
  decision: FinalReviewDecision;
  finalClause: string;
  actionLabel: string;
  originalClause: string;
  revisedClause?: string;
  note: string;
};

export type ReviewStatusCounts = Record<ReviewStatus, number>;
export type FinalReviewCounts = Record<FinalReviewDecision, number>;
export type SummaryRiskMixItem = { name: SafeRiskCategory; count: number };
export type SummaryRiskMix = {
  compactItems: SummaryRiskMixItem[];
  expandedItems: SummaryRiskMixItem[];
  hasHiddenCategories: boolean;
  fullText: string;
};
export type TopCriticalRiskItem = { id: string; label: string };
export type ExecutiveSummaryDetails = {
  overallPosition: string;
  keyDrivers: string;
  businessImpact: string;
};

export type ReportModel = {
  document: NormalizedDocumentAnalysis;
  reviewByRiskId: ReviewByRiskId;
  reviewStatusCounts: ReviewStatusCounts;
  finalReviewRows: FinalReviewRow[];
  finalReviewCounts: FinalReviewCounts;
  gapFinalReviewCounts: FinalGapReviewCounts;
  canFinalizeAll: boolean;
  // Risk-only compatibility field. Use canFinalizeAll when gap review state matters.
  canFinalize: boolean;
};

export const DEFAULT_REVIEW_STATUS: ReviewStatus = "pending";

export function normalizeOutputAnalysis(
  analysis: ContractAnalysis,
  source: AnalysisSource,
  savedAt: string
): NormalizedDocumentAnalysis {
  const findings = analysis.risks.map<NormalizedFinding>((risk) => ({
    riskId: risk.id,
    riskTitle: getUsableText(risk.title) || "Untitled risk",
    sectionRef: getUsableText(risk.clauseRef),
    category: getSafeCategory(risk),
    severity: getSafeSeverity(risk.severity),
    confidence: getSafeConfidenceValue(risk.confidence),
    clauseSnippet: getSafeClauseSnippet(risk),
    fullClauseText: getUsableText(risk.clauseText),
    flaggedText: getUsableText(risk.highlightedText),
    whyItMatters: getUsableText(risk.whyRisky),
    businessImpact: getUsableText(risk.impactIfIgnored),
    originalRecommendedDraft: getUsableText(risk.suggestedImprovement),
    clauseVariants: getRiskClauseVariants(risk.clauseVariants),
    sourceClauseIds: getStringArray(risk.sourceClauseIds),
    evidence: risk.evidence,
    primaryCategory: getUsableText(risk.primaryCategory) || risk.category,
    secondaryCategories: getStringArray(risk.secondaryCategories),
    domain: getUsableText(risk.domain) || undefined,
    domainSignals: getStringArray(risk.domainSignals)
  }));
  const summary = {
    totalRiskCount: getTotalRiskCount(findings),
    severityMix: getSeverityMix(findings),
    categoryMix: getCategoryMix(findings)
  };
  const topCriticalRiskIds = deriveTopRiskDriverIds(findings);
  const aiInsight = getValidAiInsight(analysis.aiInsight) || buildAiInsight(findings, summary.categoryMix);

  return {
    documentName: getReportDocumentName(source.documentName),
    contractTitle: analysis.contractTitle,
    sourceType: source.sourceKind,
    analysisGeneratedAt: savedAt,
    savedAt,
    executiveSummary: analysis.executiveSummary,
    // Compatibility fields from raw analysis are retained, but displayed decisions are deterministic below.
    decisionRationale: analysis.decisionRationale,
    nextActions: analysis.nextActions,
    aiInsight,
    // Displayed Risk Level is analytically recalculated from normalized risk severities.
    overallRiskLevel: getOverallRiskLevel(findings, analysis.overallRiskLevel),
    // Raw AI recommendation is compatibility-only; Final Review uses getFinalReviewDecision().
    rawAiDecisionRecommendation: analysis.decisionRecommendation,
    findings,
    gapAnalysis: normalizeOutputGapAnalysis(analysis.gapAnalysis),
    topCriticalRiskIds,
    summary
  };
}

export function createInitialReviewByRiskId(
  findings: NormalizedFinding[],
  current: ReviewByRiskId = {}
): ReviewByRiskId {
  return findings.reduce<ReviewByRiskId>((nextReview, finding) => {
    nextReview[finding.riskId] = current[finding.riskId] ?? {
      status: DEFAULT_REVIEW_STATUS,
      currentDraft: finding.originalRecommendedDraft
    };
    return nextReview;
  }, {});
}

export function getReviewState(reviewByRiskId: ReviewByRiskId, finding: NormalizedFinding): RiskReviewState {
  return reviewByRiskId[finding.riskId] ?? {
    status: DEFAULT_REVIEW_STATUS,
    currentDraft: finding.originalRecommendedDraft
  };
}

export function getReviewStateForRisk(
  riskId: string,
  reviewByRiskId: ReviewByRiskId,
  finding: Pick<NormalizedFinding, "originalRecommendedDraft">
): RiskReviewState {
  return reviewByRiskId[riskId] ?? {
    status: DEFAULT_REVIEW_STATUS,
    currentDraft: finding.originalRecommendedDraft
  };
}

export function getEffectiveReviewStatus(review: RiskReviewState): ReviewStatus {
  if (review.status === "needs_change" && !normalizeWhitespace(review.savedRecommendation ?? "")) {
    return "pending";
  }

  return review.status;
}

export function getTotalRiskCount(findings: NormalizedFinding[]) {
  return findings.length;
}

export function getSeverityMix(findings: NormalizedFinding[]): Record<Severity, number> {
  return findings.reduce<Record<Severity, number>>(
    (mix, finding) => {
      if (finding.severity !== "Unknown") {
        mix[finding.severity] += 1;
      }
      return mix;
    },
    { High: 0, Medium: 0, Low: 0 }
  );
}

export function getCategoryMix(findings: NormalizedFinding[]): Record<SafeRiskCategory, number> {
  return findings.reduce<Record<SafeRiskCategory, number>>(
    (mix, finding) => {
      mix[getSafeCategory(finding)] += 1;
      return mix;
    },
    {
      Legal: 0,
      Financial: 0,
      Operational: 0,
      Compliance: 0,
      Technical: 0,
      Uncategorized: 0
    }
  );
}

export function getTopCriticalRisks(findings: NormalizedFinding[], limit = 4) {
  const topRiskIds = new Set(deriveTopRiskDriverIds(findings, limit));
  return getPrioritizedFindings(findings).filter((finding) => topRiskIds.has(finding.riskId));
}

export function getPrioritizedFindings(findings: NormalizedFinding[]) {
  return findings
    .map((finding, index) => ({ finding, index }))
    .sort(compareTopRiskDriverCandidates)
    .map((item) => item.finding);
}

export function deriveTopRiskDriverIds(findings: NormalizedFinding[], limit = 4) {
  return getPrioritizedFindings(findings)
    .slice(0, limit)
    .map((finding) => finding.riskId);
}

export const getTopRiskDriverIds = deriveTopRiskDriverIds;

function compareTopRiskDriverCandidates(
  a: { finding: NormalizedFinding; index: number },
  b: { finding: NormalizedFinding; index: number }
) {
  return (
    getSafeSeverityRank(b.finding.severity) - getSafeSeverityRank(a.finding.severity) ||
    getConfidenceSortValue(b.finding.confidence) - getConfidenceSortValue(a.finding.confidence) ||
    getEvidenceAvailabilityScore(b.finding) - getEvidenceAvailabilityScore(a.finding) ||
    getFindingExplanationScore(b.finding) - getFindingExplanationScore(a.finding) ||
    a.index - b.index
  );
}

// Single displayed Risk Level source: analytical severity distribution, not AI overallRiskLevel.
export function getOverallRiskLevel(findings: NormalizedFinding[], fallback?: unknown): Severity {
  const severityMix = getSeverityMix(findings);
  const totalRisks = severityMix.High + severityMix.Medium + severityMix.Low;

  if (totalRisks <= 0) {
    const safeFallback = getSafeSeverity(fallback);
    return safeFallback === "Unknown" ? "Low" : safeFallback;
  }

  const weightedAverage = (5 * severityMix.High + 3 * severityMix.Medium + severityMix.Low) / totalRisks;
  const highRiskPercentage = severityMix.High / totalRisks;

  if (weightedAverage >= 3.8) return "High";
  if (totalRisks >= 2 && highRiskPercentage >= 0.4) return "High";
  if (weightedAverage >= 2.2) return "Medium";
  return "Low";
}

export function getSafeSeverity(severity: unknown): SafeSeverity {
  return isSeverity(severity) ? severity : "Unknown";
}

export function getSafeSeverityRank(severity: unknown) {
  const safeSeverity = getSafeSeverity(severity);
  return safeSeverity === "Unknown" ? 0 : severityRank[safeSeverity];
}

export function getSafeSeverityStyles(severity: unknown) {
  const safeSeverity = getSafeSeverity(severity);
  return safeSeverity === "Unknown" ? "border-slate-200 bg-slate-50 text-slate-600" : severityStyles[safeSeverity];
}

export function getSafeCategory(finding: { category?: unknown }): SafeRiskCategory {
  return isRiskCategory(finding.category) ? finding.category : "Uncategorized";
}

export function getSafeClauseSnippet(
  finding: Partial<Pick<NormalizedFinding, "clauseSnippet" | "flaggedText" | "fullClauseText">> & {
    highlightedText?: unknown;
    riskyLanguage?: unknown;
    clauseText?: unknown;
  }
) {
  return (
    getUsableText(finding.clauseSnippet) ||
    getUsableText(finding.highlightedText) ||
    getUsableText(finding.flaggedText) ||
    getUsableText(finding.riskyLanguage) ||
    buildShortClauseExcerpt(getUsableText(finding.fullClauseText) || getUsableText(finding.clauseText)) ||
    "Clause text unavailable"
  );
}

export function getSafeConfidenceValue(confidence: unknown) {
  return typeof confidence === "number" && Number.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null;
}

export function formatAiConfidence(confidence: unknown) {
  const safeConfidence = getSafeConfidenceValue(confidence);
  return safeConfidence === null ? "--" : `${Math.round(safeConfidence * 100)}%`;
}

export function getReviewStatusCounts(reviewByRiskId: ReviewByRiskId): ReviewStatusCounts {
  return Object.values(reviewByRiskId).reduce<ReviewStatusCounts>(
    (counts, review) => {
      const effectiveStatus = getEffectiveReviewStatus(review);

      if (effectiveStatus === "accepted") {
        counts.accepted += 1;
        return counts;
      }

      if (effectiveStatus === "needs_change") {
        counts.needs_change += 1;
        return counts;
      }

      counts.pending += 1;
      return counts;
    },
    { pending: 0, needs_change: 0, accepted: 0 }
  );
}

export function getFinalReviewRows(
  findings: NormalizedFinding[],
  reviewByRiskId: ReviewByRiskId
): FinalReviewRow[] {
  return findings.map((finding) => {
    const review = getReviewState(reviewByRiskId, finding);
    const savedClause = getUsableText(review.savedRecommendation);
    const originalClause = getFinalReviewOriginalClause(finding);

    if (review.status === "accepted") {
      return {
        finding,
        decision: "Accepted",
        finalClause: "Original retained",
        actionLabel: "View Original",
        originalClause,
        note: "Accepted as-is"
      };
    }

    if (review.status === "needs_change" && savedClause) {
      // "Needs Change" is the interactive workflow state; "Revised" is the final review/reporting label for saved recommendations.
      return {
        finding,
        decision: "Revised",
        finalClause: buildFinalClauseSnippet(savedClause),
        actionLabel: "View Changes",
        originalClause,
        revisedClause: savedClause,
        note: "Revised clause saved"
      };
    }

    return {
      finding,
      decision: "Pending",
      finalClause: "Awaiting decision",
      actionLabel: "Review",
      originalClause,
      note: "Awaiting final decision"
    };
  });
}

function getFinalReviewOriginalClause(finding: NormalizedFinding) {
  return (
    getUsableText(finding.fullClauseText) ||
    getUsableText(finding.clauseSnippet) ||
    getUsableText(finding.flaggedText) ||
    "Original clause text unavailable."
  );
}

export function getFinalReviewCounts(rows: FinalReviewRow[]): FinalReviewCounts {
  return rows.reduce<FinalReviewCounts>(
    (counts, row) => {
      counts[row.decision] += 1;
      return counts;
    },
    { Revised: 0, Accepted: 0, Pending: 0 }
  );
}

export function getFinalReviewDecision(
  finalReviewCounts: FinalReviewCounts,
  gapReviewCounts: FinalGapReviewCounts = { Accepted: 0, Rejected: 0, Pending: 0 }
): FinalOverallDecision {
  // Final Review is review-state driven; AI recommendation/rationale must not affect this outcome.
  if (finalReviewCounts.Pending > 0 || gapReviewCounts.Pending > 0) return "Hold for Review";
  if (finalReviewCounts.Revised > 0 || gapReviewCounts.Accepted > 0) return "Approve with Changes";
  return "Approve";
}

export function canFinalizeReview(finalReviewCounts: FinalReviewCounts) {
  return finalReviewCounts.Pending === 0;
}

export function canFinalizeAllReview(
  finalReviewCounts: FinalReviewCounts,
  gapReviewCounts: FinalGapReviewCounts = { Accepted: 0, Rejected: 0, Pending: 0 }
) {
  return canFinalizeReview(finalReviewCounts) && gapReviewCounts.Pending === 0;
}

export function getEffectiveGapReviewDecision(
  gap: Pick<GapAnalysisItem, "id" | "status">,
  gapReviewById: GapReviewById = {}
): FinalGapReviewDecision {
  const userReviewDecision = normalizeUserGapReviewDecision(gapReviewById[gap.id]);
  if (userReviewDecision) return userReviewDecision;

  // Raw/AI gap status is compatibility input only. Accepted/Rejected require explicit user review state.
  return normalizeRawGapStatus(gap.status);
}

export function getFinalGapReviewCounts(
  gaps: Array<Pick<GapAnalysisItem, "id" | "status">>,
  gapReviewById: GapReviewById = {}
): FinalGapReviewCounts {
  return gaps.reduce<FinalGapReviewCounts>(
    (counts, gap) => {
      counts[getEffectiveGapReviewDecision(gap, gapReviewById)] += 1;
      return counts;
    },
    { Accepted: 0, Rejected: 0, Pending: 0 }
  );
}

export function getReportModel(
  document: NormalizedDocumentAnalysis,
  reviewByRiskId: ReviewByRiskId,
  gapReviewById: GapReviewById = {}
): ReportModel {
  const finalReviewRows = getFinalReviewRows(document.findings, reviewByRiskId);
  const finalReviewCounts = getFinalReviewCounts(finalReviewRows);
  const gapFinalReviewCounts = getFinalGapReviewCounts(document.gapAnalysis, gapReviewById);

  return {
    document,
    reviewByRiskId,
    reviewStatusCounts: getReviewStatusCounts(reviewByRiskId),
    finalReviewRows,
    finalReviewCounts,
    gapFinalReviewCounts,
    canFinalizeAll: canFinalizeAllReview(finalReviewCounts, gapFinalReviewCounts),
    canFinalize: canFinalizeReview(finalReviewCounts)
  };
}

export function getUniqueClauseCount(findings: NormalizedFinding[], severity?: Severity) {
  const relevantFindings = severity ? findings.filter((finding) => finding.severity === severity) : findings;
  const clauseRefs = new Set(
    relevantFindings
      .map((finding) => normalizeWhitespace(finding.sectionRef))
      .filter(Boolean)
  );

  return clauseRefs.size || relevantFindings.length;
}

export function getSummaryInsight(document: NormalizedDocumentAnalysis) {
  return getUsableText(document.aiInsight) || buildAiInsight(document.findings, document.summary.categoryMix);
}

export function buildRiskMixSummary(categoryBreakdown: SummaryRiskMixItem[]): SummaryRiskMix | null {
  const visibleCategories = categoryBreakdown.filter((item) => item.count > 0);
  if (!visibleCategories.length) return null;

  const compactItems = visibleCategories.slice(0, 2);
  const expandedItems = visibleCategories.slice(0, 3);
  const fullText = buildRiskMixSummaryText(visibleCategories);

  return {
    compactItems,
    expandedItems,
    hasHiddenCategories: visibleCategories.length > compactItems.length,
    fullText
  };
}

export function buildRiskMixBreakdown(document: NormalizedDocumentAnalysis): SummaryRiskMixItem[] {
  return [...RISK_CATEGORIES, "Uncategorized" as const].map((name) => ({
    name,
    count: document.summary.categoryMix[name] ?? 0
  }));
}

export function buildTopCriticalRiskItems(document: NormalizedDocumentAnalysis): TopCriticalRiskItem[] {
  return document.topCriticalRiskIds
    .map((riskId) => document.findings.find((risk) => risk.riskId === riskId))
    .filter((risk): risk is NormalizedFinding => Boolean(risk))
    .map((risk) => ({
      id: risk.riskId,
      label: buildTopCriticalRiskLabel(risk.riskTitle)
    }));
}

export function buildExecutiveSummaryDetails(
  document: NormalizedDocumentAnalysis,
  categoryBreakdown: SummaryRiskMixItem[]
): ExecutiveSummaryDetails {
  const prioritizedRisks = getPrioritizedFindings(document.findings);

  return {
    overallPosition: getOverallPositionSentence(document),
    keyDrivers: buildExecutiveKeyDrivers(document, categoryBreakdown),
    businessImpact: buildExecutiveBusinessImpact(prioritizedRisks)
  };
}

function buildAiInsight(findings: NormalizedFinding[], categoryMix: Record<SafeRiskCategory, number>) {
  const topRisks = getTopCriticalRisks(findings, 2).map((finding) => buildTopCriticalRiskLabel(finding.riskTitle).toLowerCase());
  const highRiskSectionCount = getUniqueClauseCount(findings, "High");
  const mediumRiskSectionCount = getUniqueClauseCount(findings, "Medium");

  if (topRisks.length) {
    const concentrationBasis =
      highRiskSectionCount > 0
        ? `${highRiskSectionCount} high-risk section${highRiskSectionCount === 1 ? "" : "s"}`
        : mediumRiskSectionCount > 0
          ? `${mediumRiskSectionCount} medium-risk section${mediumRiskSectionCount === 1 ? "" : "s"}`
          : `${findings.length} flagged finding${findings.length === 1 ? "" : "s"}`;
    const riskLedSummary = `Primary exposure is concentrated in ${joinWithAnd(topRisks)} across ${concentrationBasis}.`;
    if (riskLedSummary.length <= 152) return riskLedSummary;
  }

  const categoryBreakdown = RISK_CATEGORIES.map((name) => ({ name, count: categoryMix[name] }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);

  if (!categoryBreakdown.length) return "Primary exposure drivers are not available for this document.";

  const categoryLabels = categoryBreakdown.slice(0, 2).map((item) => item.name.toLowerCase());
  const categorySummary =
    categoryLabels.length === 1
      ? `${capitalize(categoryLabels[0])} terms drive the current exposure`
      : `Primary exposure is concentrated in ${categoryLabels[0]} and ${categoryLabels[1]} terms`;
  const concentrationBasis = highRiskSectionCount > 0 ? `${highRiskSectionCount} high-risk sections` : `${findings.length} flagged findings`;

  return `${categorySummary}, with most material exposure concentrated in ${concentrationBasis}.`;
}

function getValidAiInsight(value: unknown) {
  const normalized = getUsableText(value).replace(/^ai insight:\s*/i, "");
  if (!normalized || normalized.length < 20) return "";
  if (hasGenericInsightText(normalized) || hasLegalAdviceWording(normalized)) return "";

  const firstSentence = extractFirstSentence(normalized);
  if (!firstSentence || firstSentence.length < 20) return "";

  return firstSentence.length > 240 ? "" : firstSentence;
}

function hasGenericInsightText(value: string) {
  const normalized = value.toLowerCase();
  return [
    "not available",
    "not enough information",
    "insufficient information",
    "cannot determine",
    "unable to determine",
    "no significant risks",
    "as an ai"
  ].some((phrase) => normalized.includes(phrase));
}

function hasLegalAdviceWording(value: string) {
  const normalized = value.toLowerCase();
  return [
    "legal advice",
    "consult an attorney",
    "consult a lawyer",
    "seek legal counsel",
    "qualified legal professional"
  ].some((phrase) => normalized.includes(phrase));
}

export function buildTopCriticalRiskLabel(value: unknown) {
  const normalized = getUsableText(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/[.!?]+$/, "");
  if (!normalized) return "Untitled risk";
  if (normalized.length <= 38) return normalized;

  const separators = [
    " because ",
    " due to ",
    " without ",
    " with ",
    " if ",
    " when ",
    " after ",
    " before ",
    " under ",
    " allowing ",
    " allow ",
    " permits ",
    " permit ",
    " requires ",
    " require ",
    ": ",
    "; ",
    ", "
  ];
  const normalizedLower = normalized.toLowerCase();
  for (const separator of separators) {
    const separatorIndex = normalizedLower.indexOf(separator);
    if (separatorIndex > 16) return normalized.slice(0, separatorIndex).trim();
  }

  const words = normalized.split(" ");
  if (words.length > 5) return trimTrailingConnectorWords(words.slice(0, 5)).join(" ");

  return normalized;
}

function buildPrimaryInsightLine(
  document: NormalizedDocumentAnalysis,
  categoryBreakdown: SummaryRiskMixItem[]
) {
  const riskDrivers = buildTopCriticalRiskItems(document)
    .slice(0, 2)
    .map((item) => item.label.toLowerCase());
  const highRiskSectionCount = getUniqueClauseCount(document.findings, "High");
  const mediumRiskSectionCount = getUniqueClauseCount(document.findings, "Medium");

  if (riskDrivers.length) {
    const concentrationBasis =
      highRiskSectionCount > 0
        ? `${highRiskSectionCount} high-risk section${highRiskSectionCount === 1 ? "" : "s"}`
        : mediumRiskSectionCount > 0
          ? `${mediumRiskSectionCount} medium-risk section${mediumRiskSectionCount === 1 ? "" : "s"}`
          : `${document.summary.totalRiskCount} flagged finding${document.summary.totalRiskCount === 1 ? "" : "s"}`;
    const riskLedSummary = `Primary exposure is concentrated in ${joinWithAnd(riskDrivers)} across ${concentrationBasis}.`;
    if (riskLedSummary.length <= 152) {
      return riskLedSummary;
    }
  }

  if (!categoryBreakdown.length) {
    return "Primary exposure drivers are not available for this document.";
  }

  const categoryLabels = categoryBreakdown.slice(0, 2).map((item) => item.name.toLowerCase());
  const categorySummary = buildCategoryDriverSummary(categoryLabels).replace(/[.!?]+$/, "");
  const concentrationBasis =
    highRiskSectionCount > 0 ? `${highRiskSectionCount} high-risk sections` : `${document.summary.totalRiskCount} flagged findings`;

  return `${categorySummary}, with most material exposure concentrated in ${concentrationBasis}.`;
}

function buildCategoryDriverSummary(categoryLabels: string[]) {
  if (categoryLabels.length === 1) {
    return `${capitalize(categoryLabels[0])} terms drive the current exposure`;
  }

  if (categoryLabels.length === 2) {
    return `Primary exposure is concentrated in ${categoryLabels[0]} and ${categoryLabels[1]} terms`;
  }

  return `${capitalize(categoryLabels[0])}, ${categoryLabels[1]}, and ${categoryLabels[2]} terms drive the current exposure`;
}

function buildRiskMixSummaryText(items: SummaryRiskMixItem[]) {
  const separator = " \u2022 ";
  return items.map((item) => `${item.name} ${item.count}`).join(separator);
}

function buildExecutiveKeyDrivers(
  document: NormalizedDocumentAnalysis,
  categoryBreakdown: SummaryRiskMixItem[]
) {
  const driverLabels = buildTopCriticalRiskItems(document)
    .slice(0, 2)
    .map((item) => item.label.toLowerCase());

  if (driverLabels.length) {
    return ensureSentence(`Primary drivers are ${joinWithAnd(driverLabels)}`);
  }

  return ensureSentence(buildPrimaryInsightLine(document, categoryBreakdown));
}

function buildExecutiveBusinessImpact(prioritizedRisks: NormalizedFinding[]) {
  const impactSentences = collectCompleteSummarySentences(
    prioritizedRisks.map((risk) => risk.businessImpact),
    2
  );

  if (impactSentences.length) {
    return impactSentences.join(" ");
  }

  return "Business impact details are not available.";
}

function collectCompleteSummarySentences(values: unknown[], maxCount: number) {
  const sentences: string[] = [];

  for (const value of uniqueStrings(values.map((item) => getUsableText(item)).filter(Boolean))) {
    const sentence = extractFirstSentence(value);
    if (!sentence || sentences.includes(sentence)) continue;

    sentences.push(sentence);
    if (sentences.length === maxCount) break;
  }

  return sentences;
}

function getOverallPositionSentence(document: NormalizedDocumentAnalysis) {
  const firstSentence = extractFirstSentence(document.executiveSummary);
  if (firstSentence) return firstSentence;

  const documentLabel = getUsableText(document.contractTitle) || getUsableText(document.documentName) || "This document";
  return `${documentLabel} currently presents a ${document.overallRiskLevel.toLowerCase()} risk profile based on the flagged findings.`;
}

function extractFirstSentence(value: unknown) {
  const normalized = getUsableText(value);
  const match = normalized.match(/^.*?[.!?](?=\s|$)/);

  if (match?.[0]) return match[0];
  if (!normalized) return "";

  return ensureSentence(normalized);
}

function ensureSentence(value: unknown) {
  const normalized = getUsableText(value).replace(/[.!?]+$/, "");
  if (!normalized) return "Unavailable.";

  return `${normalized}.`;
}

function buildFinalClauseSnippet(value: string) {
  const normalized = normalizeWhitespace(value);
  return normalized.length > 118 ? `${normalized.slice(0, 118).trimEnd()}...` : normalized;
}

function trimTrailingConnectorWords(words: string[]) {
  const trailingWords = new Set(["and", "or", "for", "with", "without", "to", "of", "the", "a", "an", "in", "on"]);
  const trimmedWords = [...words];

  while (trimmedWords.length > 2 && trailingWords.has(trimmedWords[trimmedWords.length - 1].toLowerCase())) {
    trimmedWords.pop();
  }

  return trimmedWords;
}

function joinWithAnd(values: string[]) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeDecisionToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function normalizeUserGapReviewDecision(value: unknown): FinalGapReviewDecision | null {
  const normalized = normalizeDecisionToken(value);
  if (normalized === "accepted" || normalized === "accept") return "Accepted";
  if (normalized === "rejected" || normalized === "reject") return "Rejected";
  if (normalized === "pending") return "Pending";
  return null;
}

function normalizeRawGapStatus(value: unknown): FinalGapReviewDecision {
  const normalized = normalizeDecisionToken(value);
  return normalized === "pending" ? "Pending" : "Pending";
}

function getUsableText(value: unknown) {
  return typeof value === "string" ? normalizeWhitespace(value) : "";
}

function getStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return uniqueStrings(value.map((item) => getUsableText(item)).filter(Boolean));
}

function normalizeOutputGapAnalysis(gaps: GapAnalysisItem[] | undefined): GapAnalysisItem[] {
  return (gaps ?? []).map((gap) => ({
    ...gap,
    aiConfidence: normalizeOutputConfidence(gap.aiConfidence)
  }));
}

function normalizeOutputConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.75;
  if (value < 0) return 0;
  if (value > 100) return 1;
  return Number((value > 1 ? value / 100 : value).toFixed(2));
}

function getUsableMultilineText(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => normalizeWhitespace(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getRiskClauseVariants(value: unknown): RiskClauseVariants {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return (["balanced", "protective", "standard"] as const).reduce<RiskClauseVariants>((variants, key) => {
    const variant = getUsableMultilineText((value as Record<RiskClauseVariantKey, unknown>)[key]);
    if (variant) {
      variants[key] = variant;
    }
    return variants;
  }, {});
}

function buildShortClauseExcerpt(value: string, maxLength = 140) {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return "";
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trimEnd()}...` : normalized;
}

function getConfidenceSortValue(confidence: unknown) {
  return getSafeConfidenceValue(confidence) ?? -1;
}

function getEvidenceAvailabilityScore(finding: NormalizedFinding) {
  let score = 0;
  if ((finding.sourceClauseIds ?? []).length > 0) score += 4;
  if (finding.evidence) score += 3;
  if (getUsableText(finding.fullClauseText)) score += 2;
  if (getUsableText(finding.clauseSnippet) || getUsableText(finding.flaggedText)) score += 1;
  return score;
}

function getFindingExplanationScore(finding: NormalizedFinding) {
  let score = 0;
  if (getUsableText(finding.businessImpact)) score += 2;
  if (getUsableText(finding.whyItMatters)) score += 1;
  return score;
}

function isRiskCategory(value: unknown): value is RiskCategory {
  return typeof value === "string" && RISK_CATEGORIES.includes(value as RiskCategory);
}

function isSeverity(value: unknown): value is Severity {
  return typeof value === "string" && value in severityRank;
}

function capitalize(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
