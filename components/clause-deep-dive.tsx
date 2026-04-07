"use client";

import { type ReactNode, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { severityStyles } from "@/constants/risk";
import { buildClauseAction } from "@/lib/reporting/actions";
import type { ContractRisk } from "@/types/contract";

type ClauseDeepDiveProps = {
  risk?: ContractRisk;
};

export function ClauseDeepDive({ risk }: ClauseDeepDiveProps) {
  const [improvedText, setImprovedText] = useState("");
  const [action, setAction] = useState<"simplify" | "safer" | "hidden" | "standard">("safer");

  useEffect(() => {
    setImprovedText(risk?.suggestedImprovement ?? "");
    setAction("safer");
  }, [risk?.id, risk?.suggestedImprovement]);

  if (!risk) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Clause Deep Dive</CardTitle>
          <CardDescription>Select a risk to inspect clause evidence and safer wording.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border border-dashed bg-slate-50 p-8 text-sm text-slate-500">
            No risk selected yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={severityStyles[risk.severity]}>{risk.severity}</Badge>
          <Badge className="border-slate-200 bg-slate-50 text-slate-700">{risk.category}</Badge>
          <Badge className="border-slate-200 bg-slate-50 text-slate-700">{Math.round(risk.confidence * 100)}% confidence</Badge>
        </div>
        <CardTitle className="pt-2">{risk.title}</CardTitle>
        <CardDescription>{risk.clauseRef} | Mitigability: {risk.mitigability}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-2xl border bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Full Clause</div>
          <p className="mt-3 text-sm leading-7 text-slate-700">{risk.clauseText}</p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Highlighted Risk</div>
          <p className="mt-3 text-sm leading-7 text-amber-900">{risk.highlightedText}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoBlock title="Why Risky" text={risk.whyRisky} />
          <InfoBlock title="Impact If Ignored" text={risk.impactIfIgnored} />
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <ActionButton active={action === "simplify"} onClick={() => setAction("simplify")}>Simplify clause</ActionButton>
            <ActionButton active={action === "safer"} onClick={() => setAction("safer")}>Safer wording</ActionButton>
            <ActionButton active={action === "hidden"} onClick={() => setAction("hidden")}>Hidden risks</ActionButton>
            <ActionButton active={action === "standard"} onClick={() => setAction("standard")}>Compare standard</ActionButton>
          </div>
          <div className="rounded-2xl border bg-white p-4 text-sm leading-7 text-slate-700">
            {buildClauseAction(action, risk)}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-950">Editable improved wording</label>
          <Textarea value={improvedText} onChange={(event) => setImprovedText(event.target.value)} className="mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</div>
      <p className="mt-3 text-sm leading-7 text-slate-700">{text}</p>
    </div>
  );
}

function ActionButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <Button type="button" variant={active ? "default" : "secondary"} size="sm" onClick={onClick}>
      {children}
    </Button>
  );
}
