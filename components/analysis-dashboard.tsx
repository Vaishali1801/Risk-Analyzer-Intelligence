"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { categoryPalette, decisionStyles, severityStyles } from "@/constants/risk";
import { percent } from "@/lib/utils";
import type { ContractAnalysis, RiskCategory, Severity } from "@/types/contract";

type AnalysisDashboardProps = {
  analysis: ContractAnalysis;
};

export function AnalysisDashboard({ analysis }: AnalysisDashboardProps) {
  const severityData: { name: Severity; value: number }[] = [
    { name: "High", value: analysis.riskSummary.high },
    { name: "Medium", value: analysis.riskSummary.medium },
    { name: "Low", value: analysis.riskSummary.low }
  ];

  const categoryData = Object.entries(analysis.riskSummary.byCategory).map(([name, value]) => ({
    name: name as RiskCategory,
    value
  }));

  const dominantCategory = [...categoryData].sort((a, b) => b.value - a.value)[0];

  return (
    <section id="dashboard" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Overall Risk" value={analysis.overallRiskLevel} badgeClass={severityStyles[analysis.overallRiskLevel]} />
        <MetricCard
          label="Decision"
          value={analysis.decisionRecommendation}
          badgeClass={decisionStyles[analysis.decisionRecommendation]}
        />
        <MetricCard label="Total Risks" value={String(analysis.riskSummary.total)} detail="Validated structured findings" />
        <MetricCard
          label="Severity Mix"
          value={`${analysis.riskSummary.high} / ${analysis.riskSummary.medium} / ${analysis.riskSummary.low}`}
          detail="High / Medium / Low"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
            <CardDescription>{analysis.contractTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-7 text-slate-700">{analysis.executiveSummary}</p>
            <div className="rounded-2xl border bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Decision Rationale</div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{analysis.decisionRationale}</p>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-950">Top critical risks</div>
              <div className="mt-3 grid gap-2">
                {analysis.topCriticalRisks.slice(0, 3).map((risk) => (
                  <div key={risk} className="rounded-2xl border bg-white px-4 py-3 text-sm text-slate-700">
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
            <CardDescription>
              {dominantCategory ? `${percent(dominantCategory.value, analysis.riskSummary.total)} of risk is ${dominantCategory.name.toLowerCase()}` : "No category concentration"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" innerRadius={54} outerRadius={86} paddingAngle={4}>
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={categoryPalette[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} fill="#0f172a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommended Next Actions</CardTitle>
          <CardDescription>Rule-based next steps aligned to the final recommendation.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {analysis.nextActions.map((action, index) => (
              <div key={action} className="rounded-2xl border bg-white p-4">
                <Badge className="border-slate-200 bg-slate-50 text-slate-700">Step {index + 1}</Badge>
                <p className="mt-3 text-sm leading-6 text-slate-700">{action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function MetricCard({ label, value, detail, badgeClass }: { label: string; value: string; detail?: string; badgeClass?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
        <div className="mt-4">
          {badgeClass ? (
            <Badge className={badgeClass}>{value}</Badge>
          ) : (
            <div className="text-3xl font-semibold text-slate-950">{value}</div>
          )}
        </div>
        {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
