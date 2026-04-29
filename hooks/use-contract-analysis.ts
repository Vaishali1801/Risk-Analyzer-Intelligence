"use client";

import { useEffect, useState } from "react";
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

  function beginFlow(flow: "analyze" | "demo") {
    setLoading(true);
    setActiveFlow(flow);
    setError(null);
  }

  function failFlow(message: string) {
    setError(message);
    setLoading(false);
    setActiveFlow(null);
  }

  function applyAnalysisPayload(payload: AnalyzeApiResponse) {
    if (!payload.analysis || !payload.source) {
      throw new Error([payload.error, payload.recovery].filter(Boolean).join(" ") || "Unable to analyze this contract.");
    }

    setAnalysis(payload.analysis);
    setAnalysisId(payload.analysisId ?? null);
    setSource(payload.source);
  }

  useEffect(() => {
    if (!analysis || !source) return;

    setLoading(true);
  }, [analysis, source]);

  async function analyzeFile(file: File) {
    beginFlow("analyze");

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
      failFlow(caught instanceof Error ? caught.message : "Unable to analyze this contract.");
    }
  }

  async function analyzeText(text: string) {
    beginFlow("analyze");

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
      failFlow(caught instanceof Error ? caught.message : "Unable to analyze this document text.");
    }
  }

  async function loadDemo() {
    beginFlow("demo");

    try {
      const response = await fetch("/api/demo");
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok) {
        throw new Error("Unable to load the live demo analysis.");
      }

      applyAnalysisPayload(payload);
    } catch (caught) {
      console.warn("Demo API unavailable; using bundled demo analysis.", caught);
      applyDemoFallback();
    }
  }

  function applyDemoFallback() {
    applyAnalysisPayload({
      analysisId: null,
      analysis: demoAnalysis,
      source: {
        sourceKind: "demo",
        documentName: demoAnalysis.contractTitle,
        extractedCharacters: preprocessContractText(demoContractText).length
      }
    });
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
