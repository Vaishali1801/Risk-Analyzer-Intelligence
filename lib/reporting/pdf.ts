"use client";

import jsPDF from "jspdf";
import { getReportDocumentName, getReportFileName, getSourceLabel } from "@/lib/reporting/metadata";
import type { ReportModel } from "@/lib/output-model";
import type { AnalysisSource } from "@/types/contract";
import type { ContractAnalysis } from "@/types/contract";

function writeWrapped(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 6) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

type ReportExportSource = Pick<AnalysisSource, "documentName" | "sourceKind">;
type PdfRiskDetail = {
  title: string;
  severity: string;
  category: string;
  clauseRef: string;
  highlightedText: string;
  whyRisky: string;
  suggestedImprovement: string;
};

export function downloadReportPdf(reportModel: ReportModel): void;
export function downloadReportPdf(analysis: ContractAnalysis, source?: ReportExportSource): void;
export function downloadReportPdf(input: ReportModel | ContractAnalysis, source?: ReportExportSource) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const width = 180;
  let reportModel: ReportModel | null = null;
  let documentName: string;
  let sourceLabel: string;
  let recommendation: string;
  let overallRiskLevel: string;
  let executiveSummary: string;
  let topCriticalRisks: string[];
  let nextActions: string[];
  let riskDetails: PdfRiskDetail[];

  if (isReportModel(input)) {
    reportModel = input;
    documentName = input.document.documentName;
    sourceLabel = getSourceLabel(input.document.sourceType);
    recommendation = input.overallDecision;
    overallRiskLevel = input.document.overallRiskLevel;
    executiveSummary = input.document.executiveSummary;
    topCriticalRisks = input.document.topCriticalRiskIds
      .map((riskId) => input.document.findings.find((finding) => finding.riskId === riskId)?.riskTitle)
      .filter((riskTitle): riskTitle is string => Boolean(riskTitle));
    nextActions = input.document.nextActions;
    riskDetails = input.document.findings.map((finding) => ({
      title: finding.riskTitle,
      severity: finding.severity,
      category: finding.category,
      clauseRef: finding.sectionRef,
      highlightedText: finding.clauseSnippet,
      whyRisky: finding.whyItMatters,
      suggestedImprovement: finding.originalRecommendedDraft
    }));
  } else {
    documentName = getReportDocumentName(source?.documentName ?? input.contractTitle);
    sourceLabel = getSourceLabel(source?.sourceKind);
    recommendation = input.decisionRecommendation;
    overallRiskLevel = input.overallRiskLevel;
    executiveSummary = input.executiveSummary;
    topCriticalRisks = input.topCriticalRisks;
    nextActions = input.nextActions;
    riskDetails = input.risks.map((risk) => ({
      title: risk.title,
      severity: risk.severity,
      category: risk.category,
      clauseRef: risk.clauseRef,
      highlightedText: risk.highlightedText,
      whyRisky: risk.whyRisky,
      suggestedImprovement: risk.suggestedImprovement
    }));
  }
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Risk Analysis Results", margin, y);
  y += 6;

  doc.setFontSize(18);
  y = writeWrapped(doc, documentName, margin, y, width, 8);
  y += 2;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Source: ${sourceLabel}`, margin, y);
  y += 7;
  doc.text(`Recommendation: ${recommendation} | Overall Risk: ${overallRiskLevel}`, margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  y = writeWrapped(doc, executiveSummary, margin, y, width);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Top Critical Risks", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  topCriticalRisks.forEach((risk) => {
    y = writeWrapped(doc, `- ${risk}`, margin, y, width);
  });
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Recommended Next Actions", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  nextActions.forEach((action) => {
    y = writeWrapped(doc, `- ${action}`, margin, y, width);
  });

  riskDetails.forEach((risk, index) => {
    if (y > 250) {
      doc.addPage();
      y = 18;
    }

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}. ${risk.title} (${risk.severity} / ${risk.category})`, margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    y = writeWrapped(doc, `Clause: ${risk.clauseRef} - ${risk.highlightedText}`, margin, y, width);
    y = writeWrapped(doc, `Why risky: ${risk.whyRisky}`, margin, y + 2, width);
    y = writeWrapped(doc, `Suggested improvement: ${risk.suggestedImprovement}`, margin, y + 2, width);
  });

  if (reportModel) {
    if (y > 236) {
      doc.addPage();
      y = 18;
    }

    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Review Decisions", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    reportModel.finalReviewRows.forEach((row, index) => {
      if (y > 250) {
        doc.addPage();
        y = 18;
      }

      y = writeWrapped(
        doc,
        `${index + 1}. ${row.finding.riskTitle} (${row.decision}) - ${row.finalClause}`,
        margin,
        y,
        width
      );
      if (row.decision === "Revised" && row.revisedClause) {
        y = writeWrapped(doc, `Saved recommendation: ${row.revisedClause}`, margin, y + 2, width);
      }
    });
  }

  doc.save(getReportFileName(documentName));
}

function isReportModel(value: ReportModel | ContractAnalysis): value is ReportModel {
  return "document" in value && "reviewByRiskId" in value && "finalReviewRows" in value;
}
