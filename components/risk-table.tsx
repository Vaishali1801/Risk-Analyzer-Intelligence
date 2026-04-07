"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RISK_CATEGORIES, SEVERITIES, severityRank, severityStyles } from "@/constants/risk";
import { cn, truncate } from "@/lib/utils";
import type { ContractAnalysis, ContractRisk, RiskCategory, Severity } from "@/types/contract";

type SortKey = "severity" | "confidence" | "category";

type RiskTableProps = {
  analysis: ContractAnalysis;
  selectedRiskId?: string;
  onSelectRisk: (risk: ContractRisk) => void;
};

export function RiskTable({ analysis, selectedRiskId, onSelectRisk }: RiskTableProps) {
  const [severity, setSeverity] = useState<Severity | "All">("All");
  const [category, setCategory] = useState<RiskCategory | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [expanded, setExpanded] = useState<string | null>(null);

  const risks = useMemo(() => {
    return analysis.risks
      .filter((risk) => severity === "All" || risk.severity === severity)
      .filter((risk) => category === "All" || risk.category === category)
      .sort((a, b) => {
        if (sortKey === "severity") return severityRank[b.severity] - severityRank[a.severity];
        if (sortKey === "confidence") return b.confidence - a.confidence;
        return a.category.localeCompare(b.category);
      });
  }, [analysis.risks, category, severity, sortKey]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Structured Risk Register</CardTitle>
        <CardDescription>Filterable, sortable clause-level findings with validated fields.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as Severity | "All")}
              className="h-10 rounded-xl border bg-white px-3 text-sm"
            >
              <option value="All">All severities</option>
              {SEVERITIES.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as RiskCategory | "All")}
              className="h-10 rounded-xl border bg-white px-3 text-sm"
            >
              <option value="All">All categories</option>
              {RISK_CATEGORIES.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSortKey(sortKey === "severity" ? "confidence" : sortKey === "confidence" ? "category" : "severity")}
          >
            <ArrowUpDown className="mr-2 h-4 w-4" />
            Sort: {sortKey}
          </Button>
        </div>

        <div className="overflow-hidden rounded-2xl border">
          <div className="hidden grid-cols-[1.5fr_0.8fr_0.7fr_0.8fr_0.8fr_0.7fr_0.5fr] gap-3 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:grid">
            <div>Risk</div>
            <div>Category</div>
            <div>Severity</div>
            <div>Clause Ref</div>
            <div>Mitigability</div>
            <div>Confidence</div>
            <div>Action</div>
          </div>

          {risks.map((risk) => {
            const isExpanded = expanded === risk.id;
            const isSelected = selectedRiskId === risk.id;

            return (
              <div key={risk.id} className={cn("border-t bg-white", isSelected && "bg-slate-50")}>
                <button
                  type="button"
                  onClick={() => {
                    onSelectRisk(risk);
                    setExpanded(isExpanded ? null : risk.id);
                  }}
                  className="grid w-full gap-3 px-4 py-4 text-left text-sm transition hover:bg-slate-50 lg:grid-cols-[1.5fr_0.8fr_0.7fr_0.8fr_0.8fr_0.7fr_0.5fr] lg:items-center"
                >
                  <div>
                    <div className="font-semibold text-slate-950">{risk.title}</div>
                    <div className="mt-1 text-xs text-slate-500 lg:hidden">{risk.category} | {risk.clauseRef}</div>
                  </div>
                  <div className="hidden text-slate-600 lg:block">{risk.category}</div>
                  <div>
                    <Badge className={severityStyles[risk.severity]}>{risk.severity}</Badge>
                  </div>
                  <div className="hidden text-slate-600 lg:block">{risk.clauseRef}</div>
                  <div className="hidden text-slate-600 lg:block">{risk.mitigability}</div>
                  <div className="hidden text-slate-600 lg:block">{Math.round(risk.confidence * 100)}%</div>
                  <div className="hidden lg:block">
                    <ChevronDown className={cn("h-4 w-4 transition", isExpanded && "rotate-180")} />
                  </div>
                </button>

                {isExpanded ? (
                  <div className="border-t bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-700">
                    <p className="font-medium text-slate-950">Clause excerpt</p>
                    <p className="mt-1">{truncate(risk.clauseText, 420)}</p>
                    <Button type="button" size="sm" className="mt-4" onClick={() => onSelectRisk(risk)}>
                      Open Deep Dive
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
