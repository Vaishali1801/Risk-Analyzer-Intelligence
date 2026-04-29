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

  drawHeader(doc, 0, 0, A4_WIDTH, 24);

  let y = 35;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  const titleLines = clampTextLines(doc, safeText(document.documentName) || "Risk Review Report", DASHBOARD_WIDTH - 12, 2);
  titleLines.forEach((line) => {
    doc.text(line, DASHBOARD_MARGIN + 2, y);
    y += 6.3;
  });

  const subtitle = safeText(document.contractTitle);
  if (titleLines.length === 1 && subtitle && subtitle !== document.documentName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    doc.text(clampSingleLine(doc, subtitle, DASHBOARD_WIDTH - 12), DASHBOARD_MARGIN + 2, y);
    y += 5.3;
  }

  const metadataY = y + 2.5;
  const metadataCards = [
    { label: "Source Type", value: dashboard.sourceType },
    { label: "Document Created", value: dashboard.documentCreated },
    { label: "Received by Risk Team", value: dashboard.receivedByRiskTeam },
    { label: "Report Generated", value: dashboard.reportGenerated }
  ];
  const metadataGap = 3.5;
  const metadataWidth = (DASHBOARD_WIDTH - metadataGap * 3) / 4;
  metadataCards.forEach((item, index) => {
    drawInfoChip(doc, DASHBOARD_MARGIN + index * (metadataWidth + metadataGap), metadataY, metadataWidth, 20, item.label, item.value);
  });

  y = metadataY + 27;
  drawDivider(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH);
  y += 7;

  drawSectionTitle(doc, "DECISION SNAPSHOT", DASHBOARD_MARGIN + 1, y);
  y += 5.7;
  const kpiGap = 4;
  const kpiWidth = (DASHBOARD_WIDTH - kpiGap * 3) / 4;
  const kpiCards = [
    { label: "Overall Decision", value: reportModel.overallDecision, color: getDecisionColor(reportModel.overallDecision) },
    { label: "Overall Risk", value: document.overallRiskLevel, color: getSeverityColor(document.overallRiskLevel) },
    { label: "Total Risks", value: String(dashboard.totalRisks), color: COLORS.navy },
    { label: "Critical Risks", value: String(dashboard.criticalRisks), color: COLORS.highRed }
  ];
  kpiCards.forEach((item, index) => {
    drawKpiCard(doc, DASHBOARD_MARGIN + index * (kpiWidth + kpiGap), y, kpiWidth, 23.5, item.label, item.value, item.color);
  });

  y += 30;
  const rowGap = 5;
  const leftWidth = 86;
  const rightWidth = DASHBOARD_WIDTH - leftWidth - rowGap;
  drawSeverityMixCard(doc, DASHBOARD_MARGIN, y, leftWidth, 49, dashboard);
  drawCategoryBreakdown(doc, DASHBOARD_MARGIN + leftWidth + rowGap, y, rightWidth, 49, dashboard.categoryBreakdown, dashboard.totalRisks);

  y += 55;
  const insightWidth = 91;
  const summaryWidth = DASHBOARD_WIDTH - insightWidth - rowGap;
  drawInfoCard(
    doc,
    DASHBOARD_MARGIN,
    y,
    insightWidth,
    42,
    "INSIGHT",
    dashboard.aiInsight || "Key risk concentration identified from the analyzed document.",
    COLORS.lightBluePanel
  );
  drawInfoCard(
    doc,
    DASHBOARD_MARGIN + insightWidth + rowGap,
    y,
    summaryWidth,
    42,
    "EXECUTIVE SUMMARY",
    dashboard.executiveSummary || "Executive summary is not available.",
    COLORS.lightBluePanel
  );

  y += 50;
  drawDivider(doc, DASHBOARD_MARGIN, y - 5, DASHBOARD_WIDTH);
  drawSectionTitle(doc, "TOP ACTIONS / RECOMMENDED PRIORITIES", DASHBOARD_MARGIN + 1, y);
  y += 5.5;
  const actionGap = 4;
  const actionWidth = (DASHBOARD_WIDTH - actionGap * 3) / 4;
  dashboard.topActions.forEach((action, index) => {
    drawTopActionCard(doc, DASHBOARD_MARGIN + index * (actionWidth + actionGap), y, actionWidth, 26, index + 1, action);
  });

  y += 31.5;
  drawDecisionWarningStrip(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, 11.5, dashboard.pendingDecisionCount);
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13.5);
  doc.setTextColor(...hexToRgb(COLORS.white));
  doc.text("AI Risk Analyzer", DASHBOARD_MARGIN, y + height / 2 + 1.6);

  const rightTitle = "Risk Review Report";
  doc.text(rightTitle, x + width - doc.getTextWidth(rightTitle) - DASHBOARD_MARGIN, y + height / 2 + 1.6);
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Confidential", DASHBOARD_MARGIN, FOOTER_TOP + 8.6);
  const pageText = `Page ${pageNumber} of ${totalPages}`;
  doc.text(pageText, DASHBOARD_MARGIN + DASHBOARD_WIDTH - doc.getTextWidth(pageText), FOOTER_TOP + 8.6);
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
  doc.setFontSize(8.8);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.text(title, x, y);
}

