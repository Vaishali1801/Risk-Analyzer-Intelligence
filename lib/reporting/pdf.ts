"use client";

import jsPDF from "jspdf";
import { getReportFileName } from "@/lib/reporting/metadata";
import type { FinalReviewRow, NormalizedFinding, ReportModel } from "@/lib/output-model";
import type { AnalysisSource } from "@/types/contract";

const PAGE_TOP = 18;
const PAGE_BOTTOM = 276;
const PAGE_MARGIN = 16;
const PAGE_WIDTH = 180;
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const DASHBOARD_MARGIN = 10;
const DASHBOARD_WIDTH = A4_WIDTH - DASHBOARD_MARGIN * 2;
const FOOTER_HEIGHT = 13.5;
const FOOTER_TOP = A4_HEIGHT - FOOTER_HEIGHT;
const CARD_RADIUS = 1.8;
const BODY_LINE_HEIGHT = 5.2;
const TABLE_LINE_HEIGHT = 4.4;
const TABLE_CELL_VERTICAL_PADDING = 4;

const COLORS = {
  navy: "#071B3A",
  darkText: "#111827",
  mutedText: "#6B7280",
  lightBorder: "#E5E7EB",
  lightBackground: "#F8FAFC",
  lightBluePanel: "#EFF6FF",
  softAmber: "#FFFBEB",
  softBlueGrey: "#F8FAFC",
  highRed: "#DC2626",
  mediumAmber: "#F59E0B",
  lowGreen: "#16A34A",
  revisedBlue: "#2563EB",
  pendingAmber: "#F59E0B",
  white: "#FFFFFF",
  softRed: "#FEF2F2",
  softGreen: "#F0FDF4"
};

type PdfTableColumn = {
  label: string;
  width: number;
};

export function downloadReportPdf(reportModel: ReportModel) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const document = reportModel.document;
  drawExecutiveDashboardPage(doc, reportModel);

  doc.addPage();
  let y = PAGE_TOP;

  y = writeRiskRegister(doc, y, reportModel.finalReviewRows);
  y = writeDetailedRiskReviews(doc, y, reportModel.finalReviewRows);
  y = writeFinalReviewTable(doc, y, reportModel.finalReviewRows);
  y = writeNextActions(doc, y, document.nextActions);

  drawFooters(doc);
  doc.save(getReportFileName(document.documentName));
}

function drawExecutiveDashboardPage(doc: jsPDF, reportModel: ReportModel) {
  const document = reportModel.document;
  const dashboard = getDashboardData(reportModel);

  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");

  drawHeader(doc, 0, 0, A4_WIDTH, 18);

  let y = 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19.5);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  const titleLines = clampTextLines(doc, safeText(document.documentName) || "Risk Review Report", DASHBOARD_WIDTH, 2);
  titleLines.forEach((line) => {
    doc.text(line, DASHBOARD_MARGIN, y);
    y += 7.5;
  });

  drawDivider(doc, DASHBOARD_MARGIN, y - 1.8, DASHBOARD_WIDTH);

  const metadataY = y + 2.2;
  const metadataItems = [
    { label: "Source", value: dashboard.sourceType },
    { label: "Created", value: dashboard.documentCreated },
    { label: "Received", value: dashboard.receivedByRiskTeam },
    { label: "Generated", value: dashboard.reportGenerated }
  ];
  drawMetadataStrip(doc, DASHBOARD_MARGIN, metadataY, DASHBOARD_WIDTH, 12, metadataItems);

  y = metadataY + 18;

  drawSectionTitle(doc, "DECISION SNAPSHOT", DASHBOARD_MARGIN, y);
  y += 5.2;
  const kpiGap = 4;
  const kpiWidth = (DASHBOARD_WIDTH - kpiGap * 3) / 4;
  const kpiCards = [
    { label: "Overall Decision", value: reportModel.overallDecision, color: getDecisionColor(reportModel.overallDecision), fill: COLORS.softAmber },
    { label: "Overall Risk", value: document.overallRiskLevel, color: getSeverityColor(document.overallRiskLevel), fill: COLORS.softRed },
    { label: "Total Risks", value: String(dashboard.totalRisks), color: COLORS.navy, fill: COLORS.softBlueGrey },
    { label: "Critical Risks", value: String(dashboard.criticalRisks), color: COLORS.highRed, fill: COLORS.softRed }
  ];
  kpiCards.forEach((item, index) => {
    drawKpiCard(doc, DASHBOARD_MARGIN + index * (kpiWidth + kpiGap), y, kpiWidth, 21, item.label, item.value, item.color, item.fill);
  });

  y += 26.5;
  const rowGap = 5;
  const leftWidth = 86;
  const rightWidth = DASHBOARD_WIDTH - leftWidth - rowGap;
  drawSeverityMixCard(doc, DASHBOARD_MARGIN, y, leftWidth, 45, dashboard);
  drawCategoryBreakdown(doc, DASHBOARD_MARGIN + leftWidth + rowGap, y, rightWidth, 45, dashboard.categoryBreakdown, dashboard.totalRisks);

  y += 49.5;
  drawInfoCard(
    doc,
    DASHBOARD_MARGIN,
    y,
    DASHBOARD_WIDTH,
    30,
    "INSIGHT",
    dashboard.aiInsight || "Key risk concentration identified from the analyzed document.",
    COLORS.lightBluePanel
  );
  y += 33;
  drawInfoCard(
    doc,
    DASHBOARD_MARGIN,
    y,
    DASHBOARD_WIDTH,
    38,
    "EXECUTIVE SUMMARY",
    dashboard.executiveSummary || "Executive summary is not available.",
    COLORS.lightBluePanel
  );

  y += 46;
  drawDivider(doc, DASHBOARD_MARGIN, y - 4.5, DASHBOARD_WIDTH);
  drawSectionTitle(doc, "TOP ACTIONS / RECOMMENDED PRIORITIES", DASHBOARD_MARGIN, y);
  y += 5;
  const actionsHeight = drawTopActions(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, dashboard.topActions);

  y += actionsHeight + 9;
  drawDecisionWarningStrip(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, 12, dashboard.pendingDecisionCount);
}

