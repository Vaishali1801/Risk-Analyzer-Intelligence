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
const REGISTER_FOOTER_BUFFER = 2.2;
const CARD_RADIUS = 1.8;
const BODY_LINE_HEIGHT = 5.2;
const TABLE_LINE_HEIGHT = 4.4;
const TABLE_CELL_VERTICAL_PADDING = 4;
const DETAIL_PAGE_BOTTOM = FOOTER_TOP - 4.5;
const DETAIL_BLOCK_GAP = 4.2;
const DETAIL_BLOCK_PADDING = 4.3;
const DETAIL_COLUMN_GAP = 6;
const DETAIL_SECTION_GAP = 3;
const DETAIL_BODY_LINE_HEIGHT = 4.15;
const DETAIL_TITLE_LINE_HEIGHT = 4.3;
const DETAIL_TEXT_BODY_OFFSET = 4.85;
const DETAIL_TEXT_BOTTOM_PADDING = 3;
const DETAIL_RECOMMENDED_TEXT_X = 6;
const DETAIL_RECOMMENDED_LABEL_Y = 5.45;
const DETAIL_RECOMMENDED_BODY_Y = 10.35;
const DETAIL_RECOMMENDED_BOTTOM_PADDING = 3.2;
const DETAIL_META_SEPARATOR = " \u2022 ";

const COLORS = {
  navy: "#071B3A",
  darkText: "#111827",
  mutedText: "#6B7280",
  lightBorder: "#E5E7EB",
  lightBackground: "#F8FAFC",
  lightBluePanel: "#EFF6FF",
  softAmber: "#FFFBEB",
  softBlueGrey: "#F8FAFC",
  softBlueBorder: "#BFDBFE",
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

type SummaryRiskRow = {
  finding: NormalizedFinding;
  reviewRow?: FinalReviewRow;
  index: number;
};

export function downloadReportPdf(reportModel: ReportModel) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const document = reportModel.document;
  drawExecutiveDashboardPage(doc, reportModel);

  doc.addPage();
  drawRiskDriversSummaryPage(doc, reportModel);

  doc.addPage();
  drawDetailedRiskAnalysisPages(doc, reportModel);

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
    drawKpiCard(doc, DASHBOARD_MARGIN + index * (kpiWidth + kpiGap), y, kpiWidth, 17.5, item.label, item.value, item.color, item.fill);
  });

  y += 22;
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

  y += actionsHeight + 7;
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

