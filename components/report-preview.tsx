"use client";

import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { decisionStyles, severityStyles } from "@/constants/risk";
import { downloadReportPdf } from "@/lib/reporting/pdf";
import type { ContractAnalysis } from "@/types/contract";

type ReportPreviewProps = {
  analysis: ContractAnalysis;
};

export function ReportPreview({ analysis }: ReportPreviewProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>Final Report Preview</CardTitle>
          <CardDescription>Executive-ready summary with recommendation, top risks, and next actions.</CardDescription>
        </div>
        <Button type="button" onClick={() => downloadReportPdf(analysis)}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Contract Risk Report</p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">{analysis.contractTitle}</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={severityStyles[analysis.overallRiskLevel]}>{analysis.overallRiskLevel} risk</Badge>
              <Badge className={decisionStyles[analysis.decisionRecommendation]}>{analysis.decisionRecommendation}</Badge>
            </div>
          </div>

          <div className="grid gap-6 py-6 lg:grid-cols-[1fr_0.8fr]">
            <div>
              <h4 className="font-semibold text-slate-950">Executive summary</h4>
              <p className="mt-3 text-sm leading-7 text-slate-700">{analysis.executiveSummary}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <h4 className="font-semibold text-slate-950">Recommendation rationale</h4>
              <p className="mt-3 text-sm leading-7 text-slate-700">{analysis.decisionRationale}</p>
            </div>
          </div>

          <div className="grid gap-4 border-t pt-6 md:grid-cols-2">
            <ReportList title="Top critical risks" items={analysis.topCriticalRisks.slice(0, 5)} />
            <ReportList title="Suggested next actions" items={analysis.nextActions} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-semibold text-slate-950">{title}</h4>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-2xl border bg-white px-4 py-3 text-sm leading-6 text-slate-700">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