type DashboardBreakdownItem = {
  label: string;
  count: number;
};

type DashboardData = {
  sourceType: string;
  documentCreated: string;
  receivedByRiskTeam: string;
  reportGenerated: string;
  totalRisks: number;
  criticalRisks: number;
  severityMix: Record<"High" | "Medium" | "Low", number>;
  categoryBreakdown: DashboardBreakdownItem[];
  pendingDecisionCount: number;
  aiInsight: string;
  executiveSummary: string;
  topActions: string[];
};

function getDashboardData(reportModel: ReportModel): DashboardData {
  const document = reportModel.document;
  const documentRecord = document as unknown as Record<string, unknown>;
  const reportGeneratedSource = getFirstString(documentRecord, ["reportGeneratedAt", "generatedAt", "analysisGeneratedAt", "savedAt"]);
  const totalRisks = document.findings.length;
  const severityMix = document.findings.reduce<Record<"High" | "Medium" | "Low", number>>(
    (mix, finding) => {
      if (finding.severity === "High" || finding.severity === "Medium" || finding.severity === "Low") {
        mix[finding.severity] += 1;
      }
      return mix;
    },
    { High: 0, Medium: 0, Low: 0 }
  );
  const categoryMap = document.findings.reduce<Record<string, number>>((mix, finding) => {
    const category = safeText(finding.category) || "Uncategorized";
    mix[category] = (mix[category] ?? 0) + 1;
    return mix;
  }, {});
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const pendingDecisionCount = reportModel.finalReviewRows.filter((row) => isPendingDecision(row)).length;

  return {
    sourceType: formatSourceTypeValue(getFirstString(documentRecord, ["sourceType", "source", "documentType"])),
    documentCreated: formatOptionalDate(getFirstString(documentRecord, ["documentDate", "createdAt", "uploadedAt"]), false),
    receivedByRiskTeam: formatOptionalDate(
      getFirstString(documentRecord, ["receivedDate", "intakeDate", "submittedAt", "uploadedAt", "receivedForReviewDate"]),
      false
    ),
    reportGenerated: reportGeneratedSource ? formatDate(reportGeneratedSource, true) || formatDate(new Date(), true) : formatDate(new Date(), true),
    totalRisks,
    criticalRisks: severityMix.High,
    severityMix,
    categoryBreakdown,
    pendingDecisionCount,
    aiInsight: safeText(document.aiInsight) || "Key risk concentration identified from the analyzed document.",
    executiveSummary: safeText(document.executiveSummary) || "Executive summary is not available.",
    topActions: getTopActions(reportModel)
  };
}

function getTopActions(reportModel: ReportModel) {
  const documentActions = reportModel.document.nextActions.map((action) => safeText(action)).filter(Boolean);
  if (documentActions.length) return documentActions.slice(0, 4);

  const derivedActions = [...reportModel.document.findings]
    .sort((a, b) => getSeverityRank(b.severity) - getSeverityRank(a.severity) || (b.confidence ?? 0) - (a.confidence ?? 0))
    .map((finding) => {
      const riskTitle = safeText(finding.riskTitle);
      const category = safeText(finding.category);
      if (riskTitle) return riskTitle;
      return category ? `Review ${category.toLowerCase()} risk allocation` : "";
    })
    .filter(Boolean)
    .slice(0, 4);

  if (derivedActions.length) return padActions(derivedActions);

  return [
    "Strengthen payment certainty and remove broad withholding",
    "Cap supplier indemnity to align with liability cap",
    "Rebalance termination rights and payment for completed work",
    "Limit audit rights and clarify data processing responsibilities"
  ];
}

function padActions(actions: string[]) {
  const fallbackActions = [
    "Strengthen payment certainty and remove broad withholding",
    "Cap supplier indemnity to align with liability cap",
    "Rebalance termination rights and payment for completed work",
    "Limit audit rights and clarify data processing responsibilities"
  ];
  return [...actions, ...fallbackActions].slice(0, 4);
}

function isPendingDecision(row: FinalReviewRow) {
  return !row.decision || row.decision === "Pending";
}