const TOP_ACTION_FALLBACKS = [
  "Strengthen payment certainty and remove broad withholding",
  "Cap supplier indemnity to align with liability cap",
  "Rebalance termination rights and payment for completed work",
  "Limit audit rights and clarify data processing responsibilities"
];

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
    reportGenerated: reportGeneratedSource ? formatDate(reportGeneratedSource, false) || formatDate(new Date(), false) : formatDate(new Date(), false),
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
  return [...actions, ...TOP_ACTION_FALLBACKS].slice(0, 4);
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
  doc.setTextColor(...hexToRgb(COLORS.white));
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.setLineWidth(0.38);

  const nodes = [
    { x: cx - 2.9, y: cy - 2.1, r: 0.72 },
    { x: cx + 2.5, y: cy - 2.4, r: 0.72 },
    { x: cx - 3, y: cy + 2.2, r: 0.72 },
    { x: cx + 2.8, y: cy + 2.1, r: 0.72 },
    { x: cx, y: cy, r: 1 }
  ];

  doc.line(nodes[0].x, nodes[0].y, nodes[4].x, nodes[4].y);
  doc.line(nodes[1].x, nodes[1].y, nodes[4].x, nodes[4].y);
  doc.line(nodes[2].x, nodes[2].y, nodes[4].x, nodes[4].y);
  doc.line(nodes[3].x, nodes[3].y, nodes[4].x, nodes[4].y);
  doc.line(nodes[0].x, nodes[0].y, nodes[1].x, nodes[1].y);
  doc.line(nodes[2].x, nodes[2].y, nodes[3].x, nodes[3].y);

  nodes.forEach((node) => {
    doc.circle(node.x, node.y, node.r, "F");
  });
}

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number) {
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text("Confidential", DASHBOARD_MARGIN, FOOTER_TOP + 7.9);
  if (pageNumber === 2) {
    doc.setFontSize(7.8);
    doc.text("All identified risks are included for review and remediation.", A4_WIDTH / 2, FOOTER_TOP + 7.9, {
      align: "center"
    });
    doc.setFontSize(8.2);
  }
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

  const itemWidth = width / items.length;
  let itemX = x;
  items.forEach((item, index) => {
    if (index > 0) {
      doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
      doc.line(itemX, y + 2, itemX, y + height - 2);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...hexToRgb(COLORS.mutedText));
    doc.text(item.label, itemX + 3.5, y + 4.8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.7);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    doc.text(clampSingleLine(doc, item.value || "Not available", itemWidth - 7), itemX + 3.5, y + 9.4);
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
  const iconX = x + 7.4;
  const iconY = y + height / 2;
  const textX = x + 13.9;
  const textWidth = width - 16.4;
  const textCenterX = textX + textWidth / 2;

  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.circle(iconX, iconY, 3.85, "F");
  drawKpiIcon(doc, label, iconX, iconY, valueColor);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.7);
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.text(label, textCenterX, y + 6.8, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(valueColor));
  const isNumericValue = /^\d+$/.test(value);

  if (isNumericValue) {
    doc.setFontSize(14.8);
    doc.text(value, textCenterX, y + 14.9, { align: "center" });
    return;
  }

  doc.setFontSize(10);
  const valueLines = clampTextLines(doc, value, textWidth, 2);
  if (valueLines.length === 1) {
    doc.text(valueLines[0], textCenterX, y + 14.4, { align: "center" });
    return;
  }

  doc.text(valueLines[0], textCenterX, y + 12.1, { align: "center" });
  doc.text(valueLines[1], textCenterX, y + 15.6, { align: "center" });
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
  doc.setLineWidth(0.43);

  if (label === "Overall Decision") {
    doc.circle(cx, cy, 2.35, "S");
    doc.line(cx - 1.15, cy, cx - 0.25, cy + 0.9);
    doc.line(cx - 0.25, cy + 0.9, cx + 1.3, cy - 1);
    return;
  }

  if (label === "Overall Risk") {
    doc.line(cx, cy - 2.5, cx - 2.35, cy + 1.95);
    doc.line(cx - 2.35, cy + 1.95, cx + 2.35, cy + 1.95);
    doc.line(cx + 2.35, cy + 1.95, cx, cy - 2.5);
    doc.line(cx, cy - 0.65, cx, cy + 0.75);
    doc.circle(cx, cy + 1.35, 0.24, "S");
    return;
  }

  if (label === "Critical Risks") {
    doc.setLineWidth(0.5);
    doc.line(cx, cy - 2.6, cx + 2.45, cy);
    doc.line(cx + 2.45, cy, cx, cy + 2.6);
    doc.line(cx, cy + 2.6, cx - 2.45, cy);
    doc.line(cx - 2.45, cy, cx, cy - 2.6);
    doc.line(cx, cy - 1.15, cx, cy + 0.75);
    doc.circle(cx, cy + 1.5, 0.26, "S");
    return;
  }

  doc.roundedRect(cx - 2.1, cy - 2.4, 4.2, 4.8, 0.55, 0.55, "S");
  doc.line(cx - 1.15, cy - 1.05, cx + 1.15, cy - 1.05);
  doc.line(cx - 1.15, cy + 0.15, cx + 1.15, cy + 0.15);
  doc.line(cx - 1.15, cy + 1.4, cx + 0.65, cy + 1.4);
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
  const visibleActions = [...actions.filter(Boolean), ...TOP_ACTION_FALLBACKS].slice(0, 4);

  const columnGap = 4;
  const rowGap = 3;
  const cardWidth = (width - columnGap) / 2;
  const cardHeight = 17;

  visibleActions.forEach((action, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const cardX = x + column * (cardWidth + columnGap);
    const cardY = y + row * (cardHeight + rowGap);
    drawTopActionCard(doc, cardX, cardY, cardWidth, cardHeight, index + 1, action);
  });

  return cardHeight * 2 + rowGap;
}

function drawTopActionCard(doc: jsPDF, x: number, y: number, width: number, height: number, index: number, action: string) {
  drawCard(doc, x, y, width, height, COLORS.white, true);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.text(String(index), x + 4.4, y + 7.7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.7);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  const textX = x + 11.2;
  const lines = clampTextLines(doc, action, width - 15.2, 2);
  drawWrappedText(doc, lines, textX, y + 7.5, 4.3);
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

function drawRiskDriversSummaryPage(doc: jsPDF, reportModel: ReportModel) {
  const rows = getSummaryRiskRows(reportModel);

  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");
  drawHeader(doc, 0, 0, A4_WIDTH, 18);

  let y = drawReportTitleAndMetadata(doc, reportModel);
  y += 3.5;

  drawSectionTitle(doc, "KEY RISK DRIVERS (TOP 4)", DASHBOARD_MARGIN, y);
  y += 4.5;
  y = drawRiskDriverCards(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, rows);

  y += 8;
  drawSectionTitle(doc, "ALL IDENTIFIED RISKS (SUMMARY REGISTER)", DASHBOARD_MARGIN, y);
  y += 4.2;
  drawSummaryRiskRegister(doc, y, DASHBOARD_MARGIN, DASHBOARD_WIDTH, rows);
}

function drawReportTitleAndMetadata(doc: jsPDF, reportModel: ReportModel) {
  const document = reportModel.document;
  const dashboard = getDashboardData(reportModel);

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
  drawMetadataStrip(doc, DASHBOARD_MARGIN, metadataY, DASHBOARD_WIDTH, 12, [
    { label: "Source", value: dashboard.sourceType },
    { label: "Created", value: dashboard.documentCreated },
    { label: "Received", value: dashboard.receivedByRiskTeam },
    { label: "Generated", value: dashboard.reportGenerated }
  ]);

  return metadataY + 18;
}

function drawReportTitleOnly(doc: jsPDF, reportModel: ReportModel) {
  const document = reportModel.document;

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

  return y + 4.6;
}

type DetailedRiskBlock = {
  title: string;
  meta: string;
  severity: string;
  clauseExtract: string;
  riskExplanation: string;
  recommendedClause: string;
};

type DetailedRiskSection = {
  label: string;
  lines: string[];
  variant?: "quote";
};

type DetailedRiskBlockLayout = {
  titleLines: string[];
  clauseLines: string[];
  explanationLines: string[];
  recommendedLines: string[];
  headerHeight: number;
  columnWidth: number;
  recommendedWidth: number;
  twoColumnHeight: number;
  recommendedHeight: number;
  totalHeight: number;
};

function drawDetailedRiskAnalysisPages(doc: jsPDF, reportModel: ReportModel) {
  let y = drawDetailedRiskAnalysisPageStart(doc, reportModel, false);

  if (!reportModel.finalReviewRows.length) {
    drawEmptyDetailedRiskState(doc, y);
    return;
  }

  reportModel.finalReviewRows.forEach((row, index) => {
    const block = buildDetailedRiskBlock(row, index);
    y = drawDetailedRiskBlockWithPagination(doc, reportModel, y, block);
  });
}

function drawDetailedRiskAnalysisPageStart(doc: jsPDF, reportModel: ReportModel, continued: boolean) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");
  drawHeader(doc, 0, 0, A4_WIDTH, 18);

  let y = drawReportTitleOnly(doc, reportModel);

  drawSectionTitle(doc, continued ? "DETAILED RISK ANALYSIS (CONTINUED)" : "DETAILED RISK ANALYSIS", DASHBOARD_MARGIN, y);
  y += 6.2;

  return y;
}

function drawEmptyDetailedRiskState(doc: jsPDF, y: number) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.2);
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.text("No detailed risk findings are available.", DASHBOARD_MARGIN, y);
}

