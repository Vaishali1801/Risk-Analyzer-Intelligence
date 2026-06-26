import type { ContractAnalysis, ContractRisk, GapAnalysisItem } from "@/types/contract";

export type RuntimeQualityGateResult = {
  qualityGatePassed: boolean;
  qualityGateFailures: string[];
  qualityGateWarnings: string[];

  unsupportedFindingRate: number;
  groundingFailureRate: number;
  highRiskGroundingRate: number;
  weakGapMissingSourceRate: number;
  invalidSourceClauseIdRate: number;
  placeholderTextRate: number;
  duplicateFindingWarningCount: number;
  confidenceAnomalyDetected: boolean;

  qualityGateIssueCount?: number;
  qualityGateWarningCount?: number;
  invalidSourceClauseIdsCount?: number;
  placeholderTextFindingsCount?: number;
  duplicateFindingsCount?: number;
  highRiskGroundingFailuresCount?: number;
  weakGapMissingSourceClauseIdsCount?: number;
  unsupportedFindingsCount?: number;
  groundingFailuresCount?: number;
};

type FindingQualityRecord = {
  kind: "risk" | "gap";
  title: string;
  confidence: number;
  sourceClauseIds: string[];
  evidence: unknown;
  missingOrWeakProtection?: string;
};

const INVALID_SOURCE_ID_FAILURE_THRESHOLD = 20;
const SHORT_RECOMMENDED_CLAUSE_LENGTH = 30;
const LONG_RECOMMENDED_CLAUSE_LENGTH = 2500;
const SHORT_SUGGESTED_IMPROVEMENT_LENGTH = 30;

const PLACEHOLDER_PATTERNS = [
  /\btbd\b/i,
  /\btodo\b/i,
  /\bn\/a\b/i,
  /\blorem\b/i,
  /\bplaceholder\b/i,
  /\bnot specified\b/i,
  /\[insert\]/i,
  /<insert>/i,
  /\binsert\b/i
];

