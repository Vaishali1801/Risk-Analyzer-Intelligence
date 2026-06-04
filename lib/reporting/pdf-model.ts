import type { FinalReviewDecision, FinalReviewRow, NormalizedFinding, ReportModel } from "@/lib/output-model";
import type { AnalysisSource } from "@/types/contract";

export type PdfSeverity = "High" | "Medium" | "Low" | null;
export type PdfDecision = FinalReviewDecision | "\u2014";
export type PdfGapDecision = "Pending" | "Accepted" | "Rejected";
export type PdfGapReviewDecisionInput = "accepted" | "rejected" | PdfGapDecision;
export type PdfGapReviewById = Record<string, PdfGapReviewDecisionInput | undefined>;

export type PdfReportModel = {
  metadata: PdfMetadata;
  dashboard: PdfDashboard;
  detailedGaps: PdfDetailedGap[];
  summaryRisks: PdfSummaryRisk[];
  detailedRisks: PdfDetailedRisk[];
  finalReview: PdfFinalReview;
  footer: PdfFooter;
};

export type PdfMetadata = {
  documentTitle: string;
  sourceLabel: string;
  createdDateLabel: string;
  receivedDateLabel: string;
  generatedDateLabel: string;
};

export type PdfDashboard = {
  overallDecision: string;
  overallRisk: string | null;
  totalRisks: number;
  criticalRisks: number;
  severityMix: {
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  insight: string | null;
  executiveSummary: string | null;
  topActions: string[];
  statusMessage: string;
  gapSummary: {
    mustAdd: number;
    negotiate: number;
    optional: number;
    total: number;
  };
};

export type PdfSummaryRisk = {
  number: number;
  title: string;
  category: string;
  severity: PdfSeverity;
  severityLabel: string;
  confidenceLabel: string;
  status: PdfDecision;
  issue: string | null;
  impact: string | null;
  action: string | null;
};

export type PdfDetailedRisk = {
  number: number;
  title: string;
  sectionLabel: string;
  category: string;
  severity: PdfSeverity;
  severityLabel: string;
  confidenceLabel: string;
  clauseExtract: string | null;
  riskExplanation: string | null;
  recommendedClause: string | null;
};

export type PdfDetailedGap = {
  number: number;
  title: string;
  impact: PdfSeverity;
  impactLabel: string;
  action: "Must Add" | "Negotiate" | "Optional";
  category: string;
  confidenceLabel: string;
  whyThisMatters: string | null;
  suggestedFix: string | null;
  recommendedClause: string | null;
};

export type PdfFinalReview = {
  decision: string;
  counts: {
    revised: number;
    accepted: number;
    pending: number;
  };
  gapCounts: Record<PdfGapDecision, number>;
  gapRows: PdfFinalReviewGapRow[];
  rows: Array<{
    number: number;
    riskTitle: string;
    decision: PdfDecision;
    finalOutcome: string;
  }>;
};

export type PdfFinalReviewGapRow = {
  number: number;
  gapTitle: string;
  decision: PdfGapDecision;
  finalRecommendedClause: string;
};

export type PdfFooter = {
  left: "Confidential";
  center: "For internal review and decision support";
};

const DEFAULT_FINAL_OUTCOME_BY_DECISION: Record<"Accepted" | "Pending", string> = {
  Accepted: "Original retained",
  Pending: "Awaiting decision"
};

export function buildPdfReportModel(reportModel: ReportModel, gapReviewById: PdfGapReviewById = {}): PdfReportModel {
  const document = reportModel.document;
  const finalReviewRowsByRiskId = new Map(reportModel.finalReviewRows.map((row) => [row.finding.riskId, row]));
  const totalRisks = document.findings.length;
  const counts = getPdfFinalReviewCounts(document.findings, finalReviewRowsByRiskId);
  const gapRows = buildPdfFinalReviewGapRows(reportModel, gapReviewById);
  const gapCounts = getPdfFinalReviewGapCounts(gapRows);
  const finalReviewDecision = getPdfFinalReviewDecision(reportModel, gapCounts);

  return {
    metadata: buildPdfMetadata(reportModel),
    dashboard: {
      overallDecision: getTextOrFallback(reportModel.overallDecision, "Hold for Review"),
      overallRisk: getPdfSeverity(document.overallRiskLevel),
      totalRisks,
      criticalRisks: document.summary.severityMix.High,
      severityMix: {
        high: document.summary.severityMix.High,
        medium: document.summary.severityMix.Medium,
        low: document.summary.severityMix.Low
      },
      categoryBreakdown: getPdfCategoryBreakdown(reportModel),
      insight: getNullableText(document.aiInsight),
      executiveSummary: getNullableText(document.executiveSummary),
      topActions: document.nextActions.map((action) => getNullableText(action)).filter((action): action is string => Boolean(action)),
      statusMessage: getPdfStatusMessage(counts, totalRisks),
      gapSummary: getPdfGapSummary(reportModel)
    },
    detailedGaps: document.gapAnalysis.map((gap, index) => ({
      number: index + 1,
      title: getTextOrFallback(gap.clauseName, "Untitled gap"),
      impact: getPdfSeverity(gap.impact),
      impactLabel: getPdfSeverity(gap.impact) ?? "\u2014",
      action: gap.action,
      category: getTextOrFallback(gap.category, "Uncategorized"),
      confidenceLabel: formatConfidenceLabel(gap.aiConfidence),
      whyThisMatters: getNullableText(gap.whyThisMatters),
      suggestedFix: getNullableText(gap.suggestedFix),
      recommendedClause: getNullableMultilineText(gap.recommendedClause)
    })),
    summaryRisks: document.findings.map((finding, index) => {
      const reviewRow = finalReviewRowsByRiskId.get(finding.riskId);
      return buildPdfSummaryRisk(finding, reviewRow, index);
    }),
    detailedRisks: document.findings.map((finding, index) => {
      const reviewRow = finalReviewRowsByRiskId.get(finding.riskId);
      return buildPdfDetailedRisk(finding, reviewRow, index);
    }),
    finalReview: {
      decision: finalReviewDecision,
      counts: {
        revised: counts.Revised,
        accepted: counts.Accepted,
        pending: counts.Pending
      },
      gapCounts,
      gapRows,
      rows: document.findings.map((finding, index) => {
        const row = finalReviewRowsByRiskId.get(finding.riskId);

        return {
          number: index + 1,
          riskTitle: getTextOrFallback(finding.riskTitle, "Untitled risk"),
          decision: getPdfDecision(row),
          finalOutcome: getPdfFinalOutcome(row)
        };
      })
    },
    footer: {
      left: "Confidential",
      center: "For internal review and decision support"
    }
  };
}

function getPdfFinalReviewDecision(reportModel: ReportModel, gapCounts: Record<PdfGapDecision, number>) {
  if (gapCounts.Pending > 0) return "Hold for Review";
  return getTextOrFallback(reportModel.overallDecision, "Hold for Review");
}

function buildPdfMetadata(reportModel: ReportModel): PdfMetadata {
  const document = reportModel.document;
  const isDemoReport = document.sourceType === "demo";

  return {
    documentTitle: getTextOrFallback(document.documentName, "Risk Review Report"),
    sourceLabel: formatSourceLabel(document.sourceType),
    createdDateLabel: isDemoReport ? formatRelativeDateLabel(-2) : "Not available",
    receivedDateLabel: isDemoReport ? formatRelativeDateLabel(-1) : formatDateLabel(document.receivedForReviewDate),
    generatedDateLabel: isDemoReport ? formatRelativeDateLabel(0) : formatDateLabel(document.analysisGeneratedAt)
  };
}

function buildPdfFinalReviewGapRows(reportModel: ReportModel, gapReviewById: PdfGapReviewById): PdfFinalReviewGapRow[] {
  return reportModel.document.gapAnalysis.map((gap, index) => ({
    number: index + 1,
    gapTitle: getTextOrFallback(gap.clauseName, "Untitled gap"),
    decision: getPdfGapDecision(gapReviewById[gap.id], gap.status),
    finalRecommendedClause: getTextOrFallback(gap.recommendedClause, "\u2014")
  }));
}

function getPdfFinalReviewGapCounts(rows: PdfFinalReviewGapRow[]) {
  return rows.reduce<Record<PdfGapDecision, number>>(
    (counts, row) => {
      counts[row.decision] += 1;
      return counts;
    },
    { Accepted: 0, Rejected: 0, Pending: 0 }
  );
}

function getPdfGapDecision(reviewDecision: unknown, normalizedStatus: unknown): PdfGapDecision {
  const reviewDecisionValue = normalizeGapDecision(reviewDecision);
  if (reviewDecisionValue) return reviewDecisionValue;

  return normalizeGapDecision(normalizedStatus) ?? "Pending";
}

function normalizeGapDecision(value: unknown): PdfGapDecision | null {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");

  if (normalized === "accepted" || normalized === "accept") return "Accepted";
  if (normalized === "rejected" || normalized === "reject") return "Rejected";
  if (normalized === "pending") return "Pending";
  return null;
}

function buildPdfSummaryRisk(finding: NormalizedFinding, reviewRow: FinalReviewRow | undefined, index: number): PdfSummaryRisk {
  const severity = getPdfSeverity(finding.severity);
  const decision = getPdfDecision(reviewRow);

  return {
    number: index + 1,
    title: getTextOrFallback(finding.riskTitle, "Untitled risk"),
    category: getTextOrFallback(finding.category, "Uncategorized"),
    severity,
    severityLabel: severity ?? "\u2014",
    confidenceLabel: formatConfidenceLabel(finding.confidence),
    status: decision,
    issue: getFirstNullableText([finding.clauseSnippet, finding.flaggedText, finding.whyItMatters]),
    impact: getNullableText(finding.businessImpact),
    action: getPdfRiskAction(finding, reviewRow)
  };
}

function buildPdfDetailedRisk(finding: NormalizedFinding, reviewRow: FinalReviewRow | undefined, index: number): PdfDetailedRisk {
  const severity = getPdfSeverity(finding.severity);

  return {
    number: index + 1,
    title: getTextOrFallback(finding.riskTitle, "Untitled risk"),
    sectionLabel: getTextOrFallback(finding.sectionRef, "Not available"),
    category: getTextOrFallback(finding.category, "Uncategorized"),
    severity,
    severityLabel: severity ?? "\u2014",
    confidenceLabel: formatConfidenceLabel(finding.confidence),
    clauseExtract: getFirstNullableText([finding.fullClauseText, finding.clauseSnippet, finding.flaggedText]),
    riskExplanation: getRiskExplanation(finding),
    recommendedClause: getPdfRecommendedClause(finding, reviewRow)
  };
}

function getPdfFinalReviewCounts(findings: NormalizedFinding[], rowsByRiskId: Map<string, FinalReviewRow>) {
  return findings.reduce<Record<FinalReviewDecision, number>>(
    (counts, finding) => {
      const row = rowsByRiskId.get(finding.riskId);
      const decision = getPdfDecision(row);
      if (decision !== "\u2014") {
        counts[decision] += 1;
      }
      return counts;
    },
    { Revised: 0, Accepted: 0, Pending: 0 }
  );
}

function getPdfCategoryBreakdown(reportModel: ReportModel) {
  const totalRisks = reportModel.document.findings.length;
  return Object.entries(reportModel.document.summary.categoryMix)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalRisks > 0 ? (count / totalRisks) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
}

function getPdfGapSummary(reportModel: ReportModel): PdfDashboard["gapSummary"] {
  return reportModel.document.gapAnalysis.reduce<PdfDashboard["gapSummary"]>(
    (summary, gap) => {
      if (gap.action === "Must Add") summary.mustAdd += 1;
      if (gap.action === "Negotiate") summary.negotiate += 1;
      if (gap.action === "Optional") summary.optional += 1;
      summary.total += 1;
      return summary;
    },
    { mustAdd: 0, negotiate: 0, optional: 0, total: 0 }
  );
}

function getPdfStatusMessage(counts: Record<FinalReviewDecision, number>, totalRisks: number) {
  if (totalRisks <= 0) return "No risks available for final review.";
  if (counts.Pending > 0) return "Pending decisions remain. Complete review before finalization.";
  if (counts.Revised > 0) return "Approved revisions are ready for implementation.";
  if (counts.Accepted === totalRisks) return "All risks accepted. Ready for finalization.";
  return "Final review status is not available.";
}

function getPdfRiskAction(finding: NormalizedFinding, row: FinalReviewRow | undefined) {
  const decision = getPdfDecision(row);
  if (decision === "Accepted") return getNullableText(row?.finalClause);
  if (decision === "Revised") return getFinalClauseText(row);
  if (decision === "\u2014") return null;
  return getNullableText(finding.originalRecommendedDraft);
}

function getPdfRecommendedClause(finding: NormalizedFinding, row: FinalReviewRow | undefined) {
  const decision = getPdfDecision(row);
  if (decision === "Accepted") return getNullableText(row?.finalClause);
  if (decision === "Revised") return getFinalClauseText(row);
  if (decision === "\u2014") return null;
  return getNullableText(finding.originalRecommendedDraft);
}

function getRiskExplanation(finding: NormalizedFinding) {
  const parts = [finding.whyItMatters, finding.businessImpact].map((value) => getNullableText(value)).filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

function getPdfFinalOutcome(row: FinalReviewRow | undefined) {
  const decision = getPdfDecision(row);

  if (decision === "Revised") return getFinalClauseText(row) ?? getNullableText(row?.finalClause) ?? "\u2014";
  if (decision === "Accepted" || decision === "Pending") return getFinalOutcomeText(row, decision) ?? "\u2014";

  return "\u2014";
}

function getFinalClauseText(row: FinalReviewRow | undefined) {
  if (!row) return null;
  return getFirstNullableText([row.revisedClause, row.finalClause]);
}

function getFinalOutcomeText(row: FinalReviewRow | undefined, decision: "Accepted" | "Pending") {
  return getNullableText(row?.finalClause) ?? DEFAULT_FINAL_OUTCOME_BY_DECISION[decision];
}

function getPdfDecision(row: FinalReviewRow | undefined): PdfDecision {
  if (!row) return "Pending";
  if (row?.decision === "Revised" || row?.decision === "Accepted" || row?.decision === "Pending") return row.decision;
  return "\u2014";
}

function getPdfSeverity(value: unknown): PdfSeverity {
  if (value === "High" || value === "Medium" || value === "Low") return value;
  return null;
}

function formatSourceLabel(sourceType: AnalysisSource["sourceKind"]) {
  if (sourceType === "upload") return "Upload";
  if (sourceType === "paste") return "Paste";
  if (sourceType === "demo") return "Demo";
  return "Not available";
}

function formatDateLabel(value: unknown) {
  const normalized = getNullableText(value);
  if (!normalized) return "Not available";

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

function formatRelativeDateLabel(dayOffset: number) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return formatDateLabel(date.toISOString());
}

function formatConfidenceLabel(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "Not available";
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}%`;
}

function getFirstNullableText(values: unknown[]) {
  for (const value of values) {
    const text = getNullableText(value);
    if (text) return text;
  }
  return null;
}

function getTextOrFallback(value: unknown, fallback: string) {
  return getNullableText(value) ?? fallback;
}

function getNullableText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized || null;
}

function getNullableMultilineText(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized || null;
}
