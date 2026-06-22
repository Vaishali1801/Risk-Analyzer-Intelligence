export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
export const MIN_TEXT_LENGTH = 200;
export const MAX_CLEAN_TEXT_CHARS = 80_000;

const MISSING_UPLOAD_MESSAGE = "Please upload a PDF or DOCX contract.";
const EMPTY_UPLOAD_MESSAGE = "The uploaded file is empty.";
const TOO_LARGE_UPLOAD_MESSAGE =
  "File is too large. This demo supports text-based PDF/DOCX contracts up to 4 MB. For a quick walkthrough, you can also try one of the sample contracts available on the homepage.";
const UNSUPPORTED_FILE_MESSAGE = "Unsupported file type. Please upload a PDF or DOCX contract.";
const EMPTY_PASTED_TEXT_MESSAGE = "Paste contract text before running the review.";
const PASTED_TEXT_TOO_SHORT_MESSAGE =
  "The pasted text is too short to analyze. Please paste a fuller contract section or upload a PDF/DOCX.";
const UPLOAD_TEXT_TOO_SHORT_MESSAGE =
  "We could not extract enough readable contract text. If this is a scanned PDF, please upload a text-based PDF or DOCX.";
const CLEAN_TEXT_TOO_LONG_MESSAGE =
  "This contract is too long for the current demo limits. Please upload a shorter agreement or try one of the sample contracts available on the homepage.";

export type AnalysisInputSourceKind = "upload" | "paste";

export type TextQualityAssessment = {
  ok: boolean;
  likelyScanned: boolean;
  issues: string[];
  metrics: {
    length: number;
    alphabeticRatio: number;
    garbageRatio: number;
    repeatedLineRatio: number;
    contractSignalCount: number;
    headingCount: number;
  };
};

export class AnalyzeInputError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "AnalyzeInputError";
    this.statusCode = statusCode;
  }
}

export function normalizeDocumentName(value: unknown, fallback = "Contract"): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : fallback;
}

function isFileLike(file: File | null | undefined): file is File {
  return Boolean(
    file &&
      typeof file === "object" &&
      typeof file.name === "string" &&
      typeof file.size === "number" &&
      typeof file.arrayBuffer === "function"
  );
}

function getFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isSupportedFile(file: File) {
  const extension = getFileExtension(file.name);
  const mimeType = file.type;

  return (
    extension === "pdf" ||
    extension === "docx" ||
    mimeType === "application/pdf" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export function validateUploadedFile(file: File | null | undefined): void {
  if (!isFileLike(file)) {
    throw new AnalyzeInputError(MISSING_UPLOAD_MESSAGE, 400);
  }

  if (file.size === 0) {
    throw new AnalyzeInputError(EMPTY_UPLOAD_MESSAGE, 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AnalyzeInputError(TOO_LARGE_UPLOAD_MESSAGE, 400);
  }

  if (!isSupportedFile(file)) {
    throw new AnalyzeInputError(UNSUPPORTED_FILE_MESSAGE, 415);
  }
}

export function validatePastedTextPayload(payload: unknown): { rawText: string; documentName: string } {
  const body = payload && typeof payload === "object" ? (payload as { text?: unknown; documentName?: unknown }) : {};
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    throw new AnalyzeInputError(EMPTY_PASTED_TEXT_MESSAGE, 400);
  }

  return {
    rawText: text,
    documentName: normalizeDocumentName(body.documentName, "Pasted Document")
  };
}

export function assessTextQuality(text: string): TextQualityAssessment {
  const length = text.length;
  const visibleCharacters = text.replace(/\s/g, "");
  const alphabeticCharacters = text.match(/[A-Za-z]/g)?.length ?? 0;
  const garbageCharacters = text.match(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/g)?.length ?? 0;
  const alphabeticRatio = visibleCharacters.length > 0 ? alphabeticCharacters / visibleCharacters.length : 0;
  const garbageRatio = visibleCharacters.length > 0 ? garbageCharacters / visibleCharacters.length : 0;
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const lineCounts = new Map<string, number>();

  lines.forEach((line) => {
    lineCounts.set(line, (lineCounts.get(line) ?? 0) + 1);
  });

  const repeatedLines = Array.from(lineCounts.values()).reduce((count, occurrences) => {
    return occurrences > 1 ? count + occurrences : count;
  }, 0);
  const repeatedLineRatio = lines.length > 0 ? repeatedLines / lines.length : 0;
  const lowerText = text.toLowerCase();
  const contractSignals = [
    "agreement",
    "party",
    "parties",
    "term",
    "payment",
    "liability",
    "confidentiality",
    "termination",
    "services",
    "obligations",
    "governing law",
    "indemnity"
  ];
  const contractSignalCount = contractSignals.filter((signal) => lowerText.includes(signal)).length;
  const headingCount = (
    text.match(/(^|\n)\s*(?:\d+(?:\.\d+)*\.?\s+[A-Z][^\n]{2,}|Section\s+\d+\.?\s+[^\n]+|ARTICLE\s+[IVXLCDM]+[^\n]*)/gim) ?? []
  ).length;
  const issues: string[] = [];

  if (length < MIN_TEXT_LENGTH) {
    issues.push("Text is below the minimum analyzable length.");
  }

  if (length > 0 && alphabeticRatio < 0.25) {
    issues.push("Text has an unusually low alphabetic character ratio.");
  }

  if (garbageRatio > 0.08) {
    issues.push("Text contains too many unreadable or replacement characters.");
  }

  if (repeatedLineRatio >= 0.35) {
    issues.push("Text contains many repeated lines.");
  }

  if (contractSignalCount === 0) {
    issues.push("Text contains few contract-like signals.");
  }

  if (headingCount === 0) {
    issues.push("Text contains no obvious clause headings.");
  }

  const hardFailure = length < MIN_TEXT_LENGTH || (length > 0 && alphabeticRatio < 0.25) || garbageRatio > 0.08;

  return {
    ok: !hardFailure,
    likelyScanned: length < MIN_TEXT_LENGTH || (length > 0 && alphabeticRatio < 0.25) || garbageRatio > 0.08,
    issues,
    metrics: {
      length,
      alphabeticRatio,
      garbageRatio,
      repeatedLineRatio,
      contractSignalCount,
      headingCount
    }
  };
}

export function validatePreparedText(text: string, sourceKind: AnalysisInputSourceKind): void {
  const assessment = assessTextQuality(text);

  if (text.length > MAX_CLEAN_TEXT_CHARS) {
    throw new AnalyzeInputError(CLEAN_TEXT_TOO_LONG_MESSAGE, 413);
  }

  if (text.length < MIN_TEXT_LENGTH) {
    throw new AnalyzeInputError(sourceKind === "paste" ? PASTED_TEXT_TOO_SHORT_MESSAGE : UPLOAD_TEXT_TOO_SHORT_MESSAGE, 422);
  }

  if (!assessment.ok) {
    throw new AnalyzeInputError(
      sourceKind === "paste" ? "The pasted text appears unreadable. Please paste clearer contract text." : UPLOAD_TEXT_TOO_SHORT_MESSAGE,
      422
    );
  }
}
