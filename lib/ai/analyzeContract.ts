import OpenAI from "openai";
import {
  createAnalysisTrace,
  endTraceStage,
  finalizeAnalysisTrace,
  safeTraceStage,
  startTraceStage,
  type AnalysisTrace
} from "@/lib/ai/analysis-trace";
import {
  detectContractType,
  getProfileForContractType,
  type ContractReviewProfile,
  type ContractTypeDetectionResult
} from "@/lib/ai/contract-profiles";
import { buildAnalyzeContractPrompt } from "@/lib/ai/prompts/analyze-contract-prompt";
import { evaluateRuntimeQualityGate, type RuntimeQualityGateResult } from "@/lib/ai/runtime-quality-gate";
import { buildClauseAwareAnalysisInput } from "@/lib/clauses/input";
import { segmentContractClauses } from "@/lib/clauses/segment";
import { getFinalGapReviewCounts, getFinalReviewDecisionComputation, getOverallRiskLevelComputation } from "@/lib/output-model";
import { ContractAnalysisSchema } from "@/schemas/contract-analysis";
import type { ContractAnalysis } from "@/types/contract";
import { applyDecisionLogic } from "./decision";
import { createFallbackAnalysis } from "./fallback";
import {
  PROMPT_VERSION,
  computeOutputQualityMetrics,
  createRunId,
  estimateOpenAICostUsd,
  estimateTokensFromChars,
  getPromptPath,
  hasKnownOpenAIModelPricing,
  logAnalysisRunMetrics,
  type AnalysisRunMetrics
} from "./observability";

const SYSTEM_PROMPT = `You are an expert enterprise contract risk analyst.

Analyze contract for:
- ambiguous clauses
- liability exposure
- penalties
- payment risks
- compliance & operational risks

Return ONLY valid JSON. Do not include any text before or after the JSON. Ensure the output strictly matches the required schema. 
No extra text.
Be concise, structured, business-focused.
Include reasoning + confidence.
If unsure, still provide best structured output.`;

const MAX_CHUNK_CHARS = 7000;
const CHUNK_OVERLAP_CHARS = 600;
const MAX_PROMPT_CHUNKS = 10;

export function chunkText(text: string, maxChunkChars = MAX_CHUNK_CHARS): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + maxChunkChars, normalized.length);
    const slice = normalized.slice(start, end);
    const lastBreak = slice.lastIndexOf("\n\n");
    const adjustedEnd = end < normalized.length && lastBreak > maxChunkChars * 0.55 ? start + lastBreak : end;

    chunks.push(normalized.slice(start, adjustedEnd).trim());

    if (adjustedEnd >= normalized.length) break;
    const overlap = Math.min(CHUNK_OVERLAP_CHARS, Math.max(0, Math.floor(maxChunkChars * 0.2)));
    const nextStart = Math.max(0, adjustedEnd - overlap);
    start = nextStart <= start ? adjustedEnd : nextStart;
  }

  return chunks.filter(Boolean);
}

export function buildPrompt(text: string): string {
  const allChunks = chunkText(text);
  const chunks = allChunks.slice(0, MAX_PROMPT_CHUNKS);
  const omittedChunks = Math.max(0, allChunks.length - chunks.length);
  const chunkPayload = chunks.map((chunk, index) => `--- CHUNK ${index + 1} ---\n${chunk}`).join("\n\n");

  return `Analyze the following contract text using a controlled, non-agentic review workflow.

Return a single JSON object with this exact structure:
{
  "contractTitle": "string",
  "executiveSummary": "string",
  "aiInsight": "string",
  "overallRiskLevel": "High | Medium | Low",
  "decisionRecommendation": "Accept | Renegotiate | Reject",
  "decisionRationale": "string",
  "riskSummary": {
    "total": 0,
    "high": 0,
    "medium": 0,
    "low": 0,
    "byCategory": {
      "Legal": 0,
      "Financial": 0,
      "Operational": 0,
      "Compliance": 0,
      "Technical": 0
    }
  },
  "topCriticalRisks": ["string"],
  "risks": [
    {
      "id": "RISK-1",
      "title": "string",
      "category": "Legal | Financial | Operational | Compliance | Technical",
      "severity": "High | Medium | Low",
      "clauseRef": "string",
      "clauseText": "string",
      "highlightedText": "string",
      "mitigability": "High | Medium | Low",
      "confidence": 0.0,
      "whyRisky": "string",
      "impactIfIgnored": "string",
      "suggestedImprovement": "string"
    }
  ],
  "nextActions": ["string"]
}

Rules:
- Identify 5 to 12 meaningful risks unless the contract is very short.
- Set aiInsight to exactly one concise, decision-oriented business sentence summarizing the most important exposure driver or drivers.
- Base aiInsight only on the reviewed contract text and extracted risks; do not invent facts, use generic filler, or phrase it as legal advice.
- Use confidence as a number between 0 and 1.
- Quote only the minimum clause text needed for evidence.
- Prefer actionable business language over legal jargon.
- Do not invent clause references; use "Section unknown" if unclear.
- The application will recalculate the final decision with deterministic rule logic after validation.
${omittedChunks ? `- The document was very long; ${omittedChunks} trailing chunks were omitted, so prioritize high-impact risks from the reviewed text.` : ""}

Contract text:
${chunkPayload}`;
}