function drawHeader(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor(...hexToRgb(COLORS.navy));
  doc.rect(x, y, width, height, "F");

  drawHeaderAiIcon(doc, DASHBOARD_MARGIN + 4, y + height / 2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...hexToRgb(COLORS.white));
  doc.text("AI Risk Analyzer", DASHBOARD_MARGIN + 10, y + height / 2 + 1.6);

  const rightTitle = "Risk Review Report";
  doc.text(rightTitle, x + width - doc.getTextWidth(rightTitle) - DASHBOARD_MARGIN - 2, y + height / 2 + 1.6);
}

function drawHeaderAiIcon(doc: jsPDF, cx: number, cy: number) {
  doc.setDrawColor(...hexToRgb(COLORS.white));
  doc.setLineWidth(0.45);
  doc.circle(cx, cy, 3.6, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.7);
  doc.setTextColor(...hexToRgb(COLORS.white));
  doc.text("AI", cx - 2.3, cy + 1.8);
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text("Confidential", DASHBOARD_MARGIN, FOOTER_TOP + 7.9);
  const pageText = `Page ${pageNumber} of ${totalPages}`;
  doc.text(pageText, DASHBOARD_MARGIN + DASHBOARD_WIDTH - doc.getTextWidth(pageText), FOOTER_TOP + 7.9);
}

function drawFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    drawFooter(doc, pageNumber, pageCount);
  }
}

function drawSectionTitle(doc: jsPDF, title: string, x: number, y: number) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.1);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.text(title, x, y);
}

function drawMetadataStrip(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  items: Array<{ label: string; value: string }>
) {
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.22);
  doc.roundedRect(x, y, width, height, 1.4, 1.4, "FD");

  const widthRatios = [0.16, 0.22, 0.22, 0.4];
  let itemX = x;
  items.forEach((item, index) => {
    const itemWidth = width * (widthRatios[index] ?? 1 / items.length);
    if (index > 0) {
      doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
      doc.line(itemX, y + 2, itemX, y + height - 2);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...hexToRgb(COLORS.mutedText));
    const label = `${item.label}:`;
    doc.text(label, itemX + 3.4, y + 7.3);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    const valueX = itemX + 3.4 + doc.getTextWidth(label) + 1.4;
    doc.text(clampSingleLine(doc, item.value || "Not available", itemWidth - (valueX - itemX) - 3.4), valueX, y + 7.3);
    itemX += itemWidth;
  });
}

function drawKpiCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  value: string,
  valueColor: string,
  fillColor: string
) {
  drawCard(doc, x, y, width, height, fillColor, true);
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.circle(x + 7.5, y + height / 2, 4.5, "F");
  drawKpiIcon(doc, label, x + 7.5, y + height / 2, valueColor);

  const contentX = x + 14.5;
  const contentWidth = width - 17;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.text(label, contentX, y + 7.3);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(valueColor));
  const isNumericValue = /^\d+$/.test(value);

  if (isNumericValue) {
    doc.setFontSize(16.5);
    doc.text(value, contentX, y + 17.2);
    return;
  }

  doc.setFontSize(10.8);
  const valueLines = clampTextLines(doc, value, contentWidth, 2);
  if (valueLines.length === 1) {
    doc.text(valueLines[0], contentX, y + 16.1);
    return;
  }

  doc.text(valueLines[0], contentX, y + 13.6);
  doc.text(valueLines[1], contentX, y + 18);
}

function drawInfoCard(doc: jsPDF, x: number, y: number, width: number, height: number, title: string, body: string, background: string) {
  drawCard(doc, x, y, width, height, background, true);
  drawCardIcon(doc, title, x + 9.5, y + 10.6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.3);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.text(title, x + 19, y + 11);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.6);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  const lineHeight = 5.3;
  const bodyY = y + 18.8;
  const maxLines = Math.max(2, Math.floor((height - 19) / lineHeight) + 1);
  const lines = clampTextLines(doc, body, width - 25, maxLines);
  drawWrappedText(doc, lines, x + 19, bodyY, lineHeight);
}

