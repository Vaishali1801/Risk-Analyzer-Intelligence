"use client";

import { useRouter } from "next/navigation";
import { startTransition, type ReactNode, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Gauge,
  Scale,
  ShieldAlert,
  WandSparkles
} from "lucide-react";
import { UploadPanel } from "@/components/upload-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useContractAnalysis } from "@/hooks/use-contract-analysis";
import { writeAnalysisSession } from "@/lib/analysis-session";

const demoContractHref = "/api/demo/document";

export function AnalyzerShell() {
  const { analysisId, analysis, source, activeFlow, loading, error, analyzeFile, analyzeText, loadDemo } = useContractAnalysis();
  const router = useRouter();
  const redirectedAnalysisKey = useRef<string | null>(null);

  useEffect(() => {
    if (!analysis || !source) return;

    const analysisKey = `${analysis.contractTitle}:${analysis.riskSummary.total}:${source.sourceKind}:${source.documentName}`;
    if (redirectedAnalysisKey.current === analysisKey) return;

    redirectedAnalysisKey.current = analysisKey;
    writeAnalysisSession({
      analysisId,
      analysis,
      source,
      savedAt: new Date().toISOString()
    });

    startTransition(() => {
      router.push("/analysis");
    });
  }, [analysis, analysisId, router, source]);

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-4 lg:grid-cols-[0.98fr_1.02fr] lg:items-start">
        <div className="space-y-4 pt-1">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 lg:whitespace-nowrap xl:text-5xl">
              AI-Powered Risk Intelligence
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-6 text-slate-600 md:text-lg">
              {"Use AI to surface critical risks across contracts, RFPs, and business agreements \u2014 and make faster, more consistent decisions."}
            </p>
          </div>

          <div className="grid gap-2.5">
            <BenefitCard
              icon={<ShieldAlert className="h-5 w-5" />}
              title="Rapid AI Scan"
              text="Instantly processes your document for known and hidden risks."
            />
            <BenefitCard
              icon={<Scale className="h-5 w-5" />}
              title="Global Risk Scoring"
              text="Assess financial, legal, and operational exposure with a comprehensive score."
            />
            <BenefitCard
              icon={<Gauge className="h-5 w-5" />}
              title="Pinpoint Specific Clause Issues"
              text="Identify liability, payment ambiguity, and more."
            />
          </div>

          <RiskPromptCard />
        </div>

        <div className="space-y-3">
          <UploadPanel
            onAnalyzeFile={analyzeFile}
            onAnalyzeText={analyzeText}
            onDemo={loadDemo}
            activeFlow={activeFlow}
            loading={loading}
            demoHref={demoContractHref}
          />
          <SampleOutputCard />

          {error ? (
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function BenefitCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card className="border-slate-200 bg-white/90 shadow-sm">
      <CardContent className="flex gap-3 p-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-medium text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskPromptCard() {
  const problemPoints = [
    "Standard-looking clauses with hidden exposure",
    "Critical terms missed under time pressure",
    "Decisions driven without structured analysis"
  ];

  return (
    <section className="py-2">
      <h2 className="text-base font-semibold tracking-tight text-slate-950">Hidden risks most teams miss</h2>
      <ul className="mt-3 list-disc space-y-2.5 pl-5 text-sm leading-6 text-slate-600">
        {problemPoints.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <div className="mt-10">
        <p className="text-base font-semibold leading-6 text-slate-900">
          How many of these risks are hiding in your document?
        </p>
        <p className="mt-1 text-sm font-normal leading-5 text-slate-500">Find out in seconds.</p>
      </div>
    </section>
  );
}

function SampleOutputCard() {
  return (
    <Card className="border-slate-200 bg-white shadow-md">
      <CardContent className="space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-slate-900 p-2 text-white">
              <WandSparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-950">Example analysis output</div>
              <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Static preview</div>
            </div>
          </div>
          <Badge className="border-red-200 bg-red-50 text-red-700">High</Badge>
        </div>

        <div className="space-y-2 text-xs leading-[1.15rem] text-slate-600">
          <OutputLine
            label="Clause"
            value={
              "\u201cSupplier shall be liable for all losses arising from service interruptions, including indirect or consequential damages, without limitation.\u201d"
            }
          />
          <OutputLine label="Risk" value="Unlimited liability exposure" emphasis />
          <OutputLine label="Impact" value="Exposure may exceed total contract value." />
          <OutputLine label="Suggested Change" value="Cap liability and exclude indirect damages." />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Recommendation</div>
            <div className="mt-1 text-sm font-semibold text-amber-900">Renegotiate</div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-red-700">Overall Risk</div>
            <div className="mt-1 text-sm font-semibold text-red-900">High</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OutputLine({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2">
      <span className="font-semibold text-slate-950">{label}: </span>
      <span className={emphasis ? "font-semibold text-slate-800" : ""}>{value}</span>
    </div>
  );
}