function buildDetailedRiskBlock(row: FinalReviewRow, index: number): DetailedRiskBlock {
  const finding = row.finding;
  const findingRecord = finding as unknown as Record<string, unknown>;
  const rowRecord = row as unknown as Record<string, unknown>;
  const title =
    safeText(finding.riskTitle) ||
    getFirstString(findingRecord, ["title", "risk", "name"]) ||
    getFirstString(rowRecord, ["title", "risk", "name"]) ||
    "Untitled risk";
  const section =
    safeText(finding.sectionRef) ||
    getFirstString(findingRecord, ["section", "clauseSection"]) ||
    getFirstString(rowRecord, ["section", "clauseSection"]) ||
    "Section not specified";
  const category =
    safeText(finding.category) ||
    getFirstString(findingRecord, ["category"]) ||
    getFirstString(rowRecord, ["category"]) ||
    "Uncategorized";
  const severity =
    getDetailedSeverity(finding.severity) ||
    getDetailedSeverity(getFirstString(findingRecord, ["severity"])) ||
    getDetailedSeverity(getFirstString(rowRecord, ["severity"])) ||
    "Medium";
  const confidence = formatDetailedConfidence(
    typeof finding.confidence === "number" ? finding.confidence : findingRecord.confidence ?? findingRecord.aiConfidence ?? rowRecord.confidence
  );
  const clauseExtract =
    getFirstString(findingRecord, ["clauseEvidence", "originalClause", "clause"]) ||
    safeText(row.originalClause) ||
    safeText(finding.fullClauseText) ||
    safeText(finding.clauseSnippet) ||
    safeText(finding.flaggedText) ||
    "Clause evidence not available.";
  const riskExplanation = combineRiskExplanation(finding.whyItMatters, finding.businessImpact);
  const recommendedClause =
    getFirstString(findingRecord, ["suggestedRevision", "suggestedClause", "finalClauseOutcome"]) ||
    safeText(row.revisedClause) ||
    safeText(finding.originalRecommendedDraft) ||
    getMeaningfulFinalClause(row) ||
    "Recommended clause not available.";

  return {
    title: `Risk ${index + 1}: ${toSentenceCase(title)}`,
    meta: `${section}${DETAIL_META_SEPARATOR}${category}${DETAIL_META_SEPARATOR}${confidence}`,
    severity,
    clauseExtract,
    riskExplanation,
    recommendedClause
  };
}

function drawDetailedRiskBlockWithPagination(doc: jsPDF, reportModel: ReportModel, y: number, block: DetailedRiskBlock) {
  const fullHeight = getDetailedRiskBlockHeight(doc, block, false);

  if (y + fullHeight <= DETAIL_PAGE_BOTTOM) {
    drawDetailedRiskBlock(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, block, false);
    return y + fullHeight + DETAIL_BLOCK_GAP;
  }

  doc.addPage();
  y = drawDetailedRiskAnalysisPageStart(doc, reportModel, true);

  if (y + fullHeight <= DETAIL_PAGE_BOTTOM) {
    drawDetailedRiskBlock(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, block, false);
    return y + fullHeight + DETAIL_BLOCK_GAP;
  }

  return drawSplitDetailedRiskBlock(doc, reportModel, y, block);
}

function drawDetailedRiskBlock(doc: jsPDF, x: number, y: number, width: number, block: DetailedRiskBlock, continued: boolean) {
  const layout = getDetailedRiskBlockLayout(doc, block, continued, width);

  drawDetailedBlockFrame(doc, x, y, width, layout.totalHeight);
  const contentY = drawDetailedRiskHeader(doc, x, y, width, block, layout.titleLines);
  const leftX = x + DETAIL_BLOCK_PADDING;
  const rightX = leftX + layout.columnWidth + DETAIL_COLUMN_GAP;
  drawDetailedTextSection(doc, leftX, contentY, layout.columnWidth, "Clause Extract", layout.clauseLines);
  drawDetailedTextSection(doc, rightX, contentY, layout.columnWidth, "Risk Explanation", layout.explanationLines);
  drawRecommendedClauseSection(doc, leftX, contentY + layout.twoColumnHeight + DETAIL_SECTION_GAP, layout.recommendedWidth, layout.recommendedLines);
}

