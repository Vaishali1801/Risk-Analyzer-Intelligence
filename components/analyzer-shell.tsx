"use client";

import { type ReactNode, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  Gauge,
  Scale,
  ShieldAlert,
  Sparkles,
  WandSparkles
} from "lucide-react";
import { AnalysisDashboard } from "@/components/analysis-dashboard";
import { ClauseDeepDive } from "@/components/clause-deep-dive";
import { ReportPreview } from "@/components/report-preview";
import { RiskTable } from "@/components/risk-table";
import { UploadPanel } from "@/components/upload-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useContractAnalysis } from "@/hooks/use-contract-analysis";

const demoContractHref = "/sample-contract.pdf";

export function AnalyzerShell() {
  const { analysis, selectedRisk, setSelectedRisk, loading, error, sourceLabel, riskSignal, analyzeFile, loadDemo } =
    useContractAnalysis();
  const [demoLoading, setDemoLoading] = useState(false);

  function runDemoReview() {
    setDemoLoading(true);
    window.setTimeout(() => {
      loadDemo();
      setDemoLoading(false);
    }, 1400);
  }

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid max-w-7xl gap-5 px-5 py-5 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="space-y-5">
          <div>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              AI-Powered Risk Intelligence for Contracts & Enterprise Agreements
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Long contracts. Missed costly risks. Inconsistent decisions. Use AI to surface critical risks faster, and
              decide with confidence
            </p>
          </div>

          <div className="grid gap-3">
            <BenefitCard
              icon={<ShieldAlert className="h-5 w-5" />}
              title="Avoid costly contract exposure"
              text="Missed clauses can create unlimited liability, revenue loss, or compliance risk"
            />
            <BenefitCard
              icon={<Scale className="h-5 w-5" />}
              title="Bring consistency to risk decisions"
              text="Ensure contracts are evaluated with the same depth and standards across teams"
            />
            <BenefitCard
              icon={<Gauge className="h-5 w-5" />}
              title="Move from analysis to decision"
              text="Not just identify risks - know whether to accept, renegotiate, or walk away"
            />
          </div>
        </div>

        <div className="space-y-3">
          <UploadPanel onAnalyze={analyzeFile} onDemo={runDemoReview} loading={loading} demoLoading={demoLoading} />

          <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              <WhatYouGet />
              <DemoInputCard demoLoading={demoLoading} sourceLabel={sourceLabel} />
            </div>
            <SampleOutputCard />
          </div>

          {error ? (
            <div className="flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-5 px-5 py-5">
        {analysis ? (
          <>
            <div className="rounded-3xl border bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-950">AI review summary</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">{riskSignal}</p>
            </div>
            <AnalysisDashboard analysis={analysis} />
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <RiskTable analysis={analysis} selectedRiskId={selectedRisk?.id} onSelectRisk={setSelectedRisk} />
              <ClauseDeepDive risk={selectedRisk} />
            </div>
            <ReportPreview analysis={analysis} />
          </>
        ) : (
          <PreAnalysisPreview />
        )}
      </section>
    </main>
  );
}

function BenefitCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <Card className="bg-white/85 shadow-sm">
      <CardContent className="flex gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">{text}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WhatYouGet() {
  const items = [
    "Top risks across legal, financial, and operational areas",
    "Clause-level explanation and business impact",
    "Suggested safer wording for risky clauses",
    "Final recommendation: Accept / Renegotiate / Reject"
  ];

  return (
    <Card className="bg-white/90">
      <CardContent className="p-4">
        <h2 className="text-sm font-semibold text-slate-950">What you get in seconds</h2>
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <div key={item} className="flex gap-2 text-xs leading-5 text-slate-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DemoInputCard({ demoLoading, sourceLabel }: { demoLoading: boolean; sourceLabel: string }) {
  return (
    <Card className="bg-white/90">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-950">Demo input contract</h2>
              {demoLoading ? <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> : null}
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-600">
              Northstar / Apex MSA sample used for the demo risk assessment.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={demoContractHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <FileSearch className="mr-1.5 h-3.5 w-3.5" />
                View sample PDF
              </a>
              <a
                href={demoContractHref}
                download
                className="inline-flex items-center rounded-full border bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </a>
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              {demoLoading
                ? "Input contract loaded -> AI review running..."
                : sourceLabel.startsWith("Demo contract")
                  ? sourceLabel
                  : "Ready to preview or analyze this sample agreement."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SampleOutputCard() {
  return (
    <Card className="border-slate-200 bg-white shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-slate-950 p-2 text-white">
              <WandSparkles className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold text-slate-950">Sample AI-generated insight</div>
          </div>
          <Badge className="border-red-200 bg-red-50 text-red-700">High</Badge>
        </div>

        <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
          <OutputLine
            label="Clause"
            value={
              "\u201cSupplier shall be liable for all losses arising from service interruptions, including indirect or consequential damages, without limitation.\u201d"
            }
          />
          <OutputLine label="Risk" value="Unlimited liability exposure including indirect damages" emphasis />
          <OutputLine
            label="Impact"
            value="Exposure is uncapped and extends beyond direct losses, potentially exceeding total contract value and creating significant financial risk"
          />
          <OutputLine
            label="Suggested Change"
            value="Cap liability at a defined multiple of contract value and exclude indirect and consequential damages"
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Recommendation</div>
            <div className="mt-1 text-sm font-semibold text-amber-900">Renegotiate</div>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
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
    <div className="rounded-2xl border bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-950">{label}: </span>
      <span className={emphasis ? "font-semibold text-slate-800" : ""}>{value}</span>
    </div>
  );
}

function PreAnalysisPreview() {
  const tiles = [
    ["Risk dashboard", "Overall risk, top issues, category mix"],
    ["Clause insights", "Understand what is risky and why"],
    ["Safer wording", "Improve clauses quickly"],
    ["Executive summary", "Share clear recommendations"]
  ];

  return (
    <Card className="bg-white/80">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-slate-950">See what the review delivers</h2>
          <p className="text-sm text-slate-500">A concise output designed for fast business decisions.</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {tiles.map(([title, text]) => (
            <div key={title} className="rounded-2xl border bg-white p-4">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
              <div className="mt-2 flex items-center gap-2 text-xs leading-5 text-slate-600">
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                {text}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
