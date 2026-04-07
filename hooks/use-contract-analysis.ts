"use client";

import { useEffect, useMemo, useState } from "react";
import { demoAnalysis } from "@/data/demo-contract";
import type { AnalyzeApiResponse, ContractAnalysis, ContractRisk } from "@/types/contract";

export function useContractAnalysis() {
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<ContractRisk | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("No contract analyzed yet");

  useEffect(() => {
    if (analysis) setSelectedRisk(analysis.risks[0]);
  }, [analysis]);

  const riskSignal = useMemo(() => {
    if (!analysis) return "Upload a contract or use demo mode to generate a validated risk memo.";
    return `${analysis.riskSummary.high} high, ${analysis.riskSummary.medium} medium, ${analysis.riskSummary.low} low risks detected.`;
  }, [analysis]);

  function scrollToDashboard() {
    window.setTimeout(() => document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth" }), 80);
  }

  async function analyzeFile(file: File) {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData
      });
      const payload = (await response.json()) as AnalyzeApiResponse;

      if (!response.ok || !payload.analysis) {
        throw new Error([payload.error, payload.recovery].filter(Boolean).join(" "));
      }

      setAnalysis(payload.analysis);
      setSourceLabel(
        `${payload.fileName ?? file.name} | ${payload.extractedCharacters?.toLocaleString() ?? "0"} extracted characters`
      );
      scrollToDashboard();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to analyze this contract.");
    } finally {
      setLoading(false);
    }
  }

  function loadDemo() {
    setError(null);
    setAnalysis(demoAnalysis);
    setSourceLabel("Demo contract | no API call required");
    scrollToDashboard();
  }

  return {
    analysis,
    selectedRisk,
    setSelectedRisk,
    loading,
    error,
    sourceLabel,
    riskSignal,
    analyzeFile,
    loadDemo
  };
}