export function evaluateRuntimeQualityGate(input: {
  analysis: ContractAnalysis;
  validSourceClauseIds?: ReadonlySet<string>;
}): RuntimeQualityGateResult {
  const risks = input.analysis.risks ?? [];
  const gaps = input.analysis.gapAnalysis ?? [];
  const findings = [...risks.map(toRiskRecord), ...gaps.map(toGapRecord)];
  const failures: string[] = [];
  const warnings: string[] = [];

  if (findings.length === 0) {
    failures.push("no_risks_or_gaps");
  }

  if (!input.validSourceClauseIds) {
    warnings.push("source_clause_id_validation_skipped");
  }

  const unsupportedFindingsCount = findings.filter(isUnsupportedFinding).length;
  const highRiskGroundingFailuresCount = risks.filter((risk) => risk.severity === "High" && !hasFindingGrounding(risk)).length;
  if (highRiskGroundingFailuresCount > 0) {
    failures.push("high_risk_grounding_missing");
  }

  const invalidSourceClauseIdsCount = countInvalidSourceClauseIds(findings, input.validSourceClauseIds);
  const totalSourceClauseIds = findings.reduce((total, finding) => total + finding.sourceClauseIds.length, 0);
  const invalidSourceClauseIdRate = input.validSourceClauseIds ? percentage(invalidSourceClauseIdsCount, totalSourceClauseIds) : 0;
  if (input.validSourceClauseIds && invalidSourceClauseIdRate > INVALID_SOURCE_ID_FAILURE_THRESHOLD) {
    failures.push("invalid_source_clause_ids_threshold_exceeded");
  }

  const placeholderTextFindingsCount = risks.filter(hasRiskPlaceholderText).length + gaps.filter(hasGapPlaceholderText).length;
  if (placeholderTextFindingsCount > 0) {
    failures.push("placeholder_text_detected");
  }

  const duplicateFindingsCount = countDuplicateTitles(findings);
  if (duplicateFindingsCount > 0) {
    warnings.push("duplicate_finding_titles_detected");
  }

  const confidenceAnomalyDetected = hasConfidenceAnomaly(findings);
  if (confidenceAnomalyDetected) {
    warnings.push("confidence_anomaly_detected");
  }

  const weakGapMissingSourceClauseIdsCount = gaps.filter((gap) => isWeakOrPartiallyAddressedGap(gap) && !hasSourceClauseIds(gap.sourceClauseIds)).length;
  if (weakGapMissingSourceClauseIdsCount > 0) {
    warnings.push("weak_gap_missing_source_clause_ids");
  }

  if (risks.some((risk) => risk.severity === "High" && risk.confidence < 0.75)) {
    warnings.push("high_risk_low_confidence");
  }

  if (risks.some((risk) => normalizeText(risk.suggestedImprovement).length < SHORT_SUGGESTED_IMPROVEMENT_LENGTH)) {
    warnings.push("suggested_improvement_unusually_short");
  }

  if (
    gaps.some((gap) => {
      const length = normalizeText(gap.recommendedClause).length;
      return length < SHORT_RECOMMENDED_CLAUSE_LENGTH || length > LONG_RECOMMENDED_CLAUSE_LENGTH;
    })
  ) {
    warnings.push("recommended_clause_unusual_length");
  }

  if (findings.some((finding) => !hasSourceClauseIds(finding.sourceClauseIds) && hasEvidencePayload(finding.evidence))) {
    warnings.push("source_clause_ids_missing_but_evidence_present");
  }

  const groundingFailuresCount =
    unsupportedFindingsCount +
    (input.validSourceClauseIds ? countFindingsWithInvalidSourceClauseIds(findings, input.validSourceClauseIds) : 0);
  const highRisks = risks.filter((risk) => risk.severity === "High");

  return {
    qualityGatePassed: failures.length === 0,
    qualityGateFailures: uniqueStrings(failures),
    qualityGateWarnings: uniqueStrings(warnings),
    unsupportedFindingRate: percentage(unsupportedFindingsCount, findings.length),
    groundingFailureRate: percentage(groundingFailuresCount, findings.length),
    highRiskGroundingRate: highRisks.length ? percentage(highRisks.length - highRiskGroundingFailuresCount, highRisks.length) : 100,
    weakGapMissingSourceRate: percentage(weakGapMissingSourceClauseIdsCount, gaps.filter(isWeakOrPartiallyAddressedGap).length),
    invalidSourceClauseIdRate,
    placeholderTextRate: percentage(placeholderTextFindingsCount, findings.length),
    duplicateFindingWarningCount: duplicateFindingsCount,
    confidenceAnomalyDetected,
    qualityGateIssueCount: uniqueStrings(failures).length,
    qualityGateWarningCount: uniqueStrings(warnings).length,
    invalidSourceClauseIdsCount,
    placeholderTextFindingsCount,
    duplicateFindingsCount,
    highRiskGroundingFailuresCount,
    weakGapMissingSourceClauseIdsCount,
    unsupportedFindingsCount,
    groundingFailuresCount
  };
}

function toRiskRecord(risk: ContractRisk): FindingQualityRecord {
  return {
    kind: "risk",
    title: risk.title,
    confidence: risk.confidence,
    sourceClauseIds: getStringArray(risk.sourceClauseIds),
    evidence: risk.evidence
  };
}

function toGapRecord(gap: GapAnalysisItem): FindingQualityRecord {
  return {
    kind: "gap",
    title: gap.clauseName,
    confidence: gap.aiConfidence,
    sourceClauseIds: getStringArray(gap.sourceClauseIds),
    evidence: gap.evidence,
    missingOrWeakProtection: gap.missingOrWeakProtection
  };
}

function hasFindingGrounding(finding: { sourceClauseIds?: unknown; evidence?: unknown }) {
  return hasSourceClauseIds(finding.sourceClauseIds) || hasUsefulEvidence(finding.evidence);
}

function isUnsupportedFinding(finding: FindingQualityRecord) {
  if (isFullyMissingGapRecord(finding)) return false;
  return !hasSourceClauseIds(finding.sourceClauseIds) && !hasEvidencePayload(finding.evidence);
}

function hasSourceClauseIds(value: unknown): boolean {
  return getStringArray(value).length > 0;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)));
}

function hasUsefulEvidence(value: unknown): boolean {
  if (typeof value === "string") return hasUsefulEvidenceText(value);
  if (Array.isArray(value)) return value.some(hasUsefulEvidence);
  if (!value || typeof value !== "object") return false;

  return Object.values(value).some((item) => {
    if (typeof item === "string") return hasUsefulEvidenceText(item);
    if (Array.isArray(item)) return hasUsefulEvidence(item);
    return false;
  });
}

