import { randomUUID } from "crypto";
import type { ContractType } from "@/lib/ai/contract-profiles";
import type { FinalDecisionComputation, FinalOverallDecision, OverallRiskComputation } from "@/lib/output-model";
import type { ContractAnalysis } from "@/types/contract";

export const PROMPT_VERSION = "clause-aware-v3";

export type PromptPath = "clause-aware" | "legacy";

export type OutputQualityMetrics = {
  jsonParsePassed: boolean;
  schemaValidationPassed: boolean;
  risksGenerated: number;
  gapsGenerated: number;
  risksWithSourceClauseIdsPct: number;
  gapsWithSourceClauseIdsPct: number;
  risksWithEvidencePct: number;
  gapsWithEvidencePct: number;
};

export type AnalysisRunMetrics = OutputQualityMetrics & {
  runId: string;
  timestamp: string;
  model: string;
  promptPath: PromptPath;
  promptVersion: string;
  cleanedTextChars: number;
  estimatedInputTokens: number;
  promptChars: number;
  estimatedPromptTokens: number;
  profileGuidanceInjected?: boolean;
  detectedContractType?: ContractType;
  contractTypeConfidence?: number;
  contractTypeEvidence?: string[];
  contractTypeScoreMargin?: number;
  contractTypeStrongTitleMatched?: boolean;
  contractTypeDetectorVersion?: string;
  selectedProfile?: {
    contractType: ContractType;
    displayName: string;
  };
  profileDomainFocus?: string[];
  contractTypeScores?: Record<string, number>;
  contractTypeDetectionError?: string;
  clauseCount?: number;
  batchCount?: number;
  extractionQualityIssues?: string[];
  promptTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  pricingKnown?: boolean;
  estimatedCostUsd?: number;
  overallRiskLevel?: string;
  overallRiskComputation?: OverallRiskComputation;
  finalRecommendedDecision?: FinalOverallDecision;
  finalDecisionComputation?: FinalDecisionComputation;
  llmLatencyMs: number;
  retryCount: number;
  repairUsed: boolean;
  fallbackUsed: boolean;
};

const MODEL_PRICING_USD_PER_1M_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-5.5": { input: 5, output: 30 },
  "gpt-5.4": { input: 2.5, output: 15 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4o": { input: 5, output: 15 }
};

const PRIVATE_LOG_FIELDS = new Set(["contractText", "prompt", "rawPrompt", "rawResponse", "modelOutput", "llmResponse"]);

export function createRunId(): string {
  return `run_${randomUUID()}`;
}

export function estimateTokensFromChars(chars: number): number {
  return Math.ceil(Math.max(0, chars) / 4);
}

export function getPromptPath(): PromptPath {
  return process.env.USE_LEGACY_PROMPT === "true" ? "legacy" : "clause-aware";
}

export function estimateOpenAICostUsd(model: string, promptTokens?: number, outputTokens?: number): number | undefined {
  if (typeof promptTokens !== "number" || typeof outputTokens !== "number") return undefined;

  const pricing = MODEL_PRICING_USD_PER_1M_TOKENS[model];
  if (!pricing) return undefined;

  return Number(((promptTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output).toFixed(6));
}

export function hasKnownOpenAIModelPricing(model: string): boolean {
  return Boolean(MODEL_PRICING_USD_PER_1M_TOKENS[model]);
}

export function computeOutputQualityMetrics(validatedAnalysis: ContractAnalysis): OutputQualityMetrics {
  const risks = Array.isArray(validatedAnalysis.risks) ? validatedAnalysis.risks : [];
  const gaps = Array.isArray(validatedAnalysis.gapAnalysis) ? validatedAnalysis.gapAnalysis : [];

  return {
    jsonParsePassed: true,
    schemaValidationPassed: true,
    risksGenerated: risks.length,
    gapsGenerated: gaps.length,
    risksWithSourceClauseIdsPct: percentage(risks.filter((risk) => hasSourceClauseIds(risk.sourceClauseIds)).length, risks.length),
    gapsWithSourceClauseIdsPct: percentage(gaps.filter((gap) => hasSourceClauseIds(gap.sourceClauseIds)).length, gaps.length),
    risksWithEvidencePct: percentage(risks.filter(hasRiskEvidence).length, risks.length),
    gapsWithEvidencePct: percentage(gaps.filter(hasGapEvidence).length, gaps.length)
  };
}

export function logAnalysisRunMetrics(metrics: AnalysisRunMetrics): void {
  console.info("[analysis-run]", sanitizeForLog(metrics));
}

function percentage(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

function hasSourceClauseIds(value: unknown): boolean {
  return Array.isArray(value) && value.some((item) => typeof item === "string" && item.trim().length > 0);
}

function hasRiskEvidence(risk: { evidence?: unknown; sourceClauseIds?: unknown; clauseText?: unknown }): boolean {
  return hasUsefulEvidence(risk.evidence) || hasSourceClauseIds(risk.sourceClauseIds) || hasMeaningfulEvidenceText(risk.clauseText, 10);
}

function hasGapEvidence(gap: { evidence?: unknown; sourceClauseIds?: unknown; missingOrWeakProtection?: unknown }): boolean {
  return hasUsefulEvidence(gap.evidence) || hasSourceClauseIds(gap.sourceClauseIds) || hasMeaningfulEvidenceText(gap.missingOrWeakProtection);
}

function hasUsefulEvidence(value: unknown): boolean {
  if (typeof value === "string") return hasMeaningfulEvidenceText(value);
  if (Array.isArray(value)) {
    return value.some((item) => {
      if (typeof item === "string") return hasMeaningfulEvidenceText(item);
      if (Array.isArray(item)) return hasUsefulEvidence(item);
      if (item && typeof item === "object") return hasUsefulEvidence(item);
      return false;
    });
  }
  if (!value || typeof value !== "object") return false;

  return Object.values(value).some((item) => {
    if (typeof item === "string") return hasMeaningfulEvidenceText(item);
    if (Array.isArray(item)) return hasUsefulEvidence(item);
    return false;
  });
}

function hasMeaningfulEvidenceText(value: unknown, minLength = 1): boolean {
  if (typeof value !== "string") return false;

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length < minLength) return false;

  const lower = normalized.toLowerCase();
  return !PLACEHOLDER_EVIDENCE_VALUES.has(lower);
}

const PLACEHOLDER_EVIDENCE_VALUES = new Set([
  "section unknown",
  "unknown",
  "n/a",
  "na",
  "none",
  "not applicable",
  "not available",
  "no evidence",
  "evidence not available",
  "clause evidence was not provided by the analysis.",
  "clause evidence not available.",
  "clause text unavailable",
  "original clause text unavailable.",
  "recommended clause language is not available yet.",
  "no rationale provided.",
  "no suggested fix provided."
]);

function sanitizeForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !PRIVATE_LOG_FIELDS.has(key))
      .map(([key, item]) => [key, sanitizeForLog(item)])
  );
}
