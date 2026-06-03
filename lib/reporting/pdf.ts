"use client";

import jsPDF from "jspdf";
import { getReportFileName } from "@/lib/reporting/metadata";
import { buildPdfReportModel } from "@/lib/reporting/pdf-model";
import type { ReportModel } from "@/lib/output-model";
import type { PdfDecision, PdfGapDecision, PdfGapReviewById, PdfReportModel } from "@/lib/reporting/pdf-model";

const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const DASHBOARD_MARGIN = 10;
const DASHBOARD_WIDTH = A4_WIDTH - DASHBOARD_MARGIN * 2;
const FOOTER_HEIGHT = 13.5;
const FOOTER_TOP = A4_HEIGHT - FOOTER_HEIGHT;
const REGISTER_FOOTER_BUFFER = 2.2;
const CARD_RADIUS = 1.8;
const BODY_LINE_HEIGHT = 5.2;
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
const FINAL_REVIEW_PAGE_BOTTOM = FOOTER_TOP - 4;
const FINAL_REVIEW_TABLE_HEADER_HEIGHT = 7.2;
const FINAL_REVIEW_TABLE_ROW_MIN_HEIGHT = 8.4;
const FINAL_REVIEW_TABLE_LINE_HEIGHT = 3.45;
const FINAL_REVIEW_TABLE_CELL_PADDING_X = 2.2;
const FINAL_REVIEW_TABLE_CELL_PADDING_Y = 2.6;
const PDF_OBJECT_URL_REVOKE_DELAY_MS = 60_000;
const PDF_POPUP_FALLBACK_DELAY_MS = 800;

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
  blueGrey: "#64748B",
  softIndigo: "#4F46E5",
  softIndigoPanel: "#EEF2FF",
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

type FinalReviewTableColumn = PdfTableColumn & {
  align?: "left" | "center";
};

type PdfSummaryRiskRow = PdfReportModel["summaryRisks"][number];
type PdfDetailedRiskRow = PdfReportModel["detailedRisks"][number];
type PdfDetailedGapRow = PdfReportModel["detailedGaps"][number];
type PdfFinalReviewRow = PdfReportModel["finalReview"]["rows"][number];
type PdfFinalReviewGapRow = PdfReportModel["finalReview"]["gapRows"][number];

export function downloadReportPdf(reportModel: ReportModel, gapReviewById: PdfGapReviewById = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pdfData = buildPdfReportModel(reportModel, gapReviewById);
  const documentModel = reportModel.document;
  drawExecutiveDashboardPage(doc, pdfData);

  if (pdfData.detailedGaps.length) {
    doc.addPage();
    drawDetailedGapAnalysisPages(doc, pdfData);
  }

  doc.addPage();
  drawRiskDriversSummaryPage(doc, pdfData);

  doc.addPage();
  drawDetailedRiskAnalysisPages(doc, pdfData);

  doc.addPage();
  drawFinalReviewPages(doc, pdfData);

  drawFooters(doc, pdfData);
  const pdfBlob = doc.output("blob");
  openPdfPreview(pdfBlob, getReportFileName(documentModel.documentName));
}

function openPdfPreview(pdfBlob: Blob, fileName: string) {
  const browserDocument = globalThis.document;
  const browserUrl = globalThis.URL;
  const browserWindow = globalThis.window;

  if (
    !browserDocument?.body ||
    typeof browserUrl?.createObjectURL !== "function" ||
    typeof browserUrl.revokeObjectURL !== "function" ||
    typeof browserWindow?.open !== "function"
  ) {
    return;
  }

  const objectUrl = browserUrl.createObjectURL(pdfBlob);
  const previewWindow = window.open(objectUrl, "_blank", "noopener,noreferrer");

  globalThis.setTimeout(() => {
    browserUrl.revokeObjectURL(objectUrl);
  }, PDF_OBJECT_URL_REVOKE_DELAY_MS);

  if (previewWindow !== null) return;

  globalThis.setTimeout(() => {
    if (browserDocument.visibilityState === "visible" && browserDocument.hasFocus()) {
      triggerPdfDownload(pdfBlob, fileName);
    }
  }, PDF_POPUP_FALLBACK_DELAY_MS);
}

function triggerPdfDownload(pdfBlob: Blob, fileName: string) {
  const browserDocument = globalThis.document;
  const browserUrl = globalThis.URL;

  if (!browserDocument?.body || typeof browserUrl?.createObjectURL !== "function" || typeof browserUrl.revokeObjectURL !== "function") return;

  const objectUrl = browserUrl.createObjectURL(pdfBlob);
  const link = browserDocument.createElement("a");
  link.href = objectUrl;
  link.download = sanitizePdfFileName(fileName);
  link.rel = "noopener";
  link.style.display = "none";

  browserDocument.body.appendChild(link);
  link.click();
  link.remove();

  globalThis.setTimeout(() => {
    browserUrl.revokeObjectURL(objectUrl);
  }, PDF_OBJECT_URL_REVOKE_DELAY_MS);
}

function sanitizePdfFileName(fileName: string) {
  const normalized = fileName
    .replace(/\.pdf$/i, "")
    .replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return `${normalized || "risk-analysis-results"}.pdf`;
}

function drawExecutiveDashboardPage(doc: jsPDF, pdfData: PdfReportModel) {
  const metadata = pdfData.metadata;
  const dashboard = pdfData.dashboard;

  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");

  drawHeader(doc, 0, 0, A4_WIDTH, 18);

  let y = 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19.5);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  const titleLines = clampTextLines(doc, metadata.documentTitle, DASHBOARD_WIDTH, 2);
  titleLines.forEach((line) => {
    doc.text(line, DASHBOARD_MARGIN, y);
    y += 7.5;
  });

  drawDivider(doc, DASHBOARD_MARGIN, y - 1.8, DASHBOARD_WIDTH);

  const metadataY = y + 2.2;
  const metadataItems = [
    { label: "Source", value: metadata.sourceLabel },
    { label: "Created", value: metadata.createdDateLabel },
    { label: "Received", value: metadata.receivedDateLabel },
    { label: "Generated", value: metadata.generatedDateLabel }
  ];
  drawMetadataStrip(doc, DASHBOARD_MARGIN, metadataY, DASHBOARD_WIDTH, 12, metadataItems);

  y = metadataY + 18;

  drawSectionTitle(doc, "DECISION SNAPSHOT", DASHBOARD_MARGIN, y);
  y += 5.2;
  const kpiGap = 4;
  const kpiWidth = (DASHBOARD_WIDTH - kpiGap * 3) / 4;
  const kpiCards = [
    { label: "Overall Decision", value: dashboard.overallDecision, color: getDecisionColor(dashboard.overallDecision), fill: COLORS.softAmber },
    { label: "Overall Risk", value: dashboard.overallRisk ?? "Not available", color: getSeverityColor(dashboard.overallRisk), fill: COLORS.softRed },
    { label: "Total Risks", value: String(dashboard.totalRisks), color: COLORS.navy, fill: COLORS.softBlueGrey },
    { label: "Total Gaps", value: String(dashboard.gapSummary.total), color: COLORS.softIndigo, fill: COLORS.softIndigoPanel }
  ];
  kpiCards.forEach((item, index) => {
    drawKpiCard(doc, DASHBOARD_MARGIN + index * (kpiWidth + kpiGap), y, kpiWidth, 16, item.label, item.value, item.color, item.fill);
  });

  y += 20;
  const rowGap = 5;
  const leftWidth = 86;
  const rightWidth = DASHBOARD_WIDTH - leftWidth - rowGap;
  drawSeverityMixCard(doc, DASHBOARD_MARGIN, y, leftWidth, 45, dashboard);
  drawCategoryBreakdown(doc, DASHBOARD_MARGIN + leftWidth + rowGap, y, rightWidth, 45, dashboard.categoryBreakdown, dashboard.totalRisks);

  y += 53.5;
  drawInfoCard(
    doc,
    DASHBOARD_MARGIN,
    y,
    DASHBOARD_WIDTH,
    26.5,
    "INSIGHT",
    dashboard.insight,
    COLORS.lightBluePanel
  );
  y += 32.5;
  drawInfoCard(
    doc,
    DASHBOARD_MARGIN,
    y,
    DASHBOARD_WIDTH,
    34,
    "EXECUTIVE SUMMARY",
    dashboard.executiveSummary,
    COLORS.lightBluePanel
  );

  y += 46.5;
  drawDivider(doc, DASHBOARD_MARGIN, y - 5.8, DASHBOARD_WIDTH);
  drawSectionTitle(doc, "TOP ACTIONS / RECOMMENDED PRIORITIES", DASHBOARD_MARGIN, y);
  y += 4.5;
  const actionsHeight = drawTopActions(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, dashboard.topActions);

  y += actionsHeight + 6.5;
  drawGapAnalysisSummarySection(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, dashboard.gapSummary);
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