function drawInfoChip(doc: jsPDF, x: number, y: number, width: number, height: number, label: string, value: string) {
  drawCard(doc, x, y, width, height, "#FAFAFA");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.text(label, x + 5, y + 7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(value.length > 18 ? 7.5 : 8.7);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  doc.text(clampSingleLine(doc, value || "Not available", width - 10), x + 5, y + 13.4);
}

function drawBadge(doc: jsPDF, x: number, y: number, size: number, color: string) {
  doc.setFillColor(...hexToRgb(color));
  doc.circle(x + size / 2, y + size / 2, size / 2, "F");
}

function drawSeverityBadge(doc: jsPDF, x: number, y: number, severity: string) {
  drawBadge(doc, x, y, 3.3, getSeverityColor(severity));
}

function drawDecisionBadge(doc: jsPDF, x: number, y: number, decision: string) {
  drawBadge(doc, x, y, 3.3, getDecisionColor(decision));
}

function drawKpiIcon(doc: jsPDF, label: string, cx: number, cy: number, color: string) {
  doc.setDrawColor(...hexToRgb(color));
  doc.setLineWidth(0.45);

  if (label === "Overall Decision") {
    doc.circle(cx, cy, 2.5, "S");
    doc.line(cx - 1.2, cy, cx - 0.2, cy + 1);
    doc.line(cx - 0.2, cy + 1, cx + 1.4, cy - 1);
    return;
  }

  if (label === "Overall Risk" || label === "Critical Risks") {
    doc.line(cx, cy - 2.6, cx - 2.4, cy + 1.9);
    doc.line(cx - 2.4, cy + 1.9, cx + 2.4, cy + 1.9);
    doc.line(cx + 2.4, cy + 1.9, cx, cy - 2.6);
    doc.line(cx, cy - 0.7, cx, cy + 0.6);
    doc.circle(cx, cy + 1.3, 0.25, "S");
    return;
  }

  doc.roundedRect(cx - 2.2, cy - 2.5, 4.4, 5, 0.6, 0.6, "S");
  doc.line(cx - 1.2, cy - 1.1, cx + 1.2, cy - 1.1);
  doc.line(cx - 1.2, cy + 0.2, cx + 1.2, cy + 0.2);
  doc.line(cx - 1.2, cy + 1.5, cx + 0.6, cy + 1.5);
}

function drawCardIcon(doc: jsPDF, title: string, cx: number, cy: number) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.setDrawColor(...hexToRgb(COLORS.revisedBlue));
  doc.setLineWidth(0.35);
  doc.roundedRect(cx - 4, cy - 4, 8, 8, 1.7, 1.7, "FD");
  doc.setDrawColor(...hexToRgb(COLORS.revisedBlue));
  doc.setLineWidth(0.45);

  if (title === "INSIGHT") {
    doc.line(cx, cy - 2.4, cx, cy + 2.4);
    doc.line(cx - 2.4, cy, cx + 2.4, cy);
    doc.line(cx - 1.7, cy - 1.7, cx + 1.7, cy + 1.7);
    doc.line(cx - 1.7, cy + 1.7, cx + 1.7, cy - 1.7);
    doc.circle(cx, cy, 0.7, "S");
    return;
  }

  doc.roundedRect(cx - 2.1, cy - 2.5, 4.2, 5, 0.5, 0.5, "S");
  doc.line(cx - 1.1, cy - 1.1, cx + 1.1, cy - 1.1);
  doc.line(cx - 1.1, cy + 0.1, cx + 1.1, cy + 0.1);
  doc.line(cx - 1.1, cy + 1.3, cx + 0.7, cy + 1.3);
}

function drawDivider(doc: jsPDF, x: number, y: number, width: number) {
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.25);
  doc.line(x, y, x + width, y);
}

function drawSeverityMixCard(doc: jsPDF, x: number, y: number, width: number, height: number, dashboard: DashboardData) {
  drawCard(doc, x, y, width, height, COLORS.white, true);
  drawSectionTitle(doc, "SEVERITY MIX", x + 3, y + 8);

  const severities = ["High", "Medium", "Low"] as const;
  severities.forEach((severity, index) => {
    const count = dashboard.severityMix[severity];
    const rowY = y + 16.8 + index * 9.7;
    doc.setFillColor(...hexToRgb(COLORS.lightBackground));
    doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
    doc.roundedRect(x + 5, rowY - 4.9, width - 10, 7.6, 1.4, 1.4, "FD");
    drawSeverityBadge(doc, x + 8.2, rowY - 2.8, severity);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    doc.text(severity, x + 14.8, rowY);
    const value = `${count} (${formatPercent(count, dashboard.totalRisks)})`;
    doc.setFontSize(9.2);
    doc.setTextColor(...hexToRgb(getSeverityColor(severity)));
    doc.text(value, x + width - doc.getTextWidth(value) - 8.5, rowY);
  });
}

function drawSeverityVisual(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  severityMix: Record<"High" | "Medium" | "Low", number>,
  total: number
) {
  drawHorizontalBar(
    doc,
    x,
    y,
    width,
    height,
    [
      { value: severityMix.High, color: COLORS.highRed },
      { value: severityMix.Medium, color: COLORS.mediumAmber },
      { value: severityMix.Low, color: COLORS.lowGreen }
    ],
    total
  );
}

function drawHorizontalBar(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  segments: Array<{ value: number; color: string }>,
  total: number
) {
  doc.setFillColor(...hexToRgb(COLORS.lightBorder));
  doc.roundedRect(x, y, width, height, height / 2, height / 2, "F");

  if (total <= 0) return;

  let offset = 0;
  segments.forEach((segment) => {
    if (segment.value <= 0) return;
    const segmentWidth = Math.max((segment.value / total) * width, 1.5);
    doc.setFillColor(...hexToRgb(segment.color));
    doc.rect(x + offset, y, Math.min(segmentWidth, width - offset), height, "F");
    offset += segmentWidth;
  });
}

