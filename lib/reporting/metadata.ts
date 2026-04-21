import type { AnalysisSourceKind } from "@/types/contract";

const DEFAULT_DOCUMENT_NAME = "Uploaded Document";

export function getReportDocumentName(documentName?: string) {
  const normalizedName = documentName?.trim();
  return normalizedName || DEFAULT_DOCUMENT_NAME;
}

export function getSourceLabel(sourceKind?: AnalysisSourceKind) {
  if (sourceKind === "upload") return "Uploaded file";
  if (sourceKind === "paste") return "Pasted text";
  if (sourceKind === "demo") return "Demo";
  return "Document";
}

export function getReportFileName(documentName?: string) {
  const baseName = getReportDocumentName(documentName).replace(/\.(pdf|docx)$/i, "");
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${slug || "risk-analysis-results"}-risk-analysis-results.pdf`;
}