export function buildClauseAwarePrompt(text: string, selectedProfile?: ContractReviewProfile): string {
  const clauseAwareInput = buildClauseAwareAnalysisInput(text);
  return buildAnalyzeContractPrompt({ contractText: clauseAwareInput, selectedProfile });
}

export function selectAnalysisPrompt(text: string, selectedProfile?: ContractReviewProfile): string {
  return getPromptPath() === "legacy" ? buildPrompt(text) : buildClauseAwarePrompt(text, selectedProfile);
}

export function repairJSON(response: string): string {
  const trimmed = response.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export function validateResponse(rawResponse: string): ContractAnalysis {
  const repaired = repairJSON(rawResponse);
  let parsed: unknown;

  try {
    parsed = JSON.parse(repaired);
  } catch (error) {
    annotateValidationError(error, false, false);
    throw error;
  }

  let validated: ContractAnalysis;

  try {
    validated = ContractAnalysisSchema.parse(parsed);
  } catch (error) {
    annotateValidationError(error, true, false);
    throw error;
  }

  // AI decision fields stay schema-compatible; output-model helpers own displayed Risk Level and Final Review decisions.
  return applyDecisionLogic(validated);
}

type OpenAIUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

async function callOpenAI(prompt: string, model = getOpenAIModel()) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to .env.local to analyze uploaded contracts.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ]
  });

  return {
    content: completion.choices[0]?.message?.content ?? "",
    usage: completion.usage
  };
}

type AnalyzeContractOptions = {
  allowFallbackAnalysis?: boolean;
};