function drawKpiCard(doc: jsPDF, x: number, y: number, width: number, height: number, label: string, value: string, valueColor: string) {
  drawCard(doc, x, y, width, height, COLORS.white);
  doc.setFillColor(...hexToRgb(tintColor(valueColor)));
  doc.circle(x + 8.7, y + height / 2, 5.5, "F");
  drawBadge(doc, x + 6.7, y + height / 2 - 2.2, 4.4, valueColor);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  doc.text(label, x + 17.5, y + 9.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(value.length > 13 ? 10.3 : 13.8);
  doc.setTextColor(...hexToRgb(valueColor));
  doc.text(clampSingleLine(doc, value, width - 21), x + 17.5, y + 17.4);
}

function drawInfoCard(doc: jsPDF, x: number, y: number, width: number, height: number, title: string, body: string, background: string) {
  drawCard(doc, x, y, width, height, background);
  doc.setFillColor(...hexToRgb(COLORS.revisedBlue));
  doc.circle(x + 9, y + 10.5, 5.2, "F");
  doc.setTextColor(...hexToRgb(COLORS.white));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(title === "INSIGHT" ? "i" : "S", x + 8.2, y + 13);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...hexToRgb(COLORS.revisedBlue));
  doc.text(title, x + 18, y + 10.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  const lines = clampTextLines(doc, body, width - 24, 6);
  drawWrappedText(doc, lines, x + 18, y + 18.3, 4.6);
}

function drawInfoChip(doc: jsPDF, x: number, y: number, width: number, height: number, label: string, value: string) {
  drawCard(doc, x, y, width, height, COLORS.white);
  doc.setFillColor(...hexToRgb(COLORS.lightBluePanel));
  doc.roundedRect(x + 4, y + 6.1, 5.6, 5.6, 1.2, 1.2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.9);
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.text(label, x + 12.4, y + 8.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(value.length > 18 ? 7.1 : 8);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  doc.text(clampSingleLine(doc, value || "Not available", width - 14.5), x + 12.4, y + 14.3);
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

function drawDivider(doc: jsPDF, x: number, y: number, width: number) {
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.25);
  doc.line(x, y, x + width, y);
}

function drawSeverityMixCard(doc: jsPDF, x: number, y: number, width: number, height: number, dashboard: DashboardData) {
  drawCard(doc, x, y, width, height, COLORS.white);
  drawSectionTitle(doc, "SEVERITY MIX", x + 3, y + 8);

  const severities = ["High", "Medium", "Low"] as const;
  severities.forEach((severity, index) => {
    const count = dashboard.severityMix[severity];
    const rowY = y + 15.5 + index * 9.4;
    doc.setFillColor(...hexToRgb(COLORS.lightBackground));
    doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
    doc.roundedRect(x + 5, rowY - 4.5, width - 10, 7, 1.2, 1.2, "FD");
    drawSeverityBadge(doc, x + 8, rowY - 2.5, severity);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    doc.text(severity, x + 14, rowY);
    const value = `${count} (${formatPercent(count, dashboard.totalRisks)})`;
    doc.setTextColor(...hexToRgb(getSeverityColor(severity)));
    doc.text(value, x + width - doc.getTextWidth(value) - 8, rowY);
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
  drawCard(doc, x, y, width, height, COLORS.white);
  drawSectionTitle(doc, "CATEGORY BREAKDOWN", x + 3, y + 8);

  const visibleItems = items.length ? items.slice(0, 5) : [{ label: "Uncategorized", count: 0 }];
  drawDonutChart(doc, x + 25, y + 29, 12.5, 5.2, visibleItems, totalRisks);

  visibleItems.forEach((item, index) => {
    const rowY = y + 16.6 + index * 6.2;
    drawBadge(doc, x + 47, rowY - 2.8, 2.8, getCategoryColor(index));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.7);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    doc.text(clampSingleLine(doc, item.label, 25), x + 53, rowY);
    const value = `${item.count} (${formatPercent(item.count, totalRisks)})`;
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

function drawTopActionCard(doc: jsPDF, x: number, y: number, width: number, height: number, index: number, action: string) {
  drawCard(doc, x, y, width, height, COLORS.white);
  const colors = [COLORS.highRed, COLORS.mediumAmber, COLORS.pendingAmber, COLORS.lowGreen];
  const color = colors[(index - 1) % colors.length];
  doc.setFillColor(...hexToRgb(color));
  doc.circle(x + 6, y + 6.5, 3.3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...hexToRgb(COLORS.white));
  doc.text(String(index), x + 5.1, y + 8.8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  const lines = clampTextLines(doc, action, width - 10, 4);
  drawWrappedText(doc, lines, x + 4, y + 15, 4.1);
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
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 1.4, 1.4, "FD");
  drawDecisionBadge(doc, x + 35, y + 3.8, hasPending ? "Pending" : "Accepted");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.8);
  doc.setTextColor(...hexToRgb(color));
  doc.text(text, x + 43, y + 7.4);
}

function drawCard(doc: jsPDF, x: number, y: number, width: number, height: number, fillColor: string) {
  doc.setFillColor(...hexToRgb(fillColor));
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 1.4, 1.4, "FD");
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
