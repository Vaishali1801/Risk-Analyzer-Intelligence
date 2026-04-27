import { RISK_CATEGORIES, severityRank } from "@/constants/risk";
import { getReportDocumentName } from "@/lib/reporting/metadata";
import type { AnalysisSource, ContractAnalysis, DecisionRecommendation, RiskCategory, Severity } from "@/types/contract";

export type ReviewStatus = "pending" | "needs_change" | "accepted";
export type FinalReviewDecision = "Revised" | "Accepted" | "Pending";
export type FinalOverallDecision = "Hold for Review" | "Reject" | "Approve with Changes" | "Approve";

export type NormalizedFinding = {
  riskId: string;
  riskTitle: string;
  sectionRef: string;
  category: RiskCategory;
  severity: Severity;
  confidence: number;
  clauseSnippet: string;
  fullClauseText: string;
  flaggedText: string;
  whyItMatters: string;
  businessImpact: string;
  originalRecommendedDraft: string;
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
  executiveSummary: string;
  aiInsight: string;
  overallRiskLevel: Severity;
  overallDecision: DecisionRecommendation;
  findings: NormalizedFinding[];
  topCriticalRiskIds: string[];
  summary: {
    totalRiskCount: number;
    severityMix: Record<Severity, number>;
    categoryMix: Record<RiskCategory, number>;
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

export type ReportModel = {
  document: NormalizedDocumentAnalysis;
  reviewByRiskId: ReviewByRiskId;
  reviewStatusCounts: ReviewStatusCounts;
  finalReviewRows: FinalReviewRow[];
  finalReviewCounts: FinalReviewCounts;
  overallDecision: FinalOverallDecision;
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
    riskTitle: risk.title,
    sectionRef: risk.clauseRef,
    category: risk.category,
    severity: risk.severity,
    confidence: risk.confidence,
    clauseSnippet: risk.highlightedText,
    fullClauseText: risk.clauseText,
    flaggedText: risk.highlightedText,
    whyItMatters: risk.whyRisky,
    businessImpact: risk.impactIfIgnored,
    originalRecommendedDraft: risk.suggestedImprovement
  }));
  const summary = {
    totalRiskCount: getTotalRiskCount(findings),
    severityMix: getSeverityMix(findings),
    categoryMix: getCategoryMix(findings)
  };
  const topCriticalRisks = getTopCriticalRisks(findings);

  return {
    documentName: getReportDocumentName(source.documentName),
    contractTitle: analysis.contractTitle,
    sourceType: source.sourceKind,
    analysisGeneratedAt: savedAt,
    executiveSummary: analysis.executiveSummary,
    aiInsight: buildAiInsight(findings, summary.categoryMix),
    overallRiskLevel: analysis.overallRiskLevel,
    overallDecision: analysis.decisionRecommendation,
    findings,
    topCriticalRiskIds: topCriticalRisks.map((finding) => finding.riskId),
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

export function getTotalRiskCount(findings: NormalizedFinding[]) {
  return findings.length;
}

export function getSeverityMix(findings: NormalizedFinding[]): Record<Severity, number> {
  return findings.reduce<Record<Severity, number>>(
    (mix, finding) => {
      mix[finding.severity] += 1;
      return mix;
    },
    { High: 0, Medium: 0, Low: 0 }
  );
}

export function getCategoryMix(findings: NormalizedFinding[]): Record<RiskCategory, number> {
  return findings.reduce<Record<RiskCategory, number>>(
    (mix, finding) => {
      mix[finding.category] += 1;
      return mix;
    },
    {
      Legal: 0,
      Financial: 0,
      Operational: 0,
      Compliance: 0,
      Technical: 0
    }
  );
}

export function getTopCriticalRisks(findings: NormalizedFinding[], limit = 4) {
  return [...findings]
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence)
    .slice(0, limit);
}

export function getReviewStatusCounts(reviewByRiskId: ReviewByRiskId): ReviewStatusCounts {
  return Object.values(reviewByRiskId).reduce<ReviewStatusCounts>(
    (counts, review) => {
      counts[review.status] += 1;
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
    const savedClause = normalizeWhitespace(review.savedRecommendation ?? "");
    const originalClause = normalizeWhitespace(finding.fullClauseText || finding.flaggedText);

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

export function getFinalReviewCounts(rows: FinalReviewRow[]): FinalReviewCounts {
  return rows.reduce<FinalReviewCounts>(
    (counts, row) => {
      counts[row.decision] += 1;
      return counts;
    },
    { Revised: 0, Accepted: 0, Pending: 0 }
  );
}

export function getOverallDecision(
  document: Pick<NormalizedDocumentAnalysis, "overallDecision">,
  finalReviewCounts: FinalReviewCounts
): FinalOverallDecision {
  if (finalReviewCounts.Pending > 0) return "Hold for Review";
  if (document.overallDecision === "Reject") return "Reject";
  if (finalReviewCounts.Revised > 0 || document.overallDecision === "Renegotiate") return "Approve with Changes";
  return "Approve";
}

export function canFinalizeReview(reviewByRiskId: ReviewByRiskId) {
  return getReviewStatusCounts(reviewByRiskId).pending === 0;
}

export function getReportModel(
  document: NormalizedDocumentAnalysis,
  reviewByRiskId: ReviewByRiskId
): ReportModel {
  const finalReviewRows = getFinalReviewRows(document.findings, reviewByRiskId);
  const finalReviewCounts = getFinalReviewCounts(finalReviewRows);

  return {
    document,
    reviewByRiskId,
    reviewStatusCounts: getReviewStatusCounts(reviewByRiskId),
    finalReviewRows,
    finalReviewCounts,
    overallDecision: getOverallDecision(document, finalReviewCounts),
    canFinalize: canFinalizeReview(reviewByRiskId)
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

function buildAiInsight(findings: NormalizedFinding[], categoryMix: Record<RiskCategory, number>) {
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

export function buildTopCriticalRiskLabel(value: string) {
  const normalized = normalizeWhitespace(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/[.!?]+$/, "");
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

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function capitalize(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