function drawFooter(doc: jsPDF, pageNumber: number, totalPages: number, footer?: PdfReportModel["footer"]) {
  doc.setTextColor(...hexToRgb(COLORS.mutedText));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);
  doc.text(footer?.left ?? "Confidential", DASHBOARD_MARGIN, FOOTER_TOP + 7.9);
  doc.setFontSize(7.8);
  doc.text(footer?.center ?? "For internal review and decision support", A4_WIDTH / 2, FOOTER_TOP + 7.9, {
    align: "center"
  });
  doc.setFontSize(8.2);
  const pageText = `Page ${pageNumber} of ${totalPages}`;
  doc.text(pageText, DASHBOARD_MARGIN + DASHBOARD_WIDTH - doc.getTextWidth(pageText), FOOTER_TOP + 7.9);
}

function drawFooters(doc: jsPDF, pdfData: PdfReportModel) {
  const pageCount = doc.getNumberOfPages();
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    doc.setPage(pageNumber);
    drawFooter(doc, pageNumber, pageCount, pageNumber === 2 ? pdfData.footer : undefined);
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
  doc.text(label, textCenterX, y + 6.2, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...hexToRgb(valueColor));
  const isNumericValue = /^\d+$/.test(value);

  if (isNumericValue) {
    doc.setFontSize(14.8);
    doc.text(value, textCenterX, y + 13.7, { align: "center" });
    return;
  }

  doc.setFontSize(10);
  const valueLines = clampTextLines(doc, value, textWidth, 2);
  if (valueLines.length === 1) {
    doc.text(valueLines[0], textCenterX, y + 13.4, { align: "center" });
    return;
  }

  doc.text(valueLines[0], textCenterX, y + 11.2, { align: "center" });
  doc.text(valueLines[1], textCenterX, y + 14.5, { align: "center" });
}