function drawCategoryBreakdown(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  items: DashboardBreakdownItem[],
  totalRisks: number
) {
  drawCard(doc, x, y, width, height, COLORS.white, true);
  drawSectionTitle(doc, "CATEGORY BREAKDOWN", x + 3, y + 8);

  const visibleItems = items.length ? items.slice(0, 5) : [{ label: "Uncategorized", count: 0 }];
  drawDonutChart(doc, x + 24.5, y + 27.2, 11.8, 5.2, visibleItems, totalRisks);

  visibleItems.forEach((item, index) => {
    const rowY = y + 15.8 + index * 6.6;
    drawBadge(doc, x + 48, rowY - 2.8, 3, getCategoryColor(index));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.3);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    doc.text(clampSingleLine(doc, item.label, 31), x + 54, rowY);
    const value = `${item.count} (${formatPercent(item.count, totalRisks)})`;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...hexToRgb(COLORS.navy));
    doc.text(value, x + width - doc.getTextWidth(value) - 4, rowY);
  });
}

function drawDonutChart(
  doc: jsPDF,
  cx: number,
  cy: number,
  radius: number,
  lineWidth: number,
  items: DashboardBreakdownItem[],
  total: number
) {
  doc.setLineWidth(lineWidth);
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.circle(cx, cy, radius, "S");

  if (total <= 0) {
    doc.setLineWidth(0.25);
    return;
  }

  let startAngle = -90;
  items.forEach((item, index) => {
    if (item.count <= 0) return;
    const endAngle = startAngle + (item.count / total) * 360;
    drawArcSegment(doc, cx, cy, radius, startAngle, endAngle, getCategoryColor(index));
    startAngle = endAngle;
  });

  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.circle(cx, cy, radius - lineWidth / 2 - 0.2, "F");
  doc.setLineWidth(0.25);
}

function drawArcSegment(doc: jsPDF, cx: number, cy: number, radius: number, startAngle: number, endAngle: number, color: string) {
  doc.setDrawColor(...hexToRgb(color));
  const step = Math.max(3, Math.min(10, (endAngle - startAngle) / 8));

  for (let angle = startAngle; angle < endAngle; angle += step) {
    const nextAngle = Math.min(angle + step, endAngle);
    const start = polarPoint(cx, cy, radius, angle);
    const end = polarPoint(cx, cy, radius, nextAngle);
    doc.line(start.x, start.y, end.x, end.y);
  }
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + Math.cos(radians) * radius,
    y: cy + Math.sin(radians) * radius
  };
}

function drawTopActions(doc: jsPDF, x: number, y: number, width: number, actions: string[]) {
  const visibleActions = actions.slice(0, 4);
  if (!visibleActions.length) return 0;

  const gap = 3.5;
  const columns = visibleActions.length === 4 ? 4 : visibleActions.length;
  const cardWidth = (width - gap * (columns - 1)) / columns;
  const cardHeight = 25;

  visibleActions.forEach((action, index) => {
    const cardX = x + index * (cardWidth + gap);
    drawTopActionCard(doc, cardX, y, cardWidth, cardHeight, index + 1, action);
  });

  return cardHeight;
}

function drawTopActionCard(doc: jsPDF, x: number, y: number, width: number, height: number, index: number, action: string) {
  drawCard(doc, x, y, width, height, COLORS.white, true);
  const colors = [COLORS.highRed, COLORS.mediumAmber, COLORS.pendingAmber, COLORS.lowGreen];
  const color = colors[(index - 1) % colors.length];
  doc.setFillColor(...hexToRgb(color));
  doc.circle(x + 6.5, y + 6.5, 3.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.9);
  doc.setTextColor(...hexToRgb(COLORS.white));
  doc.text(String(index), x + 5.7, y + 8.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  const lines = clampTextLines(doc, action, width - 9, 3);
  drawWrappedText(doc, lines, x + 4.5, y + 15.2, 4.1);
}

function drawDecisionWarningStrip(doc: jsPDF, x: number, y: number, width: number, height: number, pendingCount: number) {
  const hasPending = pendingCount > 0;
  const fill = hasPending ? COLORS.softRed : COLORS.softGreen;
  const color = hasPending ? COLORS.highRed : COLORS.lowGreen;
  const text = hasPending
    ? "Pending decisions remain. Resolve pending items before finalizing."
    : "All risk decisions have been reviewed.";

  doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(...hexToRgb(color));
  doc.setLineWidth(0.35);
  doc.roundedRect(x, y, width, height, 1.7, 1.7, "FD");
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.circle(x + 36.5, y + height / 2, 3.6, "F");
  drawDecisionBadge(doc, x + 34.9, y + height / 2 - 1.6, hasPending ? "Pending" : "Accepted");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.2);
  doc.setTextColor(...hexToRgb(color));
  doc.text(text, x + 43, y + height / 2 + 1.4);
}

function drawCard(doc: jsPDF, x: number, y: number, width: number, height: number, fillColor: string, shadow = false) {
  if (shadow) {
    doc.setFillColor(243, 244, 246);
    doc.roundedRect(x + 0.6, y + 0.8, width, height, CARD_RADIUS, CARD_RADIUS, "F");
  }

  doc.setFillColor(...hexToRgb(fillColor));
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.28);
  doc.roundedRect(x, y, width, height, CARD_RADIUS, CARD_RADIUS, "FD");
}

function wrapText(doc: jsPDF, value: string, maxWidth: number) {
  const lines = doc.splitTextToSize(safeText(value), maxWidth);
  return Array.isArray(lines) ? lines : [lines];
}