export async function analyzeContract(text: string, options: AnalyzeContractOptions = {}): Promise<ContractAnalysis> {
  const allowFallbackAnalysis = options.allowFallbackAnalysis ?? true;
  const runId = createRunId();
  const trace = createAnalysisTrace(runId);
  const model = getOpenAIModel();
  const promptPath = getPromptPath();
  const cleanedTextChars = text.length;
  const estimatedInputTokens = estimateTokensFromChars(cleanedTextChars);
  const contractTypeDetection = safeTraceStage(trace, "contract_type_detection", () => safelyDetectContractType(text), (detection) => ({
    detectedContractType: detection.contractType,
    contractTypeConfidence: detection.confidence,
    contractTypeScoreMargin: detection.scoreMargin,
    contractTypeStrongTitleMatched: detection.strongTitleMatched
  }));
  let clauseAwareInput = "";

  if (promptPath === "clause-aware") {
    clauseAwareInput = safeTraceStage(trace, "clause_segmentation", () => buildClauseAwareAnalysisInput(text), () => ({
      clauseAwareInputBuilt: true,
      cleanedTextChars,
      estimatedInputTokens
    }));
  } else {
    const skippedStage = startTraceStage(trace, "clause_segmentation");
    endTraceStage(skippedStage, "skipped", {
      clauseAwareInputBuilt: false,
      cleanedTextChars,
      estimatedInputTokens
    });
  }

  const prompt = safeTraceStage(
    trace,
    "prompt_build",
    () =>
      promptPath === "legacy"
        ? buildPrompt(text)
        : buildAnalyzeContractPrompt({ contractText: clauseAwareInput, selectedProfile: contractTypeDetection.selectedProfile }),
    (builtPrompt) => ({
      promptPath,
      promptVersion: PROMPT_VERSION,
      promptChars: builtPrompt.length,
      estimatedPromptTokens: estimateTokensFromChars(builtPrompt.length),
      profileGuidanceInjected: promptPath === "clause-aware"
    })
  );
  const metrics: AnalysisRunMetrics = {
    runId,
    timestamp: new Date().toISOString(),
    model,
    promptPath,
    promptVersion: PROMPT_VERSION,
    cleanedTextChars,
    estimatedInputTokens,
    promptChars: prompt.length,
    estimatedPromptTokens: estimateTokensFromChars(prompt.length),
    pricingKnown: hasKnownOpenAIModelPricing(model),
    profileGuidanceInjected: promptPath === "clause-aware",
    ...buildContractTypeMetrics(contractTypeDetection),
    llmLatencyMs: 0,
    retryCount: 0,
    repairUsed: false,
    fallbackUsed: false,
    jsonParsePassed: false,
    schemaValidationPassed: false,
    risksGenerated: 0,
    gapsGenerated: 0,
    risksWithSourceClauseIdsPct: 0,
    gapsWithSourceClauseIdsPct: 0,
    risksWithEvidencePct: 0,
    gapsWithEvidencePct: 0
  };

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to .env.local to analyze uploaded contracts.");
  }

  let firstResponse = "";

  try {
    const firstCompletion = await safeTraceStage(trace, "llm_analysis", () => callOpenAIWithMetrics(prompt, model, metrics), () =>
      getLlmTraceQuality(metrics, model, "initial")
    );
    firstResponse = firstCompletion.content;
    const analysis = validateResponseWithTrace(firstResponse, metrics, trace);
    markValidationSuccess(metrics, analysis, text, trace);
    logAnalysisRunMetricsWithTrace(metrics, trace);
    return analysis;
  } catch (firstError) {
    markValidationFailure(metrics, firstError);

    try {
      metrics.retryCount = 1;
      metrics.repairUsed = true;
      const repairPrompt = `${prompt}

Your previous output was invalid or did not match the schema. Return corrected JSON only. No markdown. No commentary.
Previous output:
${firstResponse || String(firstError)}`;

      const retryCompletion = await safeTraceStage(trace, "llm_analysis", () => callOpenAIWithMetrics(repairPrompt, model, metrics), () =>
        getLlmTraceQuality(metrics, model, "retry")
      );
      const analysis = validateResponseWithTrace(retryCompletion.content, metrics, trace);
      markValidationSuccess(metrics, analysis, text, trace);
      logAnalysisRunMetricsWithTrace(metrics, trace);
      return analysis;
    } catch (retryError) {
      markValidationFailure(metrics, retryError);
      const reason = retryError instanceof Error ? retryError.message : "Model output failed validation after retry.";
      if (!allowFallbackAnalysis) {
        logAnalysisRunMetricsWithTrace(metrics, trace);
        throw new Error(reason);
      }

      metrics.fallbackUsed = true;
      const fallbackAnalysis = createFallbackAnalysis(reason);
      const jsonParsePassed = metrics.jsonParsePassed;
      const schemaValidationPassed = metrics.schemaValidationPassed;
      Object.assign(metrics, computeOutputQualityMetrics(fallbackAnalysis), computeDeterministicReviewDiagnostics(fallbackAnalysis), computeRuntimeQualityGateMetrics(fallbackAnalysis, text, trace), {
        jsonParsePassed,
        schemaValidationPassed
      });
      logAnalysisRunMetricsWithTrace(metrics, trace);
      return fallbackAnalysis;
    }
  }
}

function safelyDetectContractType(text: string): ContractTypeDetectionResult & { detectionError?: string } {
  try {
    return detectContractType(text);
  } catch (error) {
    const selectedProfile = getProfileForContractType("Generic Agreement");
    const message = error instanceof Error ? error.message : "Unknown contract type detection error.";

    return {
      contractType: "Generic Agreement",
      confidence: 0.4,
      evidence: ["Selected Generic Agreement fallback because contract type detection failed."],
      selectedProfile,
      scoreMargin: 0,
      strongTitleMatched: false,
      detectorVersion: "profile-signals-v1",
      scores: {},
      detectionError: message
    };
  }
}