function drawInfoCard(doc: jsPDF, x: number, y: number, width: number, height: number, title: string, body: string | null, background: string) {
  drawCard(doc, x, y, width, height, background, true);
  drawCardIcon(doc, title, x + 9.5, y + 9.4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.3);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  doc.text(title, x + 19, y + 9.8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.6);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  const lineHeight = 5.15;
  const bodyY = y + 16.4;
  const maxLines = Math.max(2, Math.floor((height - 16.5) / lineHeight) + 1);
  const lines = clampTextLines(doc, body ?? "", width - 25, maxLines);
  drawWrappedText(doc, lines, x + 19, bodyY, lineHeight);
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

  if (label === "Total Gaps") {
    doc.roundedRect(cx - 2.35, cy - 2.65, 4.7, 5.3, 0.55, 0.55, "S");
    doc.line(cx - 1.2, cy - 1.1, cx + 1.25, cy - 1.1);
    doc.line(cx - 1.2, cy + 0.1, cx + 0.25, cy + 0.1);
    doc.line(cx, cy + 0.95, cx, cy + 2.05);
    doc.line(cx - 0.55, cy + 1.5, cx + 0.55, cy + 1.5);
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

function drawSeverityMixCard(doc: jsPDF, x: number, y: number, width: number, height: number, dashboard: PdfReportModel["dashboard"]) {
  drawCard(doc, x, y, width, height, COLORS.white, true);
  drawSectionTitle(doc, "RISK SEVERITY MIX", x + 3, y + 8);

  const severities = ["High", "Medium", "Low"] as const;
  severities.forEach((severity, index) => {
    const count = getPdfSeverityMixCount(dashboard.severityMix, severity);
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

function drawCategoryBreakdown(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  items: PdfReportModel["dashboard"]["categoryBreakdown"],
  totalRisks: number
) {
  drawCard(doc, x, y, width, height, COLORS.white, true);
  drawSectionTitle(doc, "RISK CATEGORY BREAKDOWN", x + 3, y + 8);

  const visibleItems = items.slice(0, 5);
  drawDonutChart(doc, x + 24.5, y + 27.2, 11.8, 5.2, visibleItems, totalRisks);

  visibleItems.forEach((item, index) => {
    const rowY = y + 15.8 + index * 6.6;
    drawBadge(doc, x + 48, rowY - 2.8, 3, getCategoryColor(index));
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.3);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    doc.text(clampSingleLine(doc, item.category, 31), x + 54, rowY);
    const value = `${item.count} (${formatPercentage(item.percentage)})`;
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
  items: Array<{ count: number }>,
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
  const visibleActions = actions.filter(Boolean).slice(0, 4);

  const columnGap = 4;
  const rowGap = 2.5;
  const cardWidth = (width - columnGap) / 2;
  const cardHeight = 15.5;

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
  doc.text(String(index), x + 4.4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.7);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  const textX = x + 11.2;
  const lines = clampTextLines(doc, action, width - 15.2, 2);
  drawWrappedText(doc, lines, textX, y + 6.8, 4.05);
}

function drawDecisionWarningStrip(doc: jsPDF, x: number, y: number, width: number, height: number, pendingCount: number, statusMessage: string) {
  const hasPending = pendingCount > 0;
  const fill = hasPending ? COLORS.softRed : COLORS.softGreen;
  const color = hasPending ? COLORS.highRed : COLORS.lowGreen;

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
  doc.text(statusMessage, x + 43, y + height / 2 + 1.4);
}

function drawGapAnalysisSummarySection(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  summary: PdfReportModel["dashboard"]["gapSummary"]
) {
  drawSectionTitle(doc, "GAP ANALYSIS SUMMARY", x, y);

  if (summary.total <= 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.7);
    doc.setTextColor(...hexToRgb(COLORS.darkText));
    doc.text("No significant gaps identified.", x, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.1);
    doc.setTextColor(...hexToRgb(COLORS.mutedText));
    const support = "The document appears to contain the key elements typically expected for this document type.";
    doc.text(clampSingleLine(doc, support, width), x, y + 11);
    return;
  }

  const countItems = [
    { label: "Must Add", count: summary.mustAdd, color: COLORS.highRed, fill: COLORS.softRed },
    { label: "Negotiate", count: summary.negotiate, color: COLORS.mediumAmber, fill: COLORS.softAmber },
    { label: "Optional", count: summary.optional, color: COLORS.mutedText, fill: COLORS.softBlueGrey }
  ];
  let pillX = x;

  countItems.forEach((item) => {
    const text = `${item.label} (${item.count})`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.3);
    const pillWidth = doc.getTextWidth(text) + 9.4;
    drawGapSummaryPill(doc, pillX, y + 6.4, pillWidth, text, item.color, item.fill);
    pillX += pillWidth + 3.5;
  });
}

function drawGapSummaryPill(doc: jsPDF, x: number, y: number, width: number, text: string, color: string, fill: string) {
  doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(...hexToRgb(color));
  doc.setLineWidth(0.24);
  doc.roundedRect(x, y, width, 8.2, 1.6, 1.6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.3);
  doc.setTextColor(...hexToRgb(color));
  doc.text(text, x + 4.7, y + 5.5);
}

function drawRiskDriversSummaryPage(doc: jsPDF, pdfData: PdfReportModel) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");
  drawHeader(doc, 0, 0, A4_WIDTH, 18);

  let y = drawReportTitleAndMetadata(doc, pdfData.metadata);
  y += 3.5;

  drawSectionTitle(doc, "KEY RISK DRIVERS (TOP 4)", DASHBOARD_MARGIN, y);
  y += 4.5;
  y = drawRiskDriverCards(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, pdfData.summaryRisks);

  y += 8;
  drawSectionTitle(doc, "ALL IDENTIFIED RISKS (SUMMARY REGISTER)", DASHBOARD_MARGIN, y);
  y += 4.2;
  drawSummaryRiskRegister(doc, y, DASHBOARD_MARGIN, DASHBOARD_WIDTH, pdfData.summaryRisks);
}

function drawReportTitleAndMetadata(doc: jsPDF, metadata: PdfReportModel["metadata"]) {
  let y = 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19.5);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  const titleLines = clampTextLines(doc, metadata.documentTitle, DASHBOARD_WIDTH, 2);
  titleLines.forEach((line) => {
    doc.text(line, DASHBOARD_MARGIN, y);
    y += 7.5;
  });

  drawDivider(doc, DASHBOARD_MARGIN, y - 1.8, DASHBOARD_WIDTH);

  const metadataY = y + 2.2;
  drawMetadataStrip(doc, DASHBOARD_MARGIN, metadataY, DASHBOARD_WIDTH, 12, [
    { label: "Source", value: metadata.sourceLabel },
    { label: "Created", value: metadata.createdDateLabel },
    { label: "Received", value: metadata.receivedDateLabel },
    { label: "Generated", value: metadata.generatedDateLabel }
  ]);

  return metadataY + 18;
}

function drawReportTitleOnly(doc: jsPDF, metadata: PdfReportModel["metadata"]) {
  let y = 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19.5);
  doc.setTextColor(...hexToRgb(COLORS.navy));
  const titleLines = clampTextLines(doc, metadata.documentTitle, DASHBOARD_WIDTH, 2);
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
  accentColor?: string;
  leftLabel: string;
  rightLabel: string;
  clauseExtract: string;
  riskExplanation: string;
  recommendedClause: string;
  preserveRecommendedParagraphs?: boolean;
  headerBottomGap?: number;
  sectionGap?: number;
  blockGap?: number;
  containText?: boolean;
};

type DetailedRiskSection = {
  label: string;
  lines: string[];
  variant?: "quote";
  width?: number;
  xOffset?: number;
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
  sectionGap: number;
  totalHeight: number;
};

function drawDetailedGapAnalysisPages(doc: jsPDF, pdfData: PdfReportModel) {
  if (!pdfData.detailedGaps.length) return;

  let y = drawDetailedGapAnalysisPageStart(doc, pdfData.metadata, false);

  pdfData.detailedGaps.forEach((gap) => {
    const block = buildDetailedGapBlock(gap);
    y = drawDetailedBlockWithPagination(doc, pdfData.metadata, y, block, drawDetailedGapAnalysisPageStart);
  });
}

function drawDetailedGapAnalysisPageStart(doc: jsPDF, metadata: PdfReportModel["metadata"], continued: boolean) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");
  drawHeader(doc, 0, 0, A4_WIDTH, 18);

  let y = drawReportTitleOnly(doc, metadata);

  drawGapSectionHeading(doc, continued ? "DETAILED GAP ANALYSIS (CONTINUED)" : "DETAILED GAP ANALYSIS", y);
  y += 6.2;

  return y;
}

function buildDetailedGapBlock(gap: PdfDetailedGapRow): DetailedRiskBlock {
  return {
    title: `Gap ${gap.number}: ${gap.title}`,
    meta: `Action: ${gap.action}   |   Category: ${gap.category}   |   AI Confidence: ${gap.confidenceLabel}`,
    severity: gap.impactLabel,
    accentColor: getGapActionColor(gap.action),
    leftLabel: "Why This Matters",
    rightLabel: "Suggested Fix",
    clauseExtract: gap.whyThisMatters ?? "Gap rationale not available.",
    riskExplanation: gap.suggestedFix ?? "Suggested fix not available.",
    recommendedClause: gap.recommendedClause ?? "Recommended clause not available.",
    preserveRecommendedParagraphs: true,
    headerBottomGap: 2.3,
    sectionGap: 1.4,
    blockGap: 5,
    containText: true
  };
}

function drawGapSectionHeading(doc: jsPDF, title: string, y: number) {
  drawSectionTitle(doc, title, DASHBOARD_MARGIN, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.1);
  const titleWidth = doc.getTextWidth(title);

  const minLegendX = DASHBOARD_MARGIN + titleWidth + 8;
  const maxLegendWidth = DASHBOARD_MARGIN + DASHBOARD_WIDTH - minLegendX;
  drawGapAccentLegend(doc, minLegendX, y, maxLegendWidth);
}