function drawWrappedText(doc: jsPDF, lines: string[], x: number, y: number, lineHeight = BODY_LINE_HEIGHT) {
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function addPageIfNeeded(doc: jsPDF, y: number, requiredHeight: number) {
  return ensurePageSpace(doc, y, requiredHeight);
}

function ensurePageSpace(doc: jsPDF, y: number, requiredHeight: number) {
  if (y + requiredHeight <= PAGE_BOTTOM) return y;
  doc.addPage();
  return PAGE_TOP;
}

function getSeverityColor(severity: unknown) {
  if (severity === "High") return COLORS.highRed;
  if (severity === "Medium") return COLORS.mediumAmber;
  if (severity === "Low") return COLORS.lowGreen;
  return COLORS.mutedText;
}

function getDecisionColor(decision: unknown) {
  if (decision === "Revised" || decision === "Approve with Changes") return COLORS.revisedBlue;
  if (decision === "Accepted" || decision === "Approve") return COLORS.lowGreen;
  if (decision === "Pending" || decision === "Hold for Review") return COLORS.pendingAmber;
  if (decision === "Reject") return COLORS.highRed;
  return COLORS.mutedText;
}

function getCategoryColor(index: number) {
  const categoryColors = [COLORS.revisedBlue, COLORS.highRed, COLORS.mediumAmber, COLORS.lowGreen, COLORS.navy, COLORS.mutedText];
  return categoryColors[index % categoryColors.length];
}

function formatDate(value: string | Date, includeTime = false) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

function formatPercent(count: number, total: number) {
  if (total <= 0) return "0%";
  const value = (count / total) * 100;
  return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}%`;
}

function formatOptionalDate(value: string, includeTime: boolean) {
  return value ? formatDate(value, includeTime) || "Not available" : "Not available";
}

function getFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = safeText(record[key]);
    if (value) return value;
  }
  return "";
}

function formatSourceTypeValue(value: string) {
  if (!value) return "Not available";
  if (value === "upload" || value === "paste" || value === "demo") return formatSourceType(value as AnalysisSource["sourceKind"]);
  return value;
}

function getSeverityRank(severity: unknown) {
  if (severity === "High") return 3;
  if (severity === "Medium") return 2;
  if (severity === "Low") return 1;
  return 0;
}

function clampTextLines(doc: jsPDF, value: string, maxWidth: number, maxLines: number) {
  const lines = wrapText(doc, value, maxWidth);
  if (lines.length <= maxLines) return lines;

  const visibleLines = lines.slice(0, maxLines);
  visibleLines[maxLines - 1] = addEllipsisToFit(doc, visibleLines[maxLines - 1], maxWidth);
  return visibleLines;
}

function clampSingleLine(doc: jsPDF, value: string, maxWidth: number) {
  const normalized = safeText(value);
  if (doc.getTextWidth(normalized) <= maxWidth) return normalized;
  return addEllipsisToFit(doc, normalized, maxWidth);
}

function addEllipsisToFit(doc: jsPDF, value: string, maxWidth: number) {
  const ellipsis = "...";
  let text = safeText(value);
  while (text.length > 0 && doc.getTextWidth(`${text}${ellipsis}`) > maxWidth) {
    text = text.slice(0, -1).trimEnd();
  }
  return text ? `${text}${ellipsis}` : ellipsis;
}

function tintColor(color: string) {
  if (color === COLORS.highRed) return "#FEE2E2";
  if (color === COLORS.mediumAmber || color === COLORS.pendingAmber) return "#FEF3C7";
  if (color === COLORS.lowGreen) return "#DCFCE7";
  if (color === COLORS.revisedBlue || color === COLORS.navy) return COLORS.lightBluePanel;
  return COLORS.lightBackground;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16)
  ];
}

function writeReportHeader(doc: jsPDF, y: number, reportModel: ReportModel) {
  const document = reportModel.document;
  const generatedAt = formatReportDate(new Date());
  const metadataRows = [
    `Document Name: ${document.documentName}`,
    `Source Type: ${formatSourceType(document.sourceType)}`,
    document.receivedForReviewDate ? `Received for Review: ${formatReportDate(document.receivedForReviewDate)}` : "",
    `Report Generated: ${generatedAt}`
  ].filter(Boolean);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  y = writeWrappedPaginated(doc, "Risk Review Report", PAGE_MARGIN, y, PAGE_WIDTH, 8);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  y = writeWrappedPaginated(doc, "Generated by AI Risk Analyzer", PAGE_MARGIN, y + 1, PAGE_WIDTH);
  y += 3;

  metadataRows.forEach((row) => {
    y = writeWrappedPaginated(doc, row, PAGE_MARGIN, y, PAGE_WIDTH);
  });

  return y + 5;
}

function writeRiskSummary(doc: jsPDF, y: number, reportModel: ReportModel) {
  const document = reportModel.document;
  const severityMix = `High ${document.summary.severityMix.High} / Medium ${document.summary.severityMix.Medium} / Low ${document.summary.severityMix.Low}`;
  const riskCategories = Object.entries(document.summary.categoryMix)
    .filter(([, count]) => count > 0)
    .map(([category, count]) => `${category} ${count}`)
    .join(" / ");
  const reviewCounts = `Revised ${reportModel.finalReviewCounts.Revised} / Accepted ${reportModel.finalReviewCounts.Accepted} / Pending ${reportModel.finalReviewCounts.Pending}`;

  y = writeSectionHeading(doc, y, "Risk Summary / Decision Snapshot");
  y = writeKeyValue(doc, y, "Overall Decision", reportModel.overallDecision);
  y = writeKeyValue(doc, y, "Overall Risk", document.overallRiskLevel);
  y = writeKeyValue(doc, y, "Total Risks", String(document.summary.totalRiskCount));
  y = writeKeyValue(doc, y, "Severity Mix", severityMix);
  y = writeKeyValue(doc, y, "Risk Categories", riskCategories || "No categorized risks");
  y = writeKeyValue(doc, y, "Review Counts", reviewCounts);

  const reviewStateNote =
    reportModel.finalReviewCounts.Pending > 0
      ? "Pending decisions remain. Resolve pending items before finalizing."
      : "No pending decisions remain; review package is ready for finalization.";

  return writeParagraph(doc, reviewStateNote, y + 1) + 4;
}

function writeInsightAndSummary(doc: jsPDF, y: number, reportModel: ReportModel) {
  const document = reportModel.document;
  const aiInsight = safeText(document.aiInsight);
  const executiveSummary = safeText(document.executiveSummary) || "Executive summary is not available.";

  y = writeSectionHeading(doc, y, "AI Insight + Executive Summary");

  if (aiInsight) {
    y = writeKeyValue(doc, y, "AI Insight", aiInsight);
    y += 1;
  }

  y = writeKeyValue(doc, y, "Executive Summary", executiveSummary);
  return y + 4;
}

function writeTopCriticalRisks(doc: jsPDF, y: number, topCriticalRisks: string[]) {
  if (!topCriticalRisks.length) return y;

  y = writeSectionHeading(doc, y, "Top Critical Risks");
  topCriticalRisks.forEach((riskTitle) => {
    y = writeParagraph(doc, `- ${riskTitle}`, y);
  });

  return y + 4;
}

function writeRiskRegister(doc: jsPDF, y: number, rows: FinalReviewRow[]) {
  y = writeSectionHeading(doc, y, "Risk Register");

  return writeTable(
    doc,
    y,
    [
      { label: "#", width: 9 },
      { label: "Risk", width: 58 },
      { label: "Category", width: 26 },
      { label: "Severity", width: 22 },
      { label: "AI Confidence", width: 27 },
      { label: "Decision", width: 38 }
    ],
    rows.map((row, index) => [
      String(index + 1),
      row.finding.riskTitle,
      row.finding.category,
      row.finding.severity,
      formatPdfConfidence(row.finding.confidence),
      row.decision
    ])
  ) + 5;
}

function writeDetailedRiskReviews(doc: jsPDF, y: number, rows: FinalReviewRow[]) {
  y = writeSectionHeading(doc, y, "Detailed Risk Reviews");

  rows.forEach((row, index) => {
    const finding = row.finding;
    const heading = `${index + 1}. ${finding.riskTitle}`;

    y = ensureSpace(doc, y, 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    y = writeWrappedPaginated(doc, heading, PAGE_MARGIN, y, PAGE_WIDTH, 5.8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    y = writeCompactMetadataLine(doc, y + 1, finding);
    y = writeKeyValue(doc, y, "Original Clause / Clause Evidence", row.originalClause);
    y = writeKeyValue(doc, y, "Why It Matters", finding.whyItMatters || "Not available.");
    y = writeKeyValue(doc, y, "Business Impact", finding.businessImpact || "Not available.");
    y = writeKeyValue(doc, y, "Final Decision", row.decision);
    y = writeKeyValue(doc, y, "Final Clause Outcome", getFinalClauseOutcome(row));
    y += 4;
  });

  return y;
}

function writeFinalReviewTable(doc: jsPDF, y: number, rows: FinalReviewRow[]) {
  y = writeSectionHeading(doc, y, "Final Review");

  return writeTable(
    doc,
    y,
    [
      { label: "Risk", width: 62 },
      { label: "Decision", width: 24 },
      { label: "Final Clause", width: 64 },
      { label: "Compare / Notes", width: 30 }
    ],
    rows.map((row) => [
      row.finding.riskTitle,
      row.decision,
      getFinalReviewTableClause(row),
      row.note
    ])
  ) + 5;
}

function writeNextActions(doc: jsPDF, y: number, nextActions: string[]) {
  const actions = nextActions.map((action) => safeText(action)).filter(Boolean);
  if (!actions.length) return y;

  y = writeSectionHeading(doc, y, "Recommended Next Actions / Closing Notes");
  actions.forEach((action) => {
    y = writeParagraph(doc, `- ${action}`, y);
  });

  return y;
}

function writeCompactMetadataLine(doc: jsPDF, y: number, finding: NormalizedFinding) {
  const sectionRef = finding.sectionRef ? `Section: ${finding.sectionRef} | ` : "";
  const line = `${sectionRef}Category: ${finding.category} | Severity: ${finding.severity} | AI Confidence: ${formatPdfConfidence(finding.confidence)}`;
  return writeParagraph(doc, line, y);
}

function getFinalClauseOutcome(row: FinalReviewRow) {
  if (row.decision === "Revised") {
    return `Revised Clause: ${row.revisedClause || row.finalClause}`;
  }

  if (row.decision === "Accepted") {
    return "Accepted as-is / Original retained.";
  }

  return "Awaiting decision.";
}

function getFinalReviewTableClause(row: FinalReviewRow) {
  if (row.decision === "Revised") {
    return row.revisedClause || row.finalClause;
  }

  return row.finalClause;
}

function writeSectionHeading(doc: jsPDF, y: number, title: string) {
  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  y = writeWrappedPaginated(doc, title, PAGE_MARGIN, y, PAGE_WIDTH, 6.4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  return y + 2;
}

function writeKeyValue(doc: jsPDF, y: number, label: string, value: string) {
  const text = `${label}: ${safeText(value) || "Not available."}`;
  return writeParagraph(doc, text, y);
}

function writeParagraph(doc: jsPDF, text: string, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  return writeWrappedPaginated(doc, text, PAGE_MARGIN, y, PAGE_WIDTH, BODY_LINE_HEIGHT);
}

function writeTable(doc: jsPDF, y: number, columns: PdfTableColumn[], rows: string[][]) {
  y = writeTableHeader(doc, y, columns);

  rows.forEach((row) => {
    const cellLines = row.map((cell, index) => getWrappedLines(doc, cell, columns[index].width - 2));
    const totalLineCount = Math.max(...cellLines.map((lines) => lines.length), 1);
    let lineOffset = 0;

    while (lineOffset < totalLineCount) {
      const remainingLineCount = totalLineCount - lineOffset;
      const fullRowHeight = remainingLineCount * TABLE_LINE_HEIGHT + TABLE_CELL_VERTICAL_PADDING;

      if (y + fullRowHeight <= PAGE_BOTTOM) {
        y = writeTableRowChunk(doc, y, columns, cellLines, lineOffset, remainingLineCount);
        lineOffset = totalLineCount;
        continue;
      }

      const availableLineCount = getAvailableTableLineCount(y);
      if (availableLineCount <= 0) {
        doc.addPage();
        y = writeTableHeader(doc, PAGE_TOP, columns);
        continue;
      }

      const chunkLineCount = Math.min(remainingLineCount, availableLineCount);
      y = writeTableRowChunk(doc, y, columns, cellLines, lineOffset, chunkLineCount);
      lineOffset += chunkLineCount;

      if (lineOffset < totalLineCount) {
        doc.addPage();
        y = writeTableHeader(doc, PAGE_TOP, columns);
      }
    }
  });

  return y;
}

function writeTableRowChunk(
  doc: jsPDF,
  y: number,
  columns: PdfTableColumn[],
  cellLines: string[][],
  lineOffset: number,
  lineCount: number
) {
  const rowHeight = lineCount * TABLE_LINE_HEIGHT + TABLE_CELL_VERTICAL_PADDING;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  let x = PAGE_MARGIN;
  cellLines.forEach((lines, index) => {
    const visibleLines = lines.slice(lineOffset, lineOffset + lineCount);
    let cellY = y + TABLE_CELL_VERTICAL_PADDING;

    visibleLines.forEach((line) => {
      doc.text(line, x, cellY);
      cellY += TABLE_LINE_HEIGHT;
    });

    x += columns[index].width;
  });

  return y + rowHeight;
}

function getAvailableTableLineCount(y: number) {
  return Math.floor((PAGE_BOTTOM - y - TABLE_CELL_VERTICAL_PADDING) / TABLE_LINE_HEIGHT);
}

function writeTableHeader(doc: jsPDF, y: number, columns: PdfTableColumn[]) {
  y = ensureSpace(doc, y, 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  let x = PAGE_MARGIN;
  columns.forEach((column) => {
    doc.text(column.label, x, y);
    x += column.width;
  });

  return y + 5;
}

function writeWrappedPaginated(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = BODY_LINE_HEIGHT
) {
  const lines = getWrappedLines(doc, text, maxWidth);

  lines.forEach((line) => {
    if (y > PAGE_BOTTOM) {
      doc.addPage();
      y = PAGE_TOP;
    }

    doc.text(line, x, y);
    y += lineHeight;
  });

  return y;
}

function ensureSpace(doc: jsPDF, y: number, requiredHeight: number) {
  if (y + requiredHeight <= PAGE_BOTTOM) return y;
  doc.addPage();
  return PAGE_TOP;
}

function getWrappedLines(doc: jsPDF, value: string, maxWidth: number) {
  const lines = doc.splitTextToSize(safeText(value), maxWidth);
  return Array.isArray(lines) ? lines : [lines];
}

function formatPdfConfidence(confidence: unknown) {
  return typeof confidence === "number" && Number.isFinite(confidence) ? `${Math.round(confidence * 100)}%` : "--";
}

function formatSourceType(sourceType: AnalysisSource["sourceKind"]) {
  if (sourceType === "upload") return "Upload";
  if (sourceType === "paste") return "Paste";
  if (sourceType === "demo") return "Demo";
  return "Document";
}

function formatReportDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function safeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
