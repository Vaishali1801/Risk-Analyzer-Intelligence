"use client";

import jsPDF from "jspdf";
import type { ContractAnalysis } from "@/types/contract";

function writeWrapped(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight = 6) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export function downloadReportPdf(analysis: ContractAnalysis) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 16;
  const width = 180;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Contract Risk Analyzer Report", margin, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Contract: ${analysis.contractTitle}`, margin, y);
  y += 7;
  doc.text(`Recommendation: ${analysis.decisionRecommendation} | Overall Risk: ${analysis.overallRiskLevel}`, margin, y);
  y += 10;

  doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  y = writeWrapped(doc, analysis.executiveSummary, margin, y, width);
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.text("Top Critical Risks", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  analysis.topCriticalRisks.forEach((risk) => {
    y = writeWrapped(doc, `- ${risk}`, margin, y, width);
  });
  y += 4;

  doc.setFont("helvetica", "bold");
  doc.text("Recommended Next Actions", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  analysis.nextActions.forEach((action) => {
    y = writeWrapped(doc, `- ${action}`, margin, y, width);
  });

  analysis.risks.forEach((risk, index) => {
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

  doc.save(`${analysis.contractTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-risk-report.pdf`);
}
