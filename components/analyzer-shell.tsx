"use client";

import type { ReactNode } from "react";
import { AlertTriangle, BrainCircuit, CheckCircle2, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { ClauseDeepDive } from "@/components/clause-deep-dive";
import { ReportPreview } from "@/components/report-preview";
import { RiskTable } from "@/components/risk-table";
import { UploadPanel } from "@/components/upload-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useContractAnalysis } from "@/hooks/use-contract-analysis";

export function AnalyzerShell() {
  const { analysis, selectedRisk, setSelectedRisk, loading, error, sourceLabel, riskSignal, analyzeFile, loadDemo } =
    useContractAnalysis();

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-8 lg:grid-cols-[1fr_0.9fr] lg:py-14">
        <div className="flex flex-col justify-center">
          <Badge className="mb-6 w-fit border-slate-200 bg-white/80 text-slate-700">Enterprise AI contract intelligence</Badge>
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-slate-950 md:text-7xl">
            Contract Risk Analyzer
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            AI-assisted contract review that turns long agreements into structured risks, clause-level rationale,
            deterministic decisions, and executive-ready reports.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <SignalCard icon={<BrainCircuit className="h-5 w-5" />} label="Controlled GenAI pipeline" />
            <SignalCard icon={<ShieldCheck className="h-5 w-5" />} label="Validated JSON only" />
            <SignalCard icon={<CheckCircle2 className="h-5 w-5" />} label="Rule-based decision logic" />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <InfoPanel
              title="Why AI here?"
              items={[
                "Long contracts create time pressure and inconsistent review quality.",
                "Structured extraction makes risk discussions repeatable across teams.",
                "Clause-level evidence helps legal, procurement, and executives align quickly."
              ]}
            />
            <InfoPanel
              title="What outputs you get"
              items={[
                "Risk dashboard, severity mix, and category concentration.",
                "Structured risk table with clause references and confidence.",
                "Editable safer wording and a downloadable PDF report."
              ]}
            />
          </div>
        </div>

        <div className="lg:pt-10">
          <UploadPanel onAnalyze={analyzeFile} onDemo={loadDemo} loading={loading} />
          <div className="mt-4 rounded-2xl border bg-white/80 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-950">Status:</span> {sourceLabel}
          </div>
          {error ? (
            <div className="mt-4 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-y bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 md:grid-cols-4">
          <Feature icon={<FileSearch className="h-5 w-5" />} title="PDF/DOCX parsing" text="Extracts and preprocesses contract text server-side." />
          <Feature icon={<BrainCircuit className="h-5 w-5" />} title="OpenAI analysis" text="Single LLM pipeline with strict JSON schema enforcement." />
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Decision rules" text="Accept, renegotiate, or reject is computed outside the model." />
          <Feature icon={<Sparkles className="h-5 w-5" />} title="Executive report" text="Preview and export a concise stakeholder-ready PDF." />
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        {analysis ? (
          <>
            <div className="rounded-3xl border bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-950">30-second readout</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{riskSignal}</p>
            </div>
            <AnalysisDashboard analysis={analysis} />
            <div className="grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
              <RiskTable analysis={analysis} selectedRiskId={selectedRisk?.id} onSelectRisk={setSelectedRisk} />
              <ClauseDeepDive risk={selectedRisk} />
            </div>
            <ReportPreview analysis={analysis} />
          </>
        ) : (
          <EmptyState />
        )}
      </section>
    </main>
  );
}

function SignalCard({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-white/80 p-4 text-sm font-medium text-slate-700">
      <div className="rounded-xl bg-slate-950 p-2 text-white">{icon}</div>
      {label}
    </div>
  );
}

function InfoPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="bg-white/80">
      <CardContent className="p-5">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <p key={item} className="text-sm leading-6 text-slate-600">
              {item}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Feature({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed bg-white/70 p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <FileSearch className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-slate-950">No analysis yet</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
        Upload a PDF/DOCX contract or try the demo. Results will appear here as a dashboard, risk table, clause deep
        dive, and report preview.
      </p>
    </div>
  );
}
