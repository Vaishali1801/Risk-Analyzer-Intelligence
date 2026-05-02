import type { FinalReviewDecision, FinalReviewRow, NormalizedFinding, ReportModel } from "@/lib/output-model";
import type { AnalysisSource } from "@/types/contract";

export type PdfSeverity = "High" | "Medium" | "Low" | null;
export type PdfDecision = FinalReviewDecision | "\u2014";

export type PdfReportModel = {
  metadata: PdfMetadata;
  dashboard: PdfDashboard;
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

export type PdfFinalReview = {
  decision: string;
  counts: {
    revised: number;
    accepted: number;
    pending: number;
  };
  rows: Array<{
    number: number;
    riskTitle: string;
    decision: PdfDecision;
    finalOutcome: string;
  }>;
};

export type PdfFooter = {
  left: "Confidential";
  center: "For internal review and decision support";
};

export function buildPdfReportModel(reportModel: ReportModel): PdfReportModel {
  const document = reportModel.document;
  const finalReviewRowsByRiskId = new Map(reportModel.finalReviewRows.map((row) => [row.finding.riskId, row]));
  const totalRisks = document.findings.length;
  const counts = getPdfFinalReviewCounts(reportModel.finalReviewRows);

  return {
    metadata: {
      documentTitle: getTextOrFallback(document.documentName, "Risk Review Report"),
      sourceLabel: formatSourceLabel(document.sourceType),
      createdDateLabel: "Not available",
      receivedDateLabel: formatDateLabel(document.receivedForReviewDate),
      generatedDateLabel: formatDateLabel(document.analysisGeneratedAt)
    },
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
      statusMessage: getPdfStatusMessage(counts, totalRisks)
    },
    summaryRisks: document.findings.map((finding, index) => {
      const reviewRow = finalReviewRowsByRiskId.get(finding.riskId);
      return buildPdfSummaryRisk(finding, reviewRow, index);
    }),
    detailedRisks: document.findings.map((finding, index) => {
      const reviewRow = finalReviewRowsByRiskId.get(finding.riskId);
      return buildPdfDetailedRisk(finding, reviewRow, index);
    }),
    finalReview: {
      decision: getTextOrFallback(reportModel.overallDecision, "Hold for Review"),
      counts: {
        revised: counts.Revised,
        accepted: counts.Accepted,
        pending: counts.Pending
      },
      rows: reportModel.finalReviewRows.map((row, index) => ({
        number: index + 1,
        riskTitle: getTextOrFallback(row.finding.riskTitle, "Untitled risk"),
        decision: getPdfDecision(row),
        finalOutcome: getPdfFinalOutcome(row)
      }))
    },
    footer: {
      left: "Confidential",
      center: "For internal review and decision support"
    }
  };
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

function getPdfFinalReviewCounts(rows: FinalReviewRow[]) {
  return rows.reduce<Record<FinalReviewDecision, number>>(
    (counts, row) => {
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

function getPdfFinalOutcome(row: FinalReviewRow) {
  const decision = getPdfDecision(row);

  if (decision === "Revised") return getFinalClauseText(row) ?? getNullableText(row.finalClause) ?? "\u2014";

  return getNullableText(row.finalClause) ?? "\u2014";
}

function getFinalClauseText(row: FinalReviewRow | undefined) {
  if (!row) return null;
  return getFirstNullableText([row.revisedClause, row.finalClause]);
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
