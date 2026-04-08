"use client";

import { type ReactNode, useState } from "react";
import {
  AlertTriangle,
  Gauge,
  Scale,
  ShieldAlert,
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
  const { analysis, selectedRisk, setSelectedRisk, loading, error, riskSignal, analyzeFile, loadDemo } =
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
        </div>

        <div className="space-y-3">
          <UploadPanel
            onAnalyze={analyzeFile}
            onDemo={runDemoReview}
            loading={loading}
            demoLoading={demoLoading}
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

      {analysis ? (
        <section className="mx-auto max-w-7xl space-y-5 px-5 py-5">
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
        </section>
      ) : null}
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

function SampleOutputCard() {
  return (
    <Card className="border-slate-200 bg-white shadow-md">
      <CardContent className="space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-slate-900 p-2 text-white">
              <WandSparkles className="h-3.5 w-3.5" />
            </div>
            <div className="text-sm font-semibold text-slate-950">Sample AI-generated insight</div>
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