function drawGapAccentLegend(doc: jsPDF, minX: number, y: number, maxWidth: number) {
  if (maxWidth < 38) return;

  const items = [
    { label: "Must Add", color: getGapActionColor("Must Add") },
    { label: "Negotiate", color: getGapActionColor("Negotiate") },
    { label: "Optional", color: getGapActionColor("Optional") }
  ];
  const separator = "\u2022";
  let fontSize = 7.2;
  let itemGap = 3.8;
  let separatorGap = 3.1;
  let barWidth = 0.8;
  let barHeight = 4.4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  let legendWidth = getGapAccentLegendWidth(doc, items, separator, itemGap, separatorGap, barWidth);
  if (legendWidth > maxWidth) {
    fontSize = 6.5;
    itemGap = 2.8;
    separatorGap = 2.2;
    barHeight = 4;
    doc.setFontSize(fontSize);
    legendWidth = getGapAccentLegendWidth(doc, items, separator, itemGap, separatorGap, barWidth);
  }

  if (legendWidth > maxWidth) return;

  let x = DASHBOARD_MARGIN + DASHBOARD_WIDTH - legendWidth;
  x = Math.max(minX, x);

  items.forEach((item, index) => {
    doc.setFillColor(...hexToRgb(item.color));
    doc.rect(x, y - barHeight + 0.55, barWidth, barHeight, "F");
    x += barWidth + 1.45;

    doc.setTextColor(...hexToRgb(COLORS.mutedText));
    doc.text(item.label, x, y);
    x += doc.getTextWidth(item.label);

    if (index < items.length - 1) {
      x += separatorGap;
      doc.text(separator, x, y);
      x += doc.getTextWidth(separator) + itemGap;
    }
  });
}

function getGapAccentLegendWidth(
  doc: jsPDF,
  items: Array<{ label: string }>,
  separator: string,
  itemGap: number,
  separatorGap: number,
  barWidth: number
) {
  return items.reduce((width, item, index) => {
    const itemWidth = barWidth + 1.45 + doc.getTextWidth(item.label);
    if (index === items.length - 1) return width + itemWidth;
    return width + itemWidth + separatorGap + doc.getTextWidth(separator) + itemGap;
  }, 0);
}

function drawDetailedRiskAnalysisPages(doc: jsPDF, pdfData: PdfReportModel) {
  let y = drawDetailedRiskAnalysisPageStart(doc, pdfData.metadata, false);

  if (!pdfData.detailedRisks.length) {
    drawEmptyDetailedRiskState(doc, y);
    return;
  }

  pdfData.detailedRisks.forEach((risk) => {
    const block = buildDetailedRiskBlock(risk);
    y = drawDetailedRiskBlockWithPagination(doc, pdfData.metadata, y, block);
  });
}

function drawDetailedRiskAnalysisPageStart(doc: jsPDF, metadata: PdfReportModel["metadata"], continued: boolean) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");
  drawHeader(doc, 0, 0, A4_WIDTH, 18);

  let y = drawReportTitleOnly(doc, metadata);

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

function buildDetailedRiskBlock(risk: PdfDetailedRiskRow): DetailedRiskBlock {
  return {
    title: `Risk ${risk.number}: ${risk.title}`,
    meta: `${risk.sectionLabel}${DETAIL_META_SEPARATOR}${risk.category}${DETAIL_META_SEPARATOR}${risk.confidenceLabel}`,
    severity: risk.severityLabel,
    leftLabel: "Clause Extract",
    rightLabel: "Risk Explanation",
    clauseExtract: risk.clauseExtract ?? "Clause evidence not available.",
    riskExplanation: risk.riskExplanation ?? "Risk explanation not available.",
    recommendedClause: risk.recommendedClause ?? "Recommended clause not available."
  };
}

function drawDetailedRiskBlockWithPagination(doc: jsPDF, metadata: PdfReportModel["metadata"], y: number, block: DetailedRiskBlock) {
  return drawDetailedBlockWithPagination(doc, metadata, y, block, drawDetailedRiskAnalysisPageStart);
}

function drawDetailedBlockWithPagination(
  doc: jsPDF,
  metadata: PdfReportModel["metadata"],
  y: number,
  block: DetailedRiskBlock,
  drawPageStart: (doc: jsPDF, metadata: PdfReportModel["metadata"], continued: boolean) => number
) {
  const fullHeight = getDetailedRiskBlockHeight(doc, block, false);
  const freshPageY = getDetailedPageContentStartY(doc, metadata);

  if (y + fullHeight <= DETAIL_PAGE_BOTTOM) {
    drawDetailedRiskBlock(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, block, false);
    return y + fullHeight + getDetailedBlockGap(block);
  }

  if (freshPageY + fullHeight > DETAIL_PAGE_BOTTOM) {
    return drawSplitDetailedRiskBlock(doc, metadata, y, block, drawPageStart);
  }

  doc.addPage();
  y = drawPageStart(doc, metadata, true);

  if (y + fullHeight <= DETAIL_PAGE_BOTTOM) {
    drawDetailedRiskBlock(doc, DASHBOARD_MARGIN, y, DASHBOARD_WIDTH, block, false);
    return y + fullHeight + getDetailedBlockGap(block);
  }

  return drawSplitDetailedRiskBlock(doc, metadata, y, block, drawPageStart);
}

function getDetailedPageContentStartY(doc: jsPDF, metadata: PdfReportModel["metadata"]) {
  const titleLines = clampTextLines(doc, metadata.documentTitle, DASHBOARD_WIDTH, 2);
  return 32 + titleLines.length * 7.5 + 4.6 + 6.2;
}

function drawDetailedRiskBlock(doc: jsPDF, x: number, y: number, width: number, block: DetailedRiskBlock, continued: boolean) {
  const layout = getDetailedRiskBlockLayout(doc, block, continued, width);

  drawDetailedBlockFrame(doc, x, y, width, layout.totalHeight, block.accentColor);
  const contentY = drawDetailedRiskHeader(doc, x, y, width, block, layout.titleLines);
  const leftX = x + DETAIL_BLOCK_PADDING;
  const rightX = leftX + layout.columnWidth + DETAIL_COLUMN_GAP;
  drawDetailedTextSection(doc, leftX, contentY, layout.columnWidth, block.leftLabel, layout.clauseLines);
  drawDetailedTextSection(doc, rightX, contentY, layout.columnWidth, block.rightLabel, layout.explanationLines);
  drawRecommendedClauseSection(doc, leftX, contentY + layout.twoColumnHeight + layout.sectionGap, layout.recommendedWidth, layout.recommendedLines);
}