function hasEvidencePayload(value: unknown): boolean {
  if (typeof value === "string") return normalizeText(value).length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (!value || typeof value !== "object") return false;

  return Object.values(value).some((item) => {
    if (typeof item === "string") return normalizeText(item).length > 0;
    if (Array.isArray(item)) return item.length > 0;
    return typeof item !== "undefined" && item !== null;
  });
}

function hasUsefulEvidenceText(value: string): boolean {
  const normalized = normalizeText(value);
  if (!normalized) return false;

  const lower = normalized.toLowerCase();
  return lower !== "section unknown" && lower !== "unknown" && lower !== "n/a" && lower !== "not available" && lower !== "no evidence";
}

function countInvalidSourceClauseIds(findings: FindingQualityRecord[], validSourceClauseIds?: ReadonlySet<string>) {
  if (!validSourceClauseIds) return 0;

  return findings.reduce(
    (count, finding) => count + finding.sourceClauseIds.filter((sourceClauseId) => !validSourceClauseIds.has(sourceClauseId)).length,
    0
  );
}

function countFindingsWithInvalidSourceClauseIds(findings: FindingQualityRecord[], validSourceClauseIds: ReadonlySet<string>) {
  return findings.filter((finding) => finding.sourceClauseIds.some((sourceClauseId) => !validSourceClauseIds.has(sourceClauseId))).length;
}

function hasRiskPlaceholderText(risk: ContractRisk) {
  return [
    risk.title,
    risk.clauseRef,
    risk.clauseText,
    risk.highlightedText,
    risk.whyRisky,
    risk.impactIfIgnored,
    risk.suggestedImprovement
  ].some(hasPlaceholderText);
}

function hasGapPlaceholderText(gap: GapAnalysisItem) {
  return [gap.clauseName, gap.category, gap.whyThisMatters, gap.suggestedFix, gap.recommendedClause, gap.missingOrWeakProtection].some(hasPlaceholderText);
}

function hasPlaceholderText(value: unknown) {
  if (typeof value !== "string") return false;
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function countDuplicateTitles(findings: FindingQualityRecord[]) {
  const seen = new Set<string>();
  let duplicateCount = 0;

  findings.forEach((finding) => {
    const title = normalizeTitle(finding.title);
    if (!title) return;

    if (seen.has(title)) {
      duplicateCount += 1;
      return;
    }

    seen.add(title);
  });

  return duplicateCount;
}

function normalizeTitle(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(risk|gap|clause|section|issue|finding)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasConfidenceAnomaly(findings: FindingQualityRecord[]) {
  if (!findings.length) return false;

  const confidences = findings.map((finding) => finding.confidence);
  const uniqueConfidences = new Set(confidences.map((confidence) => confidence.toFixed(2)));
  const allIdentical = confidences.length > 1 && uniqueConfidences.size === 1;
  const allVeryHigh = confidences.every((confidence) => confidence > 0.95);
  const missingOrZeroConfidence = confidences.some((confidence) => !Number.isFinite(confidence) || confidence <= 0);

  return allIdentical || allVeryHigh || missingOrZeroConfidence;
}

function isWeakOrPartiallyAddressedGap(gap: GapAnalysisItem) {
  const text = normalizeText(gap.missingOrWeakProtection);
  if (!text) return false;

  const lower = text.toLowerCase();
  const weakSignal = /\b(weak|partial|partially|incomplete|limited|narrow|insufficient|inadequate|unclear|ambiguous)\b/.test(lower);
  const fullyMissingSignal = hasFullyMissingProtectionSignal(lower) && !weakSignal;

  return weakSignal && !fullyMissingSignal;
}

function isFullyMissingGapRecord(finding: FindingQualityRecord) {
  if (finding.kind !== "gap") return false;

  const lower = normalizeText(finding.missingOrWeakProtection).toLowerCase();
  if (!lower) return false;

  const weakSignal = /\b(weak|partial|partially|incomplete|limited|narrow|insufficient|inadequate|unclear|ambiguous)\b/.test(lower);
  return hasFullyMissingProtectionSignal(lower) && !weakSignal;
}

function hasFullyMissingProtectionSignal(value: string) {
  return /\b(absent|omitted|not included|no\b|missing)\b/.test(value);
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function percentage(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}
