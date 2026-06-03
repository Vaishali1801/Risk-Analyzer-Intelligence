import type { AnalysisSourceKind } from "@/types/contract";

const DEFAULT_DOCUMENT_NAME = "Uploaded Document";
const DEFAULT_CONTRACT_NAME = "Contract";

export function getReportDocumentName(documentName?: string) {
  const normalizedName = documentName?.trim();
  return normalizedName || DEFAULT_DOCUMENT_NAME;
}

export function getReportContractName(contractTitle?: string, documentName?: string) {
  const normalizedTitle = contractTitle?.trim();
  if (normalizedTitle) return normalizedTitle;

  const normalizedDocumentName = documentName?.trim().replace(/\.(pdf|docx)$/i, "");
  return normalizedDocumentName || DEFAULT_CONTRACT_NAME;
}

export function getAnalysisPageTitle(contractTitle?: string, documentName?: string) {
  return `AI Risk Review | ${getReportContractName(contractTitle, documentName)}`;
}

export function getPdfPreviewTitle(contractTitle?: string, documentName?: string) {
  return `AI Risk Review Report | ${getReportContractName(contractTitle, documentName)}`;
}

export function getSourceLabel(sourceKind?: AnalysisSourceKind) {
  if (sourceKind === "upload") return "Uploaded file";
  if (sourceKind === "paste") return "Pasted text";
  if (sourceKind === "demo") return "Demo";
  return "Document";
}

export function getReportFileName(contractTitle?: string, documentName?: string) {
  const baseName = getReportContractName(contractTitle, documentName);
  const slug = baseName
    .replace(/\.(pdf|docx)$/i, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  const safeContractName = (slug || DEFAULT_CONTRACT_NAME).slice(0, 120).replace(/-+$/g, "");
  return `AI-Risk-Review-Report-${safeContractName || DEFAULT_CONTRACT_NAME}.pdf`;
}