function buildContractTypeMetrics(detection: ContractTypeDetectionResult & { detectionError?: string }): Partial<AnalysisRunMetrics> {
  return {
    detectedContractType: detection.contractType,
    contractTypeConfidence: detection.confidence,
    contractTypeEvidence: detection.evidence,
    contractTypeScoreMargin: detection.scoreMargin,
    contractTypeStrongTitleMatched: detection.strongTitleMatched,
    contractTypeDetectorVersion: detection.detectorVersion,
    selectedProfile: {
      contractType: detection.selectedProfile.contractType,
      displayName: detection.selectedProfile.displayName
    },
    profileDomainFocus: detection.selectedProfile.domainFocus,
    contractTypeScores: detection.scores,
    contractTypeDetectionError: detection.detectionError
  };
}

function getOpenAIModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

async function callOpenAIWithMetrics(prompt: string, model: string, metrics: AnalysisRunMetrics) {
  const startedAt = Date.now();

  try {
    const completion = await callOpenAI(prompt, model);
    metrics.llmLatencyMs += Date.now() - startedAt;
    applyUsageMetrics(metrics, model, completion.usage);
    return completion;
  } catch (error) {
    metrics.llmLatencyMs += Date.now() - startedAt;
    throw error;
  }
}

function applyUsageMetrics(metrics: AnalysisRunMetrics, model: string, usage?: OpenAIUsage | null) {
  if (!usage) return;

  metrics.promptTokens = (metrics.promptTokens ?? 0) + (usage.prompt_tokens ?? 0);
  metrics.outputTokens = (metrics.outputTokens ?? 0) + (usage.completion_tokens ?? 0);
  metrics.totalTokens = (metrics.totalTokens ?? 0) + (usage.total_tokens ?? 0);
  metrics.pricingKnown = hasKnownOpenAIModelPricing(model);
  metrics.estimatedCostUsd = estimateOpenAICostUsd(model, metrics.promptTokens, metrics.outputTokens);
}

function validateResponseWithTrace(rawResponse: string, metrics: AnalysisRunMetrics, trace: AnalysisTrace): ContractAnalysis {
  const stage = startTraceStage(trace, "json_parse_schema_validation");

  try {
    const analysis = validateResponse(rawResponse);
    endTraceStage(stage, "success", {
      jsonParsePassed: true,
      schemaValidationPassed: true,
      repairUsed: metrics.repairUsed,
      responseCharCount: rawResponse.length
    });
    return analysis;
  } catch (error) {
    const validationError = error as { jsonParsePassed?: unknown; schemaValidationPassed?: unknown; issues?: unknown };
    endTraceStage(
      stage,
      "failed",
      {
        jsonParsePassed: validationError.jsonParsePassed === true,
        schemaValidationPassed: validationError.schemaValidationPassed === true,
        repairUsed: metrics.repairUsed,
        responseCharCount: rawResponse.length,
        schemaIssueCount: getSchemaIssueCount(error)
      },
      undefined,
      [error instanceof Error ? error.name : "validation_error"]
    );
    throw error;
  }
}

function markValidationSuccess(metrics: AnalysisRunMetrics, analysis: ContractAnalysis, text: string, trace: AnalysisTrace) {
  Object.assign(
    metrics,
    computeOutputQualityMetrics(analysis),
    computeDeterministicReviewDiagnostics(analysis),
    computeRuntimeQualityGateMetrics(analysis, text, trace)
  );
}

function computeDeterministicReviewDiagnostics(analysis: ContractAnalysis): Partial<AnalysisRunMetrics> {
  const overallRiskComputation = getOverallRiskLevelComputation(analysis.risks, analysis.overallRiskLevel);
  const finalDecisionComputation = getFinalReviewDecisionComputation(
    { Revised: 0, Accepted: 0, Pending: analysis.risks.length },
    getFinalGapReviewCounts(analysis.gapAnalysis ?? [])
  );

  return {
    overallRiskLevel: overallRiskComputation.finalOverallRiskLevel,
    overallRiskComputation,
    finalRecommendedDecision: finalDecisionComputation.finalRecommendedDecision,
    finalDecisionComputation
  };
}