function drawSplitDetailedRiskBlock(doc: jsPDF, reportModel: ReportModel, y: number, block: DetailedRiskBlock) {
  const sections: DetailedRiskSection[] = [
    { label: "Clause Extract", lines: wrapText(doc, quoteText(block.clauseExtract), DASHBOARD_WIDTH - DETAIL_BLOCK_PADDING * 2) },
    { label: "Risk Explanation", lines: wrapText(doc, block.riskExplanation, DASHBOARD_WIDTH - DETAIL_BLOCK_PADDING * 2) },
    { label: "Recommended Clause", lines: wrapText(doc, quoteText(block.recommendedClause), DASHBOARD_WIDTH - DETAIL_BLOCK_PADDING * 2 - 6), variant: "quote" }
  ];
  let currentY = y;
  let continued = false;

  sections.forEach((section) => {
    let lineOffset = 0;

    while (lineOffset < section.lines.length) {
      const titleLines = wrapText(doc, continued ? `${block.title} (continued)` : block.title, DASHBOARD_WIDTH - 34);
      const headerHeight = getDetailedHeaderHeight(titleLines.length);
      const availableForSection = DETAIL_PAGE_BOTTOM - currentY - headerHeight - DETAIL_BLOCK_PADDING - getDetailedChunkSectionChromeHeight(section);

      if (availableForSection < DETAIL_BODY_LINE_HEIGHT * 2) {
        doc.addPage();
        currentY = drawDetailedRiskAnalysisPageStart(doc, reportModel, true);
        continued = true;
        continue;
      }

      const linesPerPage = Math.max(1, Math.floor(availableForSection / DETAIL_BODY_LINE_HEIGHT));
      const lines = section.lines.slice(lineOffset, lineOffset + linesPerPage);
      const chunkHeight = getDetailedHeaderHeight(titleLines.length) + getDetailedStandaloneSectionHeight(lines, section.variant) + DETAIL_BLOCK_PADDING;

      if (currentY + chunkHeight > DETAIL_PAGE_BOTTOM) {
        doc.addPage();
        currentY = drawDetailedRiskAnalysisPageStart(doc, reportModel, true);
        continued = true;
        continue;
      }

      drawDetailedSectionChunk(doc, DASHBOARD_MARGIN, currentY, DASHBOARD_WIDTH, block, titleLines, section.label, lines, section.variant);
      currentY += chunkHeight + DETAIL_BLOCK_GAP;
      lineOffset += lines.length;
      continued = true;
    }
  });

  return currentY;
}

function drawDetailedSectionChunk(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  block: DetailedRiskBlock,
  titleLines: string[],
  label: string,
  lines: string[],
  variant?: "quote"
) {
  const headerHeight = getDetailedHeaderHeight(titleLines.length);
  const sectionHeight = getDetailedStandaloneSectionHeight(lines, variant);
  const totalHeight = headerHeight + sectionHeight + DETAIL_BLOCK_PADDING;
  drawDetailedBlockFrame(doc, x, y, width, totalHeight);
  const contentY = drawDetailedRiskHeader(doc, x, y, width, block, titleLines);
  const contentX = x + DETAIL_BLOCK_PADDING;
  const contentWidth = width - DETAIL_BLOCK_PADDING * 2;

  if (variant === "quote") {
    drawRecommendedClauseSection(doc, contentX, contentY, contentWidth, lines);
    return;
  }

  drawDetailedTextSection(doc, contentX, contentY, contentWidth, label, lines);
}

function drawDetailedBlockFrame(doc: jsPDF, x: number, y: number, width: number, height: number) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 1.2, 1.2, "FD");
}

function drawDetailedRiskHeader(doc: jsPDF, x: number, y: number, width: number, block: DetailedRiskBlock, titleLines: string[]) {
  const titleY = y + 5.9;
  const badgeWidth = block.severity === "Medium" ? 20 : 16.5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.1);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  drawWrappedText(doc, titleLines, x + DETAIL_BLOCK_PADDING, titleY, DETAIL_TITLE_LINE_HEIGHT);

  drawSeverityPill(doc, x + width - DETAIL_BLOCK_PADDING - badgeWidth, y + 3.8, badgeWidth, 6.7, block.severity);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  const metaY = titleY + titleLines.length * DETAIL_TITLE_LINE_HEIGHT + 0.85;
  doc.text(clampSingleLine(doc, block.meta, width - DETAIL_BLOCK_PADDING * 2), x + DETAIL_BLOCK_PADDING, metaY);

  return y + getDetailedHeaderHeight(titleLines.length);
}

function drawDetailedTextSection(doc: jsPDF, x: number, y: number, width: number, label: string, lines: string[]) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.text(label, x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  drawWrappedText(doc, lines, x, y + DETAIL_TEXT_BODY_OFFSET, DETAIL_BODY_LINE_HEIGHT);
}