function drawSplitDetailedRiskBlock(
  doc: jsPDF,
  metadata: PdfReportModel["metadata"],
  y: number,
  block: DetailedRiskBlock,
  drawPageStart: (doc: jsPDF, metadata: PdfReportModel["metadata"], continued: boolean) => number
) {
  const splitContentWidth = DASHBOARD_WIDTH - DETAIL_BLOCK_PADDING * 2;
  const splitColumnWidth = block.containText ? (DASHBOARD_WIDTH - DETAIL_BLOCK_PADDING * 2 - DETAIL_COLUMN_GAP) / 2 : splitContentWidth;
  const sections: DetailedRiskSection[] = [
    { label: block.leftLabel, lines: getDetailedBodyLines(doc, block, quoteText(block.clauseExtract), splitColumnWidth), width: splitColumnWidth },
    {
      label: block.rightLabel,
      lines: getDetailedBodyLines(doc, block, block.riskExplanation, splitColumnWidth),
      width: splitColumnWidth,
      xOffset: block.containText ? splitColumnWidth + DETAIL_COLUMN_GAP : 0
    },
    {
      label: "Recommended Clause",
      lines: getRecommendedClauseLines(doc, block, splitContentWidth - 6),
      variant: "quote",
      width: splitContentWidth
    }
  ];
  let currentY = y;
  let continued = false;

  sections.forEach((section) => {
    let lineOffset = 0;

    while (lineOffset < section.lines.length) {
      const titleLines = getDetailedTitleLines(doc, block, continued ? `${block.title} (continued)` : block.title, DASHBOARD_WIDTH - 34);
      const headerHeight = getDetailedBlockHeaderHeight(block, titleLines.length);
      const availableForSection = DETAIL_PAGE_BOTTOM - currentY - headerHeight - DETAIL_BLOCK_PADDING - getDetailedChunkSectionChromeHeight(section);

      if (availableForSection < DETAIL_BODY_LINE_HEIGHT * 2) {
        doc.addPage();
        currentY = drawPageStart(doc, metadata, true);
        continued = true;
        continue;
      }

      const linesPerPage = Math.max(1, Math.floor(availableForSection / DETAIL_BODY_LINE_HEIGHT));
      const lines = section.lines.slice(lineOffset, lineOffset + linesPerPage);
      const chunkHeight =
        getDetailedBlockHeaderHeight(block, titleLines.length) + getDetailedStandaloneSectionHeight(lines, section.variant) + DETAIL_BLOCK_PADDING;

      if (currentY + chunkHeight > DETAIL_PAGE_BOTTOM) {
        doc.addPage();
        currentY = drawPageStart(doc, metadata, true);
        continued = true;
        continue;
      }

      drawDetailedSectionChunk(
        doc,
        DASHBOARD_MARGIN,
        currentY,
        DASHBOARD_WIDTH,
        block,
        titleLines,
        section.label,
        lines,
        section.variant,
        section.width,
        section.xOffset
      );
      currentY += chunkHeight + getDetailedBlockGap(block);
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
  variant?: "quote",
  sectionWidth?: number,
  sectionXOffset = 0
) {
  const headerHeight = getDetailedBlockHeaderHeight(block, titleLines.length);
  const sectionHeight = getDetailedStandaloneSectionHeight(lines, variant);
  const totalHeight = headerHeight + sectionHeight + DETAIL_BLOCK_PADDING;
  drawDetailedBlockFrame(doc, x, y, width, totalHeight, block.accentColor);
  const contentY = drawDetailedRiskHeader(doc, x, y, width, block, titleLines);
  const contentX = x + DETAIL_BLOCK_PADDING;
  const contentWidth = width - DETAIL_BLOCK_PADDING * 2;
  const drawX = contentX + sectionXOffset;
  const drawWidth = sectionWidth ?? contentWidth;

  if (variant === "quote") {
    drawRecommendedClauseSection(doc, drawX, contentY, drawWidth, lines);
    return;
  }

  drawDetailedTextSection(doc, drawX, contentY, drawWidth, label, lines);
}

function drawDetailedBlockFrame(doc: jsPDF, x: number, y: number, width: number, height: number, accentColor?: string) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.25);
  doc.roundedRect(x, y, width, height, 1.2, 1.2, "FD");

  if (accentColor) {
    doc.setDrawColor(...hexToRgb(accentColor));
    doc.setLineWidth(0.7);
    doc.line(x + 2.7, y + 3.4, x + 2.7, y + height - 3.4);
  }
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

  return y + getDetailedBlockHeaderHeight(block, titleLines.length);
}

function drawDetailedTextSection(doc: jsPDF, x: number, y: number, _width: number, label: string, lines: string[]) {
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
  const titleLines = getDetailedTitleLines(doc, block, continued ? `${block.title} (continued)` : block.title, titleWidth);
  const headerHeight = getDetailedBlockHeaderHeight(block, titleLines.length);
  const columnWidth = (width - DETAIL_BLOCK_PADDING * 2 - DETAIL_COLUMN_GAP) / 2;
  const clauseLines = getDetailedBodyLines(doc, block, quoteText(block.clauseExtract), columnWidth);
  const explanationLines = getDetailedBodyLines(doc, block, block.riskExplanation, columnWidth);
  const recommendedWidth = width - DETAIL_BLOCK_PADDING * 2;
  const recommendedLines = getRecommendedClauseLines(doc, block, recommendedWidth - DETAIL_RECOMMENDED_TEXT_X - 2.4);
  const twoColumnHeight = Math.max(getDetailedSectionHeight(clauseLines), getDetailedSectionHeight(explanationLines));
  const recommendedHeight = getRecommendedClauseHeight(recommendedLines, recommendedWidth);
  const sectionGap = getDetailedSectionGap(block);
  const totalHeight = headerHeight + twoColumnHeight + sectionGap + recommendedHeight + DETAIL_BLOCK_PADDING;

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
    sectionGap,
    totalHeight
  };
}

function getRecommendedClauseLines(doc: jsPDF, block: DetailedRiskBlock, maxWidth: number) {
  if (block.preserveRecommendedParagraphs) {
    if (block.containText) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.6);
    }
    return wrapMultilineText(doc, quoteMultilineText(block.recommendedClause), maxWidth, block.containText);
  }

  return wrapText(doc, quoteText(block.recommendedClause), maxWidth);
}

function getDetailedTitleLines(doc: jsPDF, block: DetailedRiskBlock, value: string, maxWidth: number) {
  if (block.containText) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.1);
    return wrapContainedText(doc, value, maxWidth);
  }

  return wrapText(doc, value, maxWidth);
}

function getDetailedBodyLines(doc: jsPDF, block: DetailedRiskBlock, value: string, maxWidth: number) {
  if (block.containText) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.6);
    return wrapContainedText(doc, value, maxWidth);
  }
  return wrapText(doc, value, maxWidth);
}

function getDetailedHeaderHeight(titleLineCount: number) {
  return 9.9 + Math.max(1, titleLineCount) * DETAIL_TITLE_LINE_HEIGHT;
}

function getDetailedBlockHeaderHeight(block: DetailedRiskBlock, titleLineCount: number) {
  return getDetailedHeaderHeight(titleLineCount) + (block.headerBottomGap ?? 0);
}

function getDetailedSectionGap(block: DetailedRiskBlock) {
  return block.sectionGap ?? DETAIL_SECTION_GAP;
}

