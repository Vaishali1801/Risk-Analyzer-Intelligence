import OpenAI from "openai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildClauseAction } from "@/lib/reporting/actions";

export const runtime = "nodejs";
export const maxDuration = 30;

const AskAiActionSchema = z.enum(["simplify", "safer_wording", "hidden_risks", "compare_standard"]);

const AskAiRequestSchema = z.object({
  actionType: AskAiActionSchema,
  riskTitle: z.string().optional().default(""),
  category: z.string().optional().default("Uncategorized"),
  severity: z.string().optional().default("Unknown"),
  sectionRef: z.string().optional().default(""),
  fullClauseText: z.string().optional().default(""),
  flaggedText: z.string().optional().default(""),
  whyItMatters: z.string().optional().default(""),
  businessImpact: z.string().optional().default(""),
  currentDraft: z.string().optional().default("")
});

type AskAiAction = z.infer<typeof AskAiActionSchema>;
type AskAiRequest = z.infer<typeof AskAiRequestSchema>;

const ACTION_FALLBACKS: Record<AskAiAction, Parameters<typeof buildClauseAction>[0]> = {
  simplify: "simplify",
  safer_wording: "safer",
  hidden_risks: "hidden",
  compare_standard: "standard"
};

const ASK_AI_TIMEOUT_MS = 18000;
const MAX_OUTPUT_LENGTH = 2200;

export async function POST(request: Request) {
  try {
    const payload = AskAiRequestSchema.parse(await request.json());
    const aiOutput = await tryGenerateAskAiResponse(payload);
    const output = normalizeOutput(aiOutput) || getFallbackOutput(payload);

    return NextResponse.json({ output });
  } catch {
    return NextResponse.json({ output: "" });
  }
}

async function tryGenerateAskAiResponse(payload: AskAiRequest) {
  if (!process.env.OPENAI_API_KEY) return "";

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await withTimeout(
      client.chat.completions.create({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are an enterprise contract risk assistant. Be concise, preserve clause meaning unless safer wording is requested, avoid hallucinating facts, use business/legal review language, do not claim legal advice, and return only the requested output."
          },
          {
            role: "user",
            content: buildPrompt(payload)
          }
        ]
      }),
      ASK_AI_TIMEOUT_MS
    );

    return completion.choices[0]?.message?.content ?? "";
  } catch {
    return "";
  }
}

function buildPrompt(payload: AskAiRequest) {
  const actionInstruction = getActionInstruction(payload.actionType);
  const clause = payload.fullClauseText || payload.flaggedText || payload.currentDraft;

  return `${actionInstruction}

Risk context:
- Risk title: ${payload.riskTitle || "Unavailable"}
- Category: ${payload.category || "Uncategorized"}
- Severity: ${payload.severity || "Unknown"}
- Section: ${payload.sectionRef || "Unavailable"}
- Flagged text: ${payload.flaggedText || "Unavailable"}
- Why it matters: ${payload.whyItMatters || "Unavailable"}
- Business impact: ${payload.businessImpact || "Unavailable"}

Current draft:
${payload.currentDraft || "Unavailable"}

Clause:
${clause || "Unavailable"}`;
}

function getActionInstruction(actionType: AskAiAction) {
  if (actionType === "simplify") {
    return "Rewrite the current draft or clause in simpler business-friendly language. Preserve legal meaning. Do not add new obligations unless clearly marked as optional.";
  }

  if (actionType === "safer_wording") {
    return "Produce a stronger revised clause that reduces customer/business risk. Keep it concise, contract-ready, and practical for negotiation.";
  }

  if (actionType === "hidden_risks") {
    return "Identify additional risks or missing protections in concise bullet points. Do not invent facts not present in the clause.";
  }

  return "Compare the clause against typical market or industry contracting expectations. Explain where it is stricter, weaker, or unusual in concise business-readable language.";
}

function getFallbackOutput(payload: AskAiRequest) {
  try {
    return normalizeOutput(
      buildClauseAction(ACTION_FALLBACKS[payload.actionType], {
        category: payload.category,
        whyItMatters: payload.whyItMatters,
        originalRecommendedDraft: payload.currentDraft
      })
    );
  } catch {
    return "";
  }
}

function normalizeOutput(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+$/g, "").trim().slice(0, MAX_OUTPUT_LENGTH);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error("Ask AI request timed out.")), timeoutMs);
    })
  ]);
}