function drawRecommendedClauseSection(doc: jsPDF, x: number, y: number, width: number, lines: string[]) {
  const height = getRecommendedClauseHeight(lines, width);

  doc.setFillColor(...hexToRgb(COLORS.lightBluePanel));
  doc.setDrawColor(...hexToRgb(COLORS.softBlueBorder));
  doc.setLineWidth(0.24);
  doc.roundedRect(x, y, width, height, 1.2, 1.2, "FD");
  doc.setDrawColor(...hexToRgb(COLORS.revisedBlue));
  doc.setLineWidth(0.8);
  doc.line(x + 3.1, y + 4.9, x + 3.1, y + height - 3.3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.text("Recommended Clause", x + DETAIL_RECOMMENDED_TEXT_X, y + DETAIL_RECOMMENDED_LABEL_Y);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.6);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  drawWrappedText(doc, lines, x + DETAIL_RECOMMENDED_TEXT_X, y + DETAIL_RECOMMENDED_BODY_Y, DETAIL_BODY_LINE_HEIGHT);
  doc.setFont("helvetica", "normal");
}

function getDetailedRiskBlockHeight(doc: jsPDF, block: DetailedRiskBlock, continued: boolean) {
  return getDetailedRiskBlockLayout(doc, block, continued, DASHBOARD_WIDTH).totalHeight;
}

function getDetailedRiskBlockLayout(doc: jsPDF, block: DetailedRiskBlock, continued: boolean, width: number): DetailedRiskBlockLayout {
  const titleWidth = width - 34;
  const titleLines = wrapText(doc, continued ? `${block.title} (continued)` : block.title, titleWidth);
  const headerHeight = getDetailedHeaderHeight(titleLines.length);
  const columnWidth = (width - DETAIL_BLOCK_PADDING * 2 - DETAIL_COLUMN_GAP) / 2;
  const clauseLines = wrapText(doc, quoteText(block.clauseExtract), columnWidth);
  const explanationLines = wrapText(doc, block.riskExplanation, columnWidth);
  const recommendedWidth = width - DETAIL_BLOCK_PADDING * 2;
  const recommendedLines = wrapText(doc, quoteText(block.recommendedClause), recommendedWidth - DETAIL_RECOMMENDED_TEXT_X - 2.4);
  const twoColumnHeight = Math.max(getDetailedSectionHeight(clauseLines), getDetailedSectionHeight(explanationLines));
  const recommendedHeight = getRecommendedClauseHeight(recommendedLines, recommendedWidth);
  const totalHeight = headerHeight + twoColumnHeight + DETAIL_SECTION_GAP + recommendedHeight + DETAIL_BLOCK_PADDING;

  return {
    titleLines,
    clauseLines,
    explanationLines,
    recommendedLines,
    headerHeight,
    columnWidth,
    recommendedWidth,
    twoColumnHeight,
    recommendedHeight,
    totalHeight
  };
}

function getDetailedHeaderHeight(titleLineCount: number) {
  return 9.9 + Math.max(1, titleLineCount) * DETAIL_TITLE_LINE_HEIGHT;
}

function getDetailedSectionHeight(lines: string[]) {
  return DETAIL_TEXT_BODY_OFFSET + Math.max(1, lines.length) * DETAIL_BODY_LINE_HEIGHT + DETAIL_TEXT_BOTTOM_PADDING;
}

function getRecommendedClauseHeight(lines: string[], _width: number) {
  return DETAIL_RECOMMENDED_BODY_Y + Math.max(1, lines.length) * DETAIL_BODY_LINE_HEIGHT + DETAIL_RECOMMENDED_BOTTOM_PADDING;
}

function getDetailedStandaloneSectionHeight(lines: string[], variant?: "quote") {
  return variant === "quote" ? getRecommendedClauseHeight(lines, DASHBOARD_WIDTH - DETAIL_BLOCK_PADDING * 2) : getDetailedSectionHeight(lines);
}

function getDetailedChunkSectionChromeHeight(section: DetailedRiskSection) {
  return section.variant === "quote" ? DETAIL_RECOMMENDED_BODY_Y + DETAIL_RECOMMENDED_BOTTOM_PADDING : DETAIL_TEXT_BODY_OFFSET + DETAIL_TEXT_BOTTOM_PADDING;
}

function getDetailedSeverity(value: unknown) {
  const severity = safeText(value);
  if (severity === "High" || severity === "Medium" || severity === "Low") return severity;
  return "";
}

function formatDetailedConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014";
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}% confidence`;
}

function combineRiskExplanation(whyItMatters: unknown, businessImpact: unknown) {
  const why = safeText(whyItMatters);
  const impact = safeText(businessImpact);
  const combined = [why, impact].filter(Boolean).join(" ");
  return combined || "This clause may create legal, financial, operational, or compliance exposure.";
}

function getMeaningfulFinalClause(row: FinalReviewRow) {
  const finalClause = safeText(row.finalClause);
  if (!finalClause || finalClause === "Awaiting decision" || finalClause === "Original retained") return "";
  return finalClause;
}

function quoteText(value: string) {
  const normalized = safeText(value);
  if (!normalized) return "";
  if (/^".*"$/.test(normalized)) return normalized;
  return `"${normalized}"`;
}

function getSummaryRiskRows(reportModel: ReportModel): SummaryRiskRow[] {
  const rowsByRiskId = new Map(reportModel.finalReviewRows.map((row) => [row.finding.riskId, row]));
  return reportModel.document.findings.map((finding, index) => ({
    finding,
    reviewRow: rowsByRiskId.get(finding.riskId),
    index
  }));
}

function getTopRiskDriverRows(rows: SummaryRiskRow[]) {
  return [...rows]
    .sort(
      (a, b) =>
        getSeverityRank(getRiskSeverity(b.finding)) - getSeverityRank(getRiskSeverity(a.finding)) ||
        getRiskConfidenceSortValue(b.finding) - getRiskConfidenceSortValue(a.finding)
    )
    .slice(0, 4);
}

function drawRiskDriverCards(doc: jsPDF, x: number, y: number, width: number, rows: SummaryRiskRow[]) {
  const drivers = getTopRiskDriverRows(rows);
  if (!drivers.length) return y;

  const columnGap = 5;
  const rowGap = 5;
  const cardWidth = (width - columnGap) / 2;
  const cardHeight = 44.5;

  drivers.forEach((row, index) => {
    const column = index % 2;
    const cardRow = Math.floor(index / 2);
    drawRiskDriverCard(doc, x + column * (cardWidth + columnGap), y + cardRow * (cardHeight + rowGap), cardWidth, cardHeight, row);
  });

  return y + Math.ceil(drivers.length / 2) * cardHeight + Math.max(0, Math.ceil(drivers.length / 2) - 1) * rowGap;
}

function drawRiskDriverCard(doc: jsPDF, x: number, y: number, width: number, height: number, row: SummaryRiskRow) {
  const finding = row.finding;
  const severity = getRiskSeverity(finding);
  const category = getRiskCategory(finding);
  const iconColor = getRiskCategoryIconColor(category);
  const badgeWidth = severity === "Medium" ? 19 : 15.5;
  const badgeX = x + width - badgeWidth - 4;
  const iconX = x + 8;
  const iconY = y + 8.7;
  const titleX = x + 14;
  const contentX = x + 5.4;
  const contentRight = x + width - 4;
  const titleWidth = Math.max(26, badgeX - titleX - 3);

  drawCard(doc, x, y, width, height, COLORS.white, true);

  drawRiskCategoryIcon(doc, category, iconX, iconY, iconColor, 0.62);
  drawSeverityPill(doc, badgeX, y + 4, badgeWidth, 6.6, severity);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.7);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  const titleLines = clampMeaningfulTextLines(doc, toSentenceCase(getRiskTitle(finding)), titleWidth, 2);
  drawWrappedText(doc, titleLines, titleX, y + 7.2, 3.65);

  let fieldY = y + (titleLines.length > 1 ? 16.2 : 12.9);
  const fieldWidth = contentRight - contentX;
  fieldY = drawRiskDriverField(doc, contentX, fieldY, fieldWidth, "Category", category, 1);
  fieldY = drawRiskDriverField(doc, contentX, fieldY, fieldWidth, "Issue", toSentenceCase(getRiskIssue(finding)), 2);
  fieldY = drawRiskDriverField(doc, contentX, fieldY, fieldWidth, "Impact", toSentenceCase(getRiskImpact(finding)), 2);
  drawRiskDriverField(doc, contentX, fieldY, fieldWidth, "Action", toSentenceCase(getRiskRecommendation(finding, row.reviewRow)), 2);
}

function drawRiskDriverField(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string,
  maxLines: number
) {
  const labelText = `${label}:`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.text(labelText, x, y);

  const labelWidth = 12.5;
  const valueX = x + labelWidth;
  const valueWidth = width - (valueX - x);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  const lines = clampMeaningfulTextLines(doc, value, valueWidth, maxLines);
  drawWrappedText(doc, lines, valueX, y, 3.35);
  return y + Math.max(1, lines.length) * 3.35 + 1;
}

function drawRiskCategoryIcon(doc: jsPDF, category: string, cx: number, cy: number, color: string, scale = 1) {
  const s = scale;
  doc.setDrawColor(...hexToRgb(color));
  doc.setTextColor(...hexToRgb(color));
  doc.setLineWidth(0.55 * s);

  if (category === "Financial") {
    doc.roundedRect(cx - 3.1 * s, cy - 4.1 * s, 6.2 * s, 8.2 * s, 0.8 * s, 0.8 * s, "S");
    doc.line(cx + 1.2 * s, cy - 4.1 * s, cx + 3.1 * s, cy - 2.2 * s);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4 * s);
    doc.text("$", cx - 1.5 * s, cy + 2.3 * s);
    return;
  }

  if (category === "Operational") {
    doc.circle(cx, cy, 4 * s, "S");
    doc.line(cx, cy, cx, cy - 2.4 * s);
    doc.line(cx, cy, cx + 2 * s, cy + 1.4 * s);
    return;
  }

  if (category === "Compliance") {
    doc.ellipse(cx, cy - 2.6 * s, 3.6 * s, 1.4 * s, "S");
    doc.line(cx - 3.6 * s, cy - 2.6 * s, cx - 3.6 * s, cy + 2.6 * s);
    doc.line(cx + 3.6 * s, cy - 2.6 * s, cx + 3.6 * s, cy + 2.6 * s);
    doc.ellipse(cx, cy + 2.6 * s, 3.6 * s, 1.4 * s, "S");
    doc.roundedRect(cx + 0.9 * s, cy + 0.1 * s, 3.6 * s, 3.2 * s, 0.5 * s, 0.5 * s, "S");
    doc.line(cx + 2.7 * s, cy + 0.1 * s, cx + 2.7 * s, cy - 1 * s);
    return;
  }

  if (category === "Technical") {
    doc.roundedRect(cx - 4 * s, cy - 3.2 * s, 8 * s, 5.8 * s, 0.7 * s, 0.7 * s, "S");
    doc.line(cx - 1.6 * s, cy + 4.1 * s, cx + 1.6 * s, cy + 4.1 * s);
    doc.line(cx, cy + 2.6 * s, cx, cy + 4.1 * s);
    return;
  }

  doc.line(cx, cy - 4.2 * s, cx + 3.6 * s, cy - 2.4 * s);
  doc.line(cx + 3.6 * s, cy - 2.4 * s, cx + 2.9 * s, cy + 2.6 * s);
  doc.line(cx + 2.9 * s, cy + 2.6 * s, cx, cy + 4.2 * s);
  doc.line(cx, cy + 4.2 * s, cx - 2.9 * s, cy + 2.6 * s);
  doc.line(cx - 2.9 * s, cy + 2.6 * s, cx - 3.6 * s, cy - 2.4 * s);
  doc.line(cx - 3.6 * s, cy - 2.4 * s, cx, cy - 4.2 * s);
  doc.line(cx, cy - 1.8 * s, cx, cy + 1.2 * s);
  doc.circle(cx, cy + 2.4 * s, 0.28 * s, "S");
}

function drawSummaryRiskRegister(doc: jsPDF, y: number, x: number, width: number, rows: SummaryRiskRow[]) {
  const columns = getSummaryRegisterColumns(width);
  let currentY = drawSummaryRegisterHeader(doc, x, y, columns);
  let pageBottom = getRegisterTableBottom();

  rows.forEach((row) => {
    const rowHeight = getSummaryRegisterRowHeight(doc, row, columns);

    if (currentY + rowHeight > pageBottom) {
      doc.addPage();
      currentY = drawRegisterContinuationPageStart(doc);
      currentY = drawSummaryRegisterHeader(doc, x, currentY, columns);
      pageBottom = getRegisterTableBottom();
    }

    drawSummaryRegisterRow(doc, x, currentY, columns, row);
    currentY += rowHeight;
  });
}

function getRegisterTableBottom() {
  return FOOTER_TOP - REGISTER_FOOTER_BUFFER;
}

function drawRegisterContinuationPageStart(doc: jsPDF) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");
  drawHeader(doc, 0, 0, A4_WIDTH, 18);
  drawSectionTitle(doc, "ALL IDENTIFIED RISKS — CONTINUED", DASHBOARD_MARGIN, 33);
  return 39;
}

function getSummaryRegisterColumns(width: number) {
  const numberWidth = 9;
  const categoryWidth = 24;
  const severityWidth = 22;
  const confidenceWidth = 24;
  const statusWidth = 20;
  const riskTitleWidth = width - numberWidth - categoryWidth - severityWidth - confidenceWidth - statusWidth;

  return [
    { label: "#", width: numberWidth, align: "center" },
    { label: "Risk Title", width: riskTitleWidth, align: "left" },
    { label: "Category", width: categoryWidth, align: "left" },
    { label: "Severity", width: severityWidth, align: "center" },
    { label: "Confidence", width: confidenceWidth, align: "center" },
    { label: "Status", width: statusWidth, align: "center" }
  ];
}

function drawSummaryRegisterHeader(
  doc: jsPDF,
  x: number,
  y: number,
  columns: Array<{ label: string; width: number; align: string }>
) {
  const height = 6.8;
  doc.setFillColor(...hexToRgb(COLORS.navy));
  doc.setDrawColor(...hexToRgb(COLORS.navy));
  doc.roundedRect(x, y, columns.reduce((sum, column) => sum + column.width, 0), height, 1.4, 1.4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.7);
  doc.setTextColor(...hexToRgb(COLORS.white));
  let currentX = x;
  columns.forEach((column, index) => {
    const textX = column.align === "center" ? currentX + column.width / 2 : currentX + 2.3;
    doc.text(column.label, textX, y + 4.5, { align: column.align === "center" ? "center" : "left" });
    if (index > 0) {
      doc.setDrawColor(77, 95, 124);
      doc.setLineWidth(0.2);
      doc.line(currentX, y, currentX, y + height);
    }
    currentX += column.width;
  });

  return y + height;
}

function getSummaryRegisterRowHeight(doc: jsPDF, row: SummaryRiskRow, columns: Array<{ label: string; width: number; align: string }>) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  const titleColumn = columns[1];
  const lineCount = clampTextLines(doc, getRiskTitle(row.finding), titleColumn.width - 4, 2).length;
  return lineCount > 1 ? 9.6 : 7.2;
}

function drawSummaryRegisterRow(
  doc: jsPDF,
  x: number,
  y: number,
  columns: Array<{ label: string; width: number; align: string }>,
  row: SummaryRiskRow
) {
  const height = getSummaryRegisterRowHeight(doc, row, columns);
  const fill = row.index % 2 === 0 ? COLORS.white : "#F9FAFB";
  const severity = getRiskSeverity(row.finding);

  doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.22);
  doc.rect(x, y, columns.reduce((sum, column) => sum + column.width, 0), height, "FD");

  let currentX = x;
  columns.forEach((column, index) => {
    if (index > 0) {
      doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
      doc.line(currentX, y, currentX, y + height);
    }
    currentX += column.width;
  });

  const values = [
    String(row.index + 1),
    getRiskTitle(row.finding),
    getRiskCategory(row.finding),
    severity,
    getRiskConfidenceLabel(row.finding),
    getRiskStatus(row)
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  currentX = x;

  values.forEach((value, index) => {
    const column = columns[index];
    if (index === 3) {
      drawSeverityPill(doc, currentX + (column.width - 15.2) / 2, y + height / 2 - 2.35, 15.2, 4.7, severity);
    } else if (index === 1) {
      const lines = clampTextLines(doc, value, column.width - 4, 2);
      drawWrappedText(doc, lines, currentX + 2.3, y + 4.5, 3.15);
    } else {
      const textX = column.align === "center" ? currentX + column.width / 2 : currentX + 2.3;
      doc.text(clampSingleLine(doc, value, column.width - 4), textX, y + height / 2 + 1.15, {
        align: column.align === "center" ? "center" : "left"
      });
    }
    currentX += column.width;
  });
}

function drawSeverityPill(doc: jsPDF, x: number, y: number, width: number, height: number, severity: string) {
  const color = getSeverityColor(severity);
  doc.setFillColor(...hexToRgb(tintColor(color)));
  doc.roundedRect(x, y, width, height, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.1);
  doc.setTextColor(...hexToRgb(color));
  doc.text(severity || "Unknown", x + width / 2, y + height / 2 + 1, { align: "center" });
}

function getRiskTitle(finding: NormalizedFinding) {
  return safeText(finding.riskTitle) || "Untitled risk";
}

function getRiskCategory(finding: NormalizedFinding) {
  return safeText(finding.category) || "Uncategorized";
}

function getRiskSeverity(finding: NormalizedFinding) {
  return safeText(finding.severity) || "Unknown";
}

function getRiskConfidence(finding: NormalizedFinding) {
  return typeof finding.confidence === "number" && Number.isFinite(finding.confidence) ? finding.confidence : null;
}

function getRiskConfidenceSortValue(finding: NormalizedFinding) {
  return getRiskConfidence(finding) ?? -1;
}

function getRiskConfidenceLabel(finding: NormalizedFinding) {
  const confidence = getRiskConfidence(finding);
  return confidence === null ? "—" : `${Math.round(confidence * 100)}%`;
}

function getRiskStatus(row: SummaryRiskRow) {
  const decision = safeText(row.reviewRow?.decision);
  if (!decision || decision === "Pending") return "Open";
  return decision;
}

function getRiskIssue(finding: NormalizedFinding) {
  return (
    safeText(finding.clauseSnippet) ||
    safeText(finding.flaggedText) ||
    safeText(finding.whyItMatters) ||
    getRiskTitle(finding) ||
    "Issue identified in the reviewed document."
  );
}

function getRiskImpact(finding: NormalizedFinding) {
  return safeText(finding.businessImpact) || "May create commercial, legal, or operational exposure.";
}

function getRiskRecommendation(finding: NormalizedFinding, row?: FinalReviewRow) {
  const finalClause = safeText(row?.finalClause);
  if (row?.decision === "Revised" && finalClause) return finalClause;
  return safeText(finding.originalRecommendedDraft) || "Review and revise before approval.";
}

function getRiskCategoryIconColor(category: string) {
  if (category === "Financial") return COLORS.highRed;
  if (category === "Operational") return COLORS.mediumAmber;
  if (category === "Compliance") return COLORS.lowGreen;
  if (category === "Technical") return COLORS.revisedBlue;
  if (category === "Legal") return COLORS.highRed;
  return COLORS.mutedText;
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

function clampMeaningfulTextLines(doc: jsPDF, value: string, maxWidth: number, maxLines: number) {
  const lines = wrapText(doc, value, maxWidth);
  if (lines.length <= maxLines) return lines;

  const visibleLines = lines.slice(0, maxLines);
  visibleLines[maxLines - 1] = addWordEllipsisToFit(doc, visibleLines[maxLines - 1], maxWidth);
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

function addWordEllipsisToFit(doc: jsPDF, value: string, maxWidth: number) {
  const ellipsis = "...";
  const normalized = safeText(value);
  const words = normalized.split(" ").filter(Boolean);
  let text = words.length > 1 ? words.join(" ") : normalized;

  while (words.length > 1 && doc.getTextWidth(`${text}${ellipsis}`) > maxWidth) {
    words.pop();
    text = words.join(" ");
  }

  if (doc.getTextWidth(`${text}${ellipsis}`) <= maxWidth) return text ? `${text}${ellipsis}` : ellipsis;
  return addEllipsisToFit(doc, normalized, maxWidth);
}

function toSentenceCase(value: string) {
  const normalized = safeText(value);
  if (!normalized) return normalized;

  const lowerCased = normalized
    .split(" ")
    .map((word, index) => {
      if (index === 0) return word.toLowerCase();
      if (/^[A-Z0-9&/-]{2,}$/.test(word)) return word;
      if (/[a-z][A-Z]/.test(word)) return word;
      return word.toLowerCase();
    })
    .join(" ");

  return `${lowerCased.charAt(0).toUpperCase()}${lowerCased.slice(1)}`;
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
