export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
export const MIN_TEXT_LENGTH = 200;
export const MAX_CLEAN_TEXT_CHARS = 80_000;

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

export function validateUploadedFile(file: File | null | undefined): void {
  if (!isFileLike(file)) {
    throw new AnalyzeInputError("Please upload a PDF or DOCX contract.", 400);
  }

  if (file.size === 0) {
    throw new AnalyzeInputError("The uploaded file is empty.", 400);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new AnalyzeInputError("File is too large. Please upload a contract under 4 MB.", 400);
  }
}

export function validatePastedTextPayload(payload: unknown): { rawText: string; documentName: string } {
  const body = payload && typeof payload === "object" ? (payload as { text?: unknown; documentName?: unknown }) : {};
  const text = typeof body.text === "string" ? body.text.trim() : "";

  if (!text) {
    throw new AnalyzeInputError("Paste contract text before running the review.", 400);
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

  if (length > 0 && alphabeticRatio < 0.45) {
    issues.push("Text has an unusually low alphabetic character ratio.");
  }

  if (garbageRatio > 0.05) {
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

  const hardFailure = length < MIN_TEXT_LENGTH || (length > 0 && alphabeticRatio < 0.45) || garbageRatio > 0.05;

  return {
    ok: !hardFailure,
    likelyScanned: length < MIN_TEXT_LENGTH || (length > 0 && alphabeticRatio < 0.45),
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
    throw new AnalyzeInputError(
      "This contract is too long to analyze in one review. Please upload or paste a shorter contract under 80,000 characters.",
      413
    );
  }

  if (text.length < MIN_TEXT_LENGTH) {
    throw new AnalyzeInputError(
      sourceKind === "paste"
        ? "We could not analyze this text because it is too short. Paste a longer contract or clause set."
        : "We could not extract enough contract text to analyze. Please try a clearer text-based PDF or DOCX. Scanned image PDFs may need OCR first.",
      422
    );
  }

  if (!assessment.ok) {
    throw new AnalyzeInputError(
      sourceKind === "paste"
        ? "We could not analyze this text because it appears unreadable. Paste clearer contract text and try again."
        : "We could not extract readable contract text. Please try a clearer text-based PDF or DOCX. Scanned image PDFs may need OCR first.",
      422
    );
  }
}
