"use client";

import { useState } from "react";
import { demoAnalysis, demoContractText } from "@/data/demo-contract";
import { preprocessContractText } from "@/lib/parsers/preprocess";
import type { AnalysisSource, AnalyzeApiResponse, ContractAnalysis } from "@/types/contract";

export function useContractAnalysis() {
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [source, setSource] = useState<AnalysisSource | null>(null);
  const [activeFlow, setActiveFlow] = useState<"analyze" | "demo" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyAnalysisPayload(payload: AnalyzeApiResponse) {
    if (!payload.analysis || !payload.source) {
      throw new Error([payload.error, payload.recovery].filter(Boolean).join(" ") || "Unable to analyze this contract.");
    }

    setAnalysis(payload.analysis);
    setAnalysisId(payload.analysisId ?? null);
    setSource(payload.source);
  }

  async function analyzeFile(file: File) {
    setLoading(true);
    setActiveFlow("analyze");
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok) {
        throw new Error([payload.error, payload.recovery].filter(Boolean).join(" "));
      }

      applyAnalysisPayload(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze this contract.");
    } finally {
      setLoading(false);
      setActiveFlow(null);
    }
  }

  async function analyzeText(text: string) {
    setLoading(true);
    setActiveFlow("analyze");
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          documentName: "Pasted Document"
        })
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok) {
        throw new Error([payload.error, payload.recovery].filter(Boolean).join(" "));
      }

      applyAnalysisPayload(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze this document text.");
    } finally {
      setLoading(false);
      setActiveFlow(null);
    }
  }

  async function loadDemo() {
    setLoading(true);
    setActiveFlow("demo");
    setError(null);

    try {
      applyAnalysisPayload({
        analysisId: null,
        analysis: demoAnalysis,
        source: {
          sourceKind: "demo",
          documentName: demoAnalysis.contractTitle,
          extractedCharacters: preprocessContractText(demoContractText).length
        }
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load the demo analysis.");
    } finally {
      setLoading(false);
      setActiveFlow(null);
    }
  }

  return {
    analysisId,
    analysis,
    source,
    activeFlow,
    loading,
    error,
    analyzeFile,
    analyzeText,
    loadDemo
  };
}