function getDetailedBlockGap(block: DetailedRiskBlock) {
  return block.blockGap ?? DETAIL_BLOCK_GAP;
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

function drawFinalReviewPages(doc: jsPDF, pdfData: PdfReportModel) {
  let y = drawFinalReviewPageStart(doc, pdfData.metadata, "FINAL REVIEW");
  y = drawRecommendedDecisionHero(doc, y, pdfData.finalReview);
  y += 8.2;

  const gapRows = pdfData.finalReview.gapRows;
  if (gapRows.length) {
    y = drawFinalReviewSectionHeading(doc, pdfData.metadata, y, "GAP REVIEW SUMMARY");
    y = drawFinalReviewGapSummaryTable(doc, pdfData.metadata, gapRows, y);
    y += 7.2;
  }

  y = drawFinalReviewSectionHeading(doc, pdfData.metadata, y, "RISK REVIEW SUMMARY");
  drawFinalReviewSummaryTable(doc, pdfData.metadata, pdfData.finalReview.rows, y);
}

function drawFinalReviewPageStart(doc: jsPDF, metadata: PdfReportModel["metadata"], sectionTitle: string) {
  doc.setFillColor(...hexToRgb(COLORS.white));
  doc.rect(0, 0, A4_WIDTH, A4_HEIGHT, "F");
  drawHeader(doc, 0, 0, A4_WIDTH, 18);

  let y = drawReportTitleAndMetadata(doc, metadata);
  y += 3.8;
  drawSectionTitle(doc, sectionTitle, DASHBOARD_MARGIN, y);

  return y + 5.5;
}

function drawRecommendedDecisionHero(
  doc: jsPDF,
  y: number,
  finalReview: PdfReportModel["finalReview"]
) {
  const decision = finalReview.decision;
  const counts = finalReview.counts;
  const gapCounts = finalReview.gapCounts;
  const color = getDecisionColor(decision);
  const isHold = decision === "Hold for Review" || decision === "Reject";
  const fill = isHold ? COLORS.softAmber : decision === "Approve" ? COLORS.softGreen : COLORS.lightBluePanel;
  const height = 17.5;
  const x = DASHBOARD_MARGIN;
  const width = DASHBOARD_WIDTH;
  const contentX = x + 9;
  const contentWidth = width - 18;
  const columnGap = 6;
  const columnWidth = (contentWidth - columnGap * 2) / 3;
  const titleY = y + 5.6;
  const dataY = y + 13;

  doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(...hexToRgb(tintColor(color)));
  doc.setLineWidth(0.32);
  doc.roundedRect(x, y, width, height, 1.8, 1.8, "FD");

  const columns = [
    {
      title: "Decision Summary",
      value: decision,
      valueColor: color
    },
    {
      title: "Gap Review Summary",
      value: `Accepted ${gapCounts.Accepted} \u2022 Rejected ${gapCounts.Rejected} \u2022 Pending ${gapCounts.Pending}`,
      valueColor: COLORS.mutedText
    },
    {
      title: "Risk Review Summary",
      value: `Revised ${counts.revised} \u2022 Accepted ${counts.accepted} \u2022 Pending ${counts.pending}`,
      valueColor: COLORS.mutedText
    }
  ];

  columns.forEach((column, index) => {
    const columnX = contentX + index * (columnWidth + columnGap);

    if (index > 0) {
      const separatorX = columnX - columnGap / 2;
      doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
      doc.setLineWidth(0.25);
      doc.line(separatorX, y + 3.2, separatorX, y + height - 3.2);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.setTextColor(...hexToRgb(COLORS.navy));
    doc.text(column.title, columnX, titleY);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(index === 0 ? 10.8 : 7.9);
    doc.setTextColor(...hexToRgb(column.valueColor));
    doc.text(clampSingleLine(doc, column.value, columnWidth), columnX, dataY);
  });

  return y + height;
}

function drawDecisionAlertIcon(doc: jsPDF, cx: number, cy: number, color: string) {
  doc.setDrawColor(...hexToRgb(color));
  doc.setLineWidth(0.48);
  doc.line(cx, cy - 2.7, cx - 2.6, cy + 1.9);
  doc.line(cx - 2.6, cy + 1.9, cx + 2.6, cy + 1.9);
  doc.line(cx + 2.6, cy + 1.9, cx, cy - 2.7);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.1);
  doc.setTextColor(...hexToRgb(color));
  doc.text("!", cx, cy + 1.25, { align: "center" });
}

function drawFinalReviewSectionHeading(doc: jsPDF, metadata: PdfReportModel["metadata"], y: number, heading: string) {
  if (y + 12.3 > FINAL_REVIEW_PAGE_BOTTOM) {
    doc.addPage();
    y = drawFinalReviewPageStart(doc, metadata, heading);
    return y;
  }

  drawSectionTitle(doc, heading, DASHBOARD_MARGIN, y);
  return y + 5.1;
}

function drawFinalReviewGapSummaryTable(doc: jsPDF, metadata: PdfReportModel["metadata"], rows: PdfFinalReviewGapRow[], y: number) {
  const columns = getFinalReviewGapTableColumns(DASHBOARD_WIDTH);
  let currentY = drawFinalReviewTableHeader(doc, DASHBOARD_MARGIN, y, columns);

  rows.forEach((row, index) => {
    const rowHeight = getFinalReviewGapTableRowHeight(doc, row, columns);

    if (currentY + rowHeight > FINAL_REVIEW_PAGE_BOTTOM) {
      doc.addPage();
      currentY = drawFinalReviewPageStart(doc, metadata, "GAP REVIEW SUMMARY \u2014 CONTINUED");
      currentY = drawFinalReviewTableHeader(doc, DASHBOARD_MARGIN, currentY, columns);
    }

    drawFinalReviewGapTableRow(doc, DASHBOARD_MARGIN, currentY, columns, row, index);
    currentY += rowHeight;
  });

  return currentY;
}

function drawFinalReviewSummaryTable(doc: jsPDF, metadata: PdfReportModel["metadata"], rows: PdfFinalReviewRow[], y: number) {
  const columns = getFinalReviewTableColumns(DASHBOARD_WIDTH);
  let currentY = drawFinalReviewTableHeader(doc, DASHBOARD_MARGIN, y, columns);

  rows.forEach((row, index) => {
    const rowHeight = getFinalReviewTableRowHeight(doc, row, columns);

    if (currentY + rowHeight > FINAL_REVIEW_PAGE_BOTTOM) {
      doc.addPage();
      currentY = drawFinalReviewPageStart(doc, metadata, "RISK REVIEW SUMMARY \u2014 CONTINUED");
      currentY = drawFinalReviewTableHeader(doc, DASHBOARD_MARGIN, currentY, columns);
    }

    drawFinalReviewTableRow(doc, DASHBOARD_MARGIN, currentY, columns, row, index);
    currentY += rowHeight;
  });

  return currentY;
}

function getFinalReviewGapTableColumns(width: number): FinalReviewTableColumn[] {
  const numberWidth = 10;
  const decisionWidth = 28;
  const gapWidth = 68;
  const clauseWidth = width - numberWidth - gapWidth - decisionWidth;

  return [
    { label: "#", width: numberWidth, align: "center" },
    { label: "Gap", width: gapWidth, align: "left" },
    { label: "Decision", width: decisionWidth, align: "center" },
    { label: "Final Recommended Clause", width: clauseWidth, align: "left" }
  ];
}

function getFinalReviewTableColumns(width: number): FinalReviewTableColumn[] {
  const numberWidth = 10;
  const decisionWidth = 28;
  const riskWidth = 68;
  const outcomeWidth = width - numberWidth - riskWidth - decisionWidth;

  return [
    { label: "#", width: numberWidth, align: "center" },
    { label: "Risk", width: riskWidth, align: "left" },
    { label: "Decision", width: decisionWidth, align: "center" },
    { label: "Final Outcome", width: outcomeWidth, align: "left" }
  ];
}

function drawFinalReviewTableHeader(doc: jsPDF, x: number, y: number, columns: FinalReviewTableColumn[]) {
  const width = columns.reduce((sum, column) => sum + column.width, 0);

  doc.setFillColor(...hexToRgb(COLORS.navy));
  doc.setDrawColor(...hexToRgb(COLORS.navy));
  doc.setLineWidth(0.24);
  doc.roundedRect(x, y, width, FINAL_REVIEW_TABLE_HEADER_HEIGHT, 1.3, 1.3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.8);
  doc.setTextColor(...hexToRgb(COLORS.white));

  let currentX = x;
  columns.forEach((column, index) => {
    if (index > 0) {
      doc.setDrawColor(77, 95, 124);
      doc.setLineWidth(0.2);
      doc.line(currentX, y, currentX, y + FINAL_REVIEW_TABLE_HEADER_HEIGHT);
    }

    const align = column.align === "center" ? "center" : "left";
    const textX = align === "center" ? currentX + column.width / 2 : currentX + FINAL_REVIEW_TABLE_CELL_PADDING_X;
    doc.text(column.label, textX, y + 4.75, { align });
    currentX += column.width;
  });

  return y + FINAL_REVIEW_TABLE_HEADER_HEIGHT;
}

function getFinalReviewTableRowHeight(doc: jsPDF, row: PdfFinalReviewRow, columns: FinalReviewTableColumn[]) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  const riskLines = clampTextLines(doc, row.riskTitle, columns[1].width - FINAL_REVIEW_TABLE_CELL_PADDING_X * 2, 2);
  const outcomeLines = clampMeaningfulTextLines(
    doc,
    row.finalOutcome || "-",
    columns[3].width - FINAL_REVIEW_TABLE_CELL_PADDING_X * 2,
    2
  );
  const lineCount = Math.max(riskLines.length, outcomeLines.length, 1);

  return Math.max(FINAL_REVIEW_TABLE_ROW_MIN_HEIGHT, lineCount * FINAL_REVIEW_TABLE_LINE_HEIGHT + FINAL_REVIEW_TABLE_CELL_PADDING_Y * 2);
}

