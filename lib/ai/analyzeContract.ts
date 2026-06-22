import OpenAI from "openai";
import { buildAnalyzeContractPrompt } from "@/lib/ai/prompts/analyze-contract-prompt";
import { buildClauseAwareAnalysisInput } from "@/lib/clauses/input";
import { ContractAnalysisSchema } from "@/schemas/contract-analysis";
import type { ContractAnalysis } from "@/types/contract";
import { applyDecisionLogic } from "./decision";
import { createFallbackAnalysis } from "./fallback";

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

export function buildClauseAwarePrompt(text: string): string {
  const clauseAwareInput = buildClauseAwareAnalysisInput(text);
  return buildAnalyzeContractPrompt({ contractText: clauseAwareInput });
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
  const parsed: unknown = JSON.parse(repaired);
  const validated = ContractAnalysisSchema.parse(parsed);
  // AI decision fields stay schema-compatible; output-model helpers own displayed Risk Level and Final Review decisions.
  return applyDecisionLogic(validated);
}

async function callOpenAI(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to .env.local to analyze uploaded contracts.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ]
  });

  return completion.choices[0]?.message?.content ?? "";
}

type AnalyzeContractOptions = {
  allowFallbackAnalysis?: boolean;
};

export async function analyzeContract(text: string, options: AnalyzeContractOptions = {}): Promise<ContractAnalysis> {
  const allowFallbackAnalysis = options.allowFallbackAnalysis ?? true;

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to .env.local to analyze uploaded contracts.");
  }

  const prompt = buildPrompt(text);
  let firstResponse = "";

  try {
    firstResponse = await callOpenAI(prompt);
    return validateResponse(firstResponse);
  } catch (firstError) {
    try {
      const repairPrompt = `${prompt}

Your previous output was invalid or did not match the schema. Return corrected JSON only. No markdown. No commentary.
Previous output:
${firstResponse || String(firstError)}`;

      const retryResponse = await callOpenAI(repairPrompt);
      return validateResponse(retryResponse);
    } catch (retryError) {
      const reason = retryError instanceof Error ? retryError.message : "Model output failed validation after retry.";
      if (!allowFallbackAnalysis) {
        throw new Error(reason);
      }

      return createFallbackAnalysis(reason);
    }
  }
}
