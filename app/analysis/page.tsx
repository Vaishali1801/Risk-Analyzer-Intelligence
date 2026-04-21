import type { Metadata } from "next";
import { AnalysisWorkspace } from "@/components/analysis-workspace";

export const metadata: Metadata = {
  title: "Risk Analysis Results"
};

export default function AnalysisPage() {
  return <AnalysisWorkspace />;
}