function getFinalReviewGapTableRowHeight(doc: jsPDF, row: PdfFinalReviewGapRow, columns: FinalReviewTableColumn[]) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);

  const gapLines = clampTextLines(doc, row.gapTitle, columns[1].width - FINAL_REVIEW_TABLE_CELL_PADDING_X * 2, 2);
  const clauseLines = clampFinalReviewSnippetLines(
    doc,
    row.finalRecommendedClause || "-",
    columns[3].width - FINAL_REVIEW_TABLE_CELL_PADDING_X * 2
  );
  const lineCount = Math.max(gapLines.length, clauseLines.length, 1);

  return Math.max(FINAL_REVIEW_TABLE_ROW_MIN_HEIGHT, lineCount * FINAL_REVIEW_TABLE_LINE_HEIGHT + FINAL_REVIEW_TABLE_CELL_PADDING_Y * 2);
}

function drawFinalReviewGapTableRow(
  doc: jsPDF,
  x: number,
  y: number,
  columns: FinalReviewTableColumn[],
  row: PdfFinalReviewGapRow,
  index: number
) {
  const height = getFinalReviewGapTableRowHeight(doc, row, columns);
  const fill = index % 2 === 0 ? COLORS.white : "#F9FAFB";

  doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.22);
  doc.rect(x, y, columns.reduce((sum, column) => sum + column.width, 0), height, "FD");

  let currentX = x;
  columns.forEach((column, columnIndex) => {
    if (columnIndex > 0) {
      doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
      doc.line(currentX, y, currentX, y + height);
    }
    currentX += column.width;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(COLORS.darkText));

  currentX = x;
  doc.text(String(row.number), currentX + columns[0].width / 2, y + height / 2 + 1.2, { align: "center" });

  currentX += columns[0].width;
  const gapLines = clampTextLines(doc, row.gapTitle, columns[1].width - FINAL_REVIEW_TABLE_CELL_PADDING_X * 2, 2);
  drawWrappedText(doc, gapLines, currentX + FINAL_REVIEW_TABLE_CELL_PADDING_X, y + FINAL_REVIEW_TABLE_CELL_PADDING_Y + 2.3, FINAL_REVIEW_TABLE_LINE_HEIGHT);

  currentX += columns[1].width;
  drawFinalReviewDecisionPill(doc, currentX + (columns[2].width - 20.2) / 2, y + height / 2 - 2.45, 20.2, 4.9, row.decision);

  currentX += columns[2].width;
  const clauseLines = clampFinalReviewSnippetLines(
    doc,
    row.finalRecommendedClause || "-",
    columns[3].width - FINAL_REVIEW_TABLE_CELL_PADDING_X * 2
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  drawWrappedText(doc, clauseLines, currentX + FINAL_REVIEW_TABLE_CELL_PADDING_X, y + FINAL_REVIEW_TABLE_CELL_PADDING_Y + 2.3, FINAL_REVIEW_TABLE_LINE_HEIGHT);
}

function drawFinalReviewTableRow(
  doc: jsPDF,
  x: number,
  y: number,
  columns: FinalReviewTableColumn[],
  row: PdfFinalReviewRow,
  index: number
) {
  const height = getFinalReviewTableRowHeight(doc, row, columns);
  const fill = index % 2 === 0 ? COLORS.white : "#F9FAFB";
  const decision = row.decision;

  doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
  doc.setLineWidth(0.22);
  doc.rect(x, y, columns.reduce((sum, column) => sum + column.width, 0), height, "FD");

  let currentX = x;
  columns.forEach((column, columnIndex) => {
    if (columnIndex > 0) {
      doc.setDrawColor(...hexToRgb(COLORS.lightBorder));
      doc.line(currentX, y, currentX, y + height);
    }
    currentX += column.width;
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(COLORS.darkText));

  currentX = x;
  doc.text(String(row.number), currentX + columns[0].width / 2, y + height / 2 + 1.2, { align: "center" });

  currentX += columns[0].width;
  const riskLines = clampTextLines(doc, row.riskTitle, columns[1].width - FINAL_REVIEW_TABLE_CELL_PADDING_X * 2, 2);
  drawWrappedText(doc, riskLines, currentX + FINAL_REVIEW_TABLE_CELL_PADDING_X, y + FINAL_REVIEW_TABLE_CELL_PADDING_Y + 2.3, FINAL_REVIEW_TABLE_LINE_HEIGHT);

  currentX += columns[1].width;
  drawFinalReviewDecisionPill(doc, currentX + (columns[2].width - 20.2) / 2, y + height / 2 - 2.45, 20.2, 4.9, decision);

  currentX += columns[2].width;
  const outcomeLines = clampMeaningfulTextLines(
    doc,
    row.finalOutcome || "-",
    columns[3].width - FINAL_REVIEW_TABLE_CELL_PADDING_X * 2,
    2
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(COLORS.darkText));
  drawWrappedText(doc, outcomeLines, currentX + FINAL_REVIEW_TABLE_CELL_PADDING_X, y + FINAL_REVIEW_TABLE_CELL_PADDING_Y + 2.3, FINAL_REVIEW_TABLE_LINE_HEIGHT);
}

function drawFinalReviewDecisionPill(doc: jsPDF, x: number, y: number, width: number, height: number, decision: PdfDecision | PdfGapDecision) {
  const color = getDecisionColor(decision);
  doc.setFillColor(...hexToRgb(tintColor(color)));
  doc.roundedRect(x, y, width, height, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.setTextColor(...hexToRgb(color));
  doc.text(decision, x + width / 2, y + height / 2 + 0.95, { align: "center" });
}

function quoteText(value: string) {
  const normalized = safeText(value);
  if (!normalized) return "";
  if (/^".*"$/.test(normalized)) return normalized;
  return `"${normalized}"`;
}

function quoteMultilineText(value: string) {
  const normalized = safeMultilineText(value);
  if (!normalized) return "";
  if (/^".*"$/.test(normalized)) return normalized;
  return `"${normalized}"`;
}

function drawRiskDriverCards(doc: jsPDF, x: number, y: number, width: number, rows: PdfSummaryRiskRow[]) {
  const drivers = rows.slice(0, 4);
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

function drawRiskDriverCard(doc: jsPDF, x: number, y: number, width: number, height: number, row: PdfSummaryRiskRow) {
  const severity = row.severityLabel;
  const category = row.category;
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
  const titleLines = clampMeaningfulTextLines(doc, row.title, titleWidth, 2);
  drawWrappedText(doc, titleLines, titleX, y + 7.2, 3.65);

  let fieldY = y + (titleLines.length > 1 ? 16.2 : 12.9);
  const fieldWidth = contentRight - contentX;
  fieldY = drawRiskDriverField(doc, contentX, fieldY, fieldWidth, "Category", category, 1);
  fieldY = drawRiskDriverField(doc, contentX, fieldY, fieldWidth, "Issue", row.issue ?? "-", 2);
  fieldY = drawRiskDriverField(doc, contentX, fieldY, fieldWidth, "Impact", row.impact ?? "-", 2);
  drawRiskDriverField(doc, contentX, fieldY, fieldWidth, "Action", row.action ?? "-", 2);
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

function drawSummaryRiskRegister(doc: jsPDF, y: number, x: number, width: number, rows: PdfSummaryRiskRow[]) {
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

function getSummaryRegisterRowHeight(doc: jsPDF, row: PdfSummaryRiskRow, columns: Array<{ label: string; width: number; align: string }>) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  const titleColumn = columns[1];
  const lineCount = clampTextLines(doc, row.title, titleColumn.width - 4, 2).length;
  return lineCount > 1 ? 9.6 : 7.2;
}

function drawSummaryRegisterRow(
  doc: jsPDF,
  x: number,
  y: number,
  columns: Array<{ label: string; width: number; align: string }>,
  row: PdfSummaryRiskRow
) {
  const height = getSummaryRegisterRowHeight(doc, row, columns);
  const fill = (row.number - 1) % 2 === 0 ? COLORS.white : "#F9FAFB";
  const severity = row.severityLabel;

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
    String(row.number),
    row.title,
    row.category,
    severity,
    row.confidenceLabel,
    row.status
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
  doc.text(severity || "\u2014", x + width / 2, y + height / 2 + 1, { align: "center" });
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

function wrapContainedText(doc: jsPDF, value: string, maxWidth: number) {
  const lines = doc.splitTextToSize(safeText(value), maxWidth);
  const normalizedLines = Array.isArray(lines) ? lines : [lines];
  return normalizedLines.flatMap((line) => breakLineToWidth(doc, line, maxWidth));
}

function wrapMultilineText(doc: jsPDF, value: string, maxWidth: number, containText = false) {
  const paragraphs = safeMultilineText(value).split(/\n{2,}/);
  const lines = paragraphs.flatMap((paragraph, index) => {
    const wrapped = doc.splitTextToSize(paragraph, maxWidth);
    const paragraphLines = (Array.isArray(wrapped) ? wrapped : [wrapped]).flatMap((line) =>
      containText ? breakLineToWidth(doc, line, maxWidth) : [line]
    );
    return index === paragraphs.length - 1 ? paragraphLines : [...paragraphLines, ""];
  });

  return lines.length ? lines : [""];
}

function breakLineToWidth(doc: jsPDF, line: string, maxWidth: number) {
  if (!line || doc.getTextWidth(line) <= maxWidth) return [line];

  const chunks: string[] = [];
  let remaining = line;

  while (remaining && doc.getTextWidth(remaining) > maxWidth) {
    let end = remaining.length;
    while (end > 1 && doc.getTextWidth(remaining.slice(0, end)) > maxWidth) {
      end -= 1;
    }

    const chunk = remaining.slice(0, Math.max(1, end));
    chunks.push(chunk);
    remaining = remaining.slice(chunk.length);
  }

  if (remaining) chunks.push(remaining);
  return chunks;
}

function drawWrappedText(doc: jsPDF, lines: string[], x: number, y: number, lineHeight = BODY_LINE_HEIGHT) {
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function getSeverityColor(severity: unknown) {
  if (severity === "High") return COLORS.highRed;
  if (severity === "Medium") return COLORS.mediumAmber;
  if (severity === "Low") return COLORS.lowGreen;
  return COLORS.mutedText;
}

function getGapActionColor(action: unknown) {
  if (action === "Must Add") return COLORS.highRed;
  if (action === "Negotiate") return COLORS.mediumAmber;
  return COLORS.blueGrey;
}

function getDecisionColor(decision: unknown) {
  if (decision === "Revised" || decision === "Approve with Changes") return COLORS.revisedBlue;
  if (decision === "Accepted" || decision === "Approve") return COLORS.lowGreen;
  if (decision === "Pending" || decision === "Hold for Review") return COLORS.pendingAmber;
  if (decision === "Reject" || decision === "Rejected") return COLORS.highRed;
  return COLORS.mutedText;
}

function getCategoryColor(index: number) {
  const categoryColors = [COLORS.revisedBlue, COLORS.highRed, COLORS.mediumAmber, COLORS.lowGreen, COLORS.navy, COLORS.mutedText];
  return categoryColors[index % categoryColors.length];
}

function formatPercent(count: number, total: number) {
  if (total <= 0) return "0%";
  const value = (count / total) * 100;
  return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}%`;
}

function formatPercentage(value: number) {
  return `${Number.isInteger(value) ? value : Number(value.toFixed(1))}%`;
}

function getPdfSeverityMixCount(severityMix: PdfReportModel["dashboard"]["severityMix"], severity: "High" | "Medium" | "Low") {
  if (severity === "High") return severityMix.high;
  if (severity === "Medium") return severityMix.medium;
  return severityMix.low;
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

function clampFinalReviewSnippetLines(doc: jsPDF, value: string, maxWidth: number) {
  const lines = wrapText(doc, value, maxWidth);
  if (lines.length <= 2) return lines;

  const visibleLines = lines.slice(0, 2);
  visibleLines[1] = addDoubleDotToFit(doc, visibleLines[1], maxWidth);
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

function addDoubleDotToFit(doc: jsPDF, value: string, maxWidth: number) {
  const suffix = "..";
  let text = safeText(value).replace(/[.]+$/, "");

  while (text.length > 0 && doc.getTextWidth(`${text}${suffix}`) > maxWidth) {
    text = text.slice(0, -1).trimEnd();
  }

  return text ? `${text}${suffix}` : suffix;
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

function safeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function safeMultilineText(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