function computeRuntimeQualityGateMetrics(analysis: ContractAnalysis, text: string, trace: AnalysisTrace): RuntimeQualityGateResult {
  const stage = startTraceStage(trace, "runtime_quality_gate");

  try {
    const validSourceClauseIds = new Set(segmentContractClauses(text).map((clause) => clause.clauseId));
    const qualityGate = evaluateRuntimeQualityGate({
      analysis,
      validSourceClauseIds
    });

    endTraceStage(stage, qualityGate.qualityGatePassed ? "success" : "warning", {
      qualityGatePassed: qualityGate.qualityGatePassed,
      groundingFailureRate: qualityGate.groundingFailureRate,
      unsupportedFindingRate: qualityGate.unsupportedFindingRate,
      highRiskGroundingRate: qualityGate.highRiskGroundingRate,
      weakGapMissingSourceRate: qualityGate.weakGapMissingSourceRate,
      invalidSourceClauseIdRate: qualityGate.invalidSourceClauseIdRate,
      placeholderTextRate: qualityGate.placeholderTextRate,
      duplicateFindingWarningCount: qualityGate.duplicateFindingWarningCount,
      confidenceAnomalyDetected: qualityGate.confidenceAnomalyDetected
    });

    return qualityGate;
  } catch {
    endTraceStage(
      stage,
      "failed",
      {
        qualityGatePassed: false,
        groundingFailureRate: 0,
        unsupportedFindingRate: 0,
        highRiskGroundingRate: 100,
        weakGapMissingSourceRate: 0,
        invalidSourceClauseIdRate: 0,
        placeholderTextRate: 0,
        duplicateFindingWarningCount: 0,
        confidenceAnomalyDetected: false
      },
      undefined,
      ["quality_gate_runtime_error"]
    );

    return {
      qualityGatePassed: false,
      qualityGateFailures: ["quality_gate_runtime_error"],
      qualityGateWarnings: [],
      unsupportedFindingRate: 0,
      groundingFailureRate: 0,
      highRiskGroundingRate: 100,
      weakGapMissingSourceRate: 0,
      invalidSourceClauseIdRate: 0,
      placeholderTextRate: 0,
      duplicateFindingWarningCount: 0,
      confidenceAnomalyDetected: false,
      qualityGateIssueCount: 1,
      qualityGateWarningCount: 0,
      invalidSourceClauseIdsCount: 0,
      placeholderTextFindingsCount: 0,
      duplicateFindingsCount: 0,
      highRiskGroundingFailuresCount: 0,
      weakGapMissingSourceClauseIdsCount: 0,
      unsupportedFindingsCount: 0,
      groundingFailuresCount: 0
    };
  }
}

function logAnalysisRunMetricsWithTrace(metrics: AnalysisRunMetrics, trace: AnalysisTrace) {
  const stage = startTraceStage(trace, "observability_log");
  endTraceStage(stage, "success", {
    metricCount: Object.keys(metrics).length,
    traceStageCount: trace.stages.length + 1
  });

  metrics.analysisTrace = finalizeAnalysisTrace(trace);
  logAnalysisRunMetrics(metrics);
}

function getLlmTraceQuality(metrics: AnalysisRunMetrics, model: string, attempt: "initial" | "retry") {
  return {
    attempt,
    model,
    promptTokens: metrics.promptTokens ?? 0,
    outputTokens: metrics.outputTokens ?? 0,
    totalTokens: metrics.totalTokens ?? 0,
    estimatedCostUsd: metrics.estimatedCostUsd ?? 0,
    llmLatencyMs: metrics.llmLatencyMs
  };
}

function getSchemaIssueCount(error: unknown) {
  const issues = (error as { issues?: unknown }).issues;
  return Array.isArray(issues) ? issues.length : 0;
}

function markValidationFailure(metrics: AnalysisRunMetrics, error: unknown) {
  const validationError = error as { jsonParsePassed?: unknown; schemaValidationPassed?: unknown };

  if (typeof validationError.jsonParsePassed === "boolean") {
    metrics.jsonParsePassed = validationError.jsonParsePassed;
  }

  if (typeof validationError.schemaValidationPassed === "boolean") {
    metrics.schemaValidationPassed = validationError.schemaValidationPassed;
  }
}

function annotateValidationError(error: unknown, jsonParsePassed: boolean, schemaValidationPassed: boolean) {
  if (error && typeof error === "object") {
    Object.assign(error, { jsonParsePassed, schemaValidationPassed });
  }
}
