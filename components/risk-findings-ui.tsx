"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SEVERITIES, severityStyles } from "@/constants/risk";
import { buildClauseAction } from "@/lib/reporting/actions";
import { cn, truncate } from "@/lib/utils";
import type { ContractRisk, RiskCategory, Severity } from "@/types/contract";

export type RiskSortKey =
  | "severity-desc"
  | "severity-asc"
  | "confidence-desc"
  | "confidence-asc"
  | "title-asc"
  | "title-desc"
  | "category-asc"
  | "category-desc";
export type RiskReviewLens = "safer" | "simplify" | "hidden" | "standard";
export type RiskReviewStatus = "Pending Review" | "Accepted Risk" | "Action Required";
export type RiskPanelFocusTarget = "summary" | "ask-ai";

type RiskFindingsTableProps = {
  risks: ContractRisk[];
  totalRiskCount: number;
  search: string;
  severity: Severity | "All";
  category: RiskCategory | "All";
  status: RiskReviewStatus | "All";
  categoryOptions: RiskCategory[];
  sortKey: RiskSortKey;
  selectedRiskId?: string;
  riskStatuses: Record<string, RiskReviewStatus>;
  onSearchChange: (value: string) => void;
  onSeverityChange: (value: Severity | "All") => void;
  onCategoryChange: (value: RiskCategory | "All") => void;
  onStatusChange: (value: RiskReviewStatus | "All") => void;
  onSortChange: (value: RiskSortKey) => void;
  onReviewRisk: (risk: ContractRisk) => void;
  onAskAi: (risk: ContractRisk) => void;
};

type RiskDecisionPanelProps = {
  open: boolean;
  risk?: ContractRisk;
  status: RiskReviewStatus;
  reviewLens: RiskReviewLens;
  draftText: string;
  focusTarget: RiskPanelFocusTarget;
  onClose: () => void;
  onReviewLensChange: (value: RiskReviewLens) => void;
  onDraftTextChange: (value: string) => void;
  onResetDraft: () => void;
  onStatusChange: (value: RiskReviewStatus) => void;
};

const SORT_OPTIONS: { value: RiskSortKey; label: string }[] = [
  { value: "severity-desc", label: "Highest Severity" },
  { value: "severity-asc", label: "Lowest Severity" },
  { value: "confidence-desc", label: "Highest Confidence" },
  { value: "confidence-asc", label: "Lowest Confidence" },
  { value: "category-asc", label: "Category A-Z" },
  { value: "category-desc", label: "Category Z-A" }
];

const REVIEW_LENSES: { key: RiskReviewLens; label: string }[] = [
  { key: "simplify", label: "Simplify clause" },
  { key: "safer", label: "Suggest safer wording" },
  { key: "hidden", label: "Identify hidden risks" },
  { key: "standard", label: "Compare with industry standard" }
];

export const RISK_REVIEW_STATUSES: RiskReviewStatus[] = ["Pending Review", "Accepted Risk", "Action Required"];

const riskReviewStatusStyles: Record<RiskReviewStatus, string> = {
  "Pending Review": "border-slate-200 bg-slate-100 text-slate-700",
  "Accepted Risk": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Action Required": "border-rose-200 bg-rose-50 text-rose-700"
};

const toolbarSelectClassName =
  "h-9 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-[0.82rem] font-medium text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10";
const headerFilterSelectClassName =
  "h-7 w-full appearance-none rounded-md border border-slate-200 bg-white/95 pl-2.5 pr-7 text-[0.72rem] font-medium text-slate-600 shadow-sm outline-none transition hover:border-slate-300 focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10";
const compactBadgeClassName = "px-2 py-[0.22rem] text-[0.68rem] font-semibold";

const STATUS_FILTER_OPTIONS: { value: RiskReviewStatus | "All"; label: string }[] = [
  { value: "All", label: "All" },
  { value: "Pending Review", label: "Pending" },
  { value: "Accepted Risk", label: "Accepted" },
  { value: "Action Required", label: "Action Req." }
];

export function RiskFindingsTable({
  risks,
  totalRiskCount,
  search,
  severity,
  category,
  status,
  categoryOptions,
  sortKey,
  selectedRiskId,
  riskStatuses,
  onSearchChange,
  onSeverityChange,
  onCategoryChange,
  onStatusChange,
  onSortChange,
  onReviewRisk,
  onAskAi
}: RiskFindingsTableProps) {
  const emptyStateMessage =
    totalRiskCount === 0 ? "No risks detected for this document." : "No risks match the current filters.";

  return (
    <Card className="border-slate-200 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">Risk Register</h2>
          <div className="text-sm font-medium text-slate-500">{formatFindingsCount(risks.length)}</div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:w-[24rem] sm:max-w-[24rem]">
            <label className="sr-only" htmlFor="risk-search">
              Search findings
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="risk-search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search risk title, clause snippet, or category"
                className="h-9 rounded-lg border-slate-200 pl-9 pr-3 text-[0.82rem] placeholder:text-slate-400 focus-visible:ring-slate-900/10"
              />
            </div>
          </div>

          <div className="w-full sm:w-[12.5rem] sm:max-w-[12.5rem]">
            <SelectControl
              value={sortKey}
              onChange={(value) => onSortChange(value as RiskSortKey)}
              options={SORT_OPTIONS}
              ariaLabel="Sort findings"
              selectClassName={toolbarSelectClassName}
            />
          </div>
        </div>

        <div className="grid gap-2 md:hidden">
          <div className="grid gap-2 sm:grid-cols-3">
            <SelectControl
              value={category}
              onChange={(value) => onCategoryChange(value as RiskCategory | "All")}
              options={["All", ...categoryOptions]}
              ariaLabel="Filter findings by category"
              selectClassName={headerFilterSelectClassName}
            />
            <SelectControl
              value={severity}
              onChange={(value) => onSeverityChange(value as Severity | "All")}
              options={["All", ...SEVERITIES]}
              ariaLabel="Filter findings by severity"
              selectClassName={headerFilterSelectClassName}
            />
            <SelectControl
              value={status}
              onChange={(value) => onStatusChange(value as RiskReviewStatus | "All")}
              options={STATUS_FILTER_OPTIONS}
              ariaLabel="Filter findings by status"
              selectClassName={headerFilterSelectClassName}
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.15rem] border border-slate-200 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.04)]">
          <div className="space-y-2.5 p-3 md:hidden">
            {risks.length ? (
              risks.map((risk, index) => {
                const rowStatus = riskStatuses[risk.id] ?? "Pending Review";
                const isSelected = selectedRiskId === risk.id;

                return (
                  <div
                    key={risk.id}
                    id={`risk-row-${risk.id}`}
                    onClick={() => onReviewRisk(risk)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      onReviewRisk(risk);
                    }}
                    role="button"
                    tabIndex={0}
                    className={cn(
                      "w-full rounded-[1rem] border px-3.5 py-3 text-left transition",
                      isSelected
                        ? "border-slate-900 bg-slate-950/[0.03] shadow-[inset_3px_0_0_0_rgb(15,23,42)]"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[0.72rem] font-semibold text-slate-400">#{index + 1}</span>
                          <Badge className={cn(compactBadgeClassName, severityStyles[risk.severity])}>{risk.severity}</Badge>
                          <Badge className={cn(compactBadgeClassName, riskReviewStatusStyles[rowStatus])}>{getRiskStatusLabel(rowStatus)}</Badge>
                        </div>
                        <div className="mt-1.5 text-[0.86rem] font-semibold leading-5 text-slate-950">{risk.title}</div>
                        <div className="mt-0.5 text-[0.72rem] leading-4 text-slate-500">{risk.category} / {risk.clauseRef}</div>
                        <p className="mt-1.5 truncate text-[0.78rem] leading-5 text-slate-500" title={risk.highlightedText}>
                          {risk.highlightedText}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.82rem] font-semibold text-slate-950">{Math.round(risk.confidence * 100)}%</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2.5 text-[0.78rem] font-medium">
                      <span className="font-semibold text-slate-700">Review</span>
                      <span aria-hidden="true" className="text-slate-300">
                        &middot;
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAskAi(risk);
                        }}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          event.stopPropagation();
                          onAskAi(risk);
                        }}
                        className="inline-flex items-center gap-1 font-semibold text-slate-700 transition hover:text-slate-950"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Ask AI
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState totalRiskCount={totalRiskCount} message={emptyStateMessage} />
            )}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-[1060px] w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col className="w-12" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[11%]" />
                <col className="w-[24%]" />
                <col className="w-[8%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-50/90 text-left align-bottom backdrop-blur">
                  <th className="border-b border-slate-200 px-4 py-2.5">
                    <TableHeaderLabel>#</TableHeaderLabel>
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5">
                    <TableHeaderLabel>Risk</TableHeaderLabel>
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5">
                    <HeaderFilter
                      label="Category"
                      value={category}
                      onChange={(value) => onCategoryChange(value as RiskCategory | "All")}
                      options={["All", ...categoryOptions]}
                      ariaLabel="Filter findings by category"
                    />
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5">
                    <HeaderFilter
                      label="Severity"
                      value={severity}
                      onChange={(value) => onSeverityChange(value as Severity | "All")}
                      options={["All", ...SEVERITIES]}
                      ariaLabel="Filter findings by severity"
                    />
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5">
                    <TableHeaderLabel>Clause snippet</TableHeaderLabel>
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5">
                    <TableHeaderLabel>Confidence</TableHeaderLabel>
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5">
                    <HeaderFilter
                      label="Status"
                      value={status}
                      onChange={(value) => onStatusChange(value as RiskReviewStatus | "All")}
                      options={STATUS_FILTER_OPTIONS}
                      ariaLabel="Filter findings by status"
                    />
                  </th>
                  <th className="border-b border-slate-200 px-4 py-2.5">
                    <TableHeaderLabel>Actions</TableHeaderLabel>
                  </th>
                </tr>
              </thead>
              <tbody>
                {risks.length ? (
                  risks.map((risk, index) => {
                    const rowStatus = riskStatuses[risk.id] ?? "Pending Review";
                    const isSelected = selectedRiskId === risk.id;

                    return (
                      <tr
                        key={risk.id}
                        id={`risk-row-${risk.id}`}
                        onClick={() => onReviewRisk(risk)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          onReviewRisk(risk);
                        }}
                        tabIndex={0}
                        className={cn(
                          "group cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/20",
                          isSelected
                            ? "bg-slate-950/[0.045] shadow-[inset_3px_0_0_0_rgb(15,23,42)]"
                            : "bg-white hover:bg-slate-50/90"
                        )}
                      >
                        <td className="border-b border-slate-200 px-4 py-2.5 align-top text-[0.76rem] font-semibold text-slate-400">
                          {index + 1}
                        </td>
                        <td className="border-b border-slate-200 px-4 py-2.5 align-top">
                          <div className="space-y-0.5">
                            <div className="text-[0.85rem] font-semibold leading-5 text-slate-950" title={risk.title}>
                              {risk.title}
                            </div>
                            <div className="text-[0.72rem] leading-4 text-slate-500">{risk.clauseRef}</div>
                          </div>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-2.5 align-top text-[0.8rem] font-medium text-slate-700">
                          {risk.category}
                        </td>
                        <td className="border-b border-slate-200 px-4 py-2.5 align-top">
                          <Badge className={cn(compactBadgeClassName, severityStyles[risk.severity])}>{risk.severity}</Badge>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-2.5 align-top">
                          <p className="truncate text-[0.8rem] leading-5 text-slate-500" title={risk.highlightedText}>
                            {risk.highlightedText}
                          </p>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-2.5 align-top">
                          <div className="text-[0.82rem] font-semibold text-slate-950">{Math.round(risk.confidence * 100)}%</div>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-2.5 align-top">
                          <Badge className={cn(compactBadgeClassName, riskReviewStatusStyles[rowStatus])} title={rowStatus}>
                            {getRiskStatusLabel(rowStatus)}
                          </Badge>
                        </td>
                        <td className="border-b border-slate-200 px-4 py-2.5 align-top">
                          <div className="flex items-center gap-2 whitespace-nowrap text-[0.78rem] font-medium leading-none">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onReviewRisk(risk);
                              }}
                              className="font-semibold text-slate-700 transition hover:text-slate-950"
                            >
                              Review
                            </button>
                            <span aria-hidden="true" className="text-slate-300">
                              &middot;
                            </span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onAskAi(risk);
                              }}
                              className="inline-flex items-center gap-1 font-semibold text-slate-700 transition hover:text-slate-950"
                            >
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              Ask AI
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-14 text-center">
                      <EmptyState totalRiskCount={totalRiskCount} message={emptyStateMessage} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskDecisionPanel({
  open,
  risk,
  status,
  reviewLens,
  draftText,
  focusTarget,
  onClose,
  onReviewLensChange,
  onDraftTextChange,
  onResetDraft,
  onStatusChange
}: RiskDecisionPanelProps) {
  const askAiRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isClauseExpanded, setIsClauseExpanded] = useState(false);
  const clausePreviewText = useMemo(() => {
    if (!risk) return "";
    return isClauseExpanded ? risk.clauseText : truncate(risk.clauseText, 260);
  }, [isClauseExpanded, risk]);
  const whyItMattersBullets = useMemo(() => {
    if (!risk) return [];
    return buildWhyItMattersBullets(risk.whyRisky, risk.category, risk.severity, risk.clauseRef);
  }, [risk]);
  const highlightedImpact = useMemo(() => {
    if (!risk) return "";
    return getStandoutStatement(risk.impactIfIgnored);
  }, [risk]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open || !risk) return;

    window.requestAnimationFrame(() => {
      if (focusTarget === "ask-ai") {
        askAiRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [focusTarget, open, risk?.id]);

  useEffect(() => {
    setIsClauseExpanded(false);
  }, [risk?.id]);

  if (!risk) return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-[140] transition-opacity duration-300", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}>
      <button
        type="button"
        aria-label="Close decision panel"
        onClick={onClose}
        className={cn("absolute inset-0 bg-slate-950/18 backdrop-blur-[2px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${risk.title} review panel`}
        aria-hidden={!open}
        className={cn(
          "absolute inset-y-0 right-0 h-full w-full max-w-full border-l border-slate-200 bg-white shadow-[-24px_0_60px_rgba(15,23,42,0.16)] transition-transform duration-300 ease-out sm:max-w-[44rem] lg:max-w-[52vw]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">Decision panel</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{risk.title}</h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Badge className="border-slate-200 bg-slate-50 text-slate-700">{risk.clauseRef}</Badge>
                <Badge className="border-slate-200 bg-slate-50 text-slate-700">{risk.category}</Badge>
                <Badge className={severityStyles[risk.severity]}>{risk.severity}</Badge>
                <Badge className="border-slate-200 bg-slate-50 text-slate-700">{Math.round(risk.confidence * 100)}% confidence</Badge>
                <Badge className={riskReviewStatusStyles[status]}>{status}</Badge>
              </div>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollContainerRef} className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <PanelSection title="Flagged Clause">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm leading-7 text-slate-700">{clausePreviewText}</p>
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-sm font-medium leading-6 text-amber-950">
                  {risk.highlightedText}
                </div>
                {risk.clauseText.length > 260 ? (
                  <button
                    type="button"
                    onClick={() => setIsClauseExpanded((current) => !current)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    {isClauseExpanded ? "Show less" : "Expand clause"}
                    <ChevronDown className={cn("h-4 w-4 transition", isClauseExpanded && "rotate-180")} />
                  </button>
                ) : null}
              </div>
            </PanelSection>

            <PanelSection title="Why It Matters">
              <ul className="space-y-2">
                {whyItMattersBullets.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </PanelSection>

            <PanelSection title="Business Impact">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 px-4 py-3 text-sm font-medium leading-6 text-rose-950">
                {highlightedImpact}
              </div>
            </PanelSection>

            <PanelSection title="Suggested Fix">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                {risk.suggestedImprovement}
              </div>
            </PanelSection>

            <PanelSection title="Ask AI">
              <div ref={askAiRef} className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {REVIEW_LENSES.map((lens) => (
                    <button
                      key={lens.key}
                      type="button"
                      onClick={() => onReviewLensChange(lens.key)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                        reviewLens === lens.key
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      )}
                    >
                      {lens.label}
                    </button>
                  ))}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm">
                  {buildClauseAction(reviewLens, risk)}
                </div>
              </div>
            </PanelSection>

            <PanelSection
              title="Edit Clause"
              action={
                <Button type="button" variant="secondary" size="sm" onClick={onResetDraft}>
                  Reset draft
                </Button>
              }
            >
              <Textarea
                value={draftText}
                onChange={(event) => onDraftTextChange(event.target.value)}
                className="min-h-28 border-slate-200"
              />
            </PanelSection>

            <PanelSection title="Final Decision Actions">
              <div className="grid gap-2 sm:grid-cols-2">
                <DecisionActionButton
                  label="Accept Risk"
                  active={status === "Accepted Risk"}
                  onClick={() => onStatusChange("Accepted Risk")}
                />
                <DecisionActionButton
                  label="Action Required"
                  active={status === "Action Required"}
                  onClick={() => onStatusChange("Action Required")}
                />
              </div>
              <button
                type="button"
                onClick={() => onStatusChange("Pending Review")}
                className={cn(
                  "mt-3 inline-flex text-sm font-medium transition",
                  status === "Pending Review" ? "text-slate-950" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Mark as Pending Review
              </button>
            </PanelSection>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}

function SelectControl({
  value,
  onChange,
  options,
  ariaLabel,
  selectClassName,
  className
}: {
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  ariaLabel: string;
  selectClassName: string;
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={ariaLabel} className={selectClassName}>
        {options.map((option) => {
          if (typeof option === "string") {
            return (
              <option key={option} value={option}>
                {option === "All" ? "All" : option}
              </option>
            );
          }

          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function TableHeaderLabel({
  children
}: {
  children: ReactNode;
}) {
  return <div className="text-[0.78rem] font-semibold tracking-[0.01em] text-slate-700">{children}</div>;
}

function HeaderFilter({
  label,
  value,
  onChange,
  options,
  ariaLabel
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: (string | { value: string; label: string })[];
  ariaLabel: string;
}) {
  return (
    <div className="space-y-1">
      <TableHeaderLabel>{label}</TableHeaderLabel>
      <SelectControl value={value} onChange={onChange} options={options} ariaLabel={ariaLabel} selectClassName={headerFilterSelectClassName} />
    </div>
  );
}

function EmptyState({ totalRiskCount, message }: { totalRiskCount: number; message: string }) {
  return (
    <div className="mx-auto max-w-md">
      <p className="text-sm font-semibold text-slate-800">{message}</p>
      {totalRiskCount > 0 ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">Try broadening the search or clearing one of the active filters.</p>
      ) : null}
    </div>
  );
}

function PanelSection({
  title,
  children,
  action
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[1.45rem] border border-slate-200 bg-slate-50/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function DecisionActionButton({
  label,
  active,
  onClick
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
      )}
    >
      {label}
    </button>
  );
}

function formatFindingsCount(count: number) {
  if (count === 0) return "No findings";
  return `${count} finding${count === 1 ? "" : "s"}`;
}

function getRiskStatusLabel(status: RiskReviewStatus) {
  switch (status) {
    case "Pending Review":
      return "Pending";
    case "Accepted Risk":
      return "Accepted";
    case "Action Required":
      return "Action Req.";
    default:
      return status;
  }
}

function buildWhyItMattersBullets(whyRisky: string, category: RiskCategory, severity: Severity, clauseRef: string) {
  const sentenceBullets = whyRisky
    .split(/(?<=[.!?])\s+|;\s+/)
    .map((item) => normalizeSentence(item))
    .filter(Boolean);

  const bullets = sentenceBullets.slice(0, 2);

  if (bullets.length < 2) {
    bullets.push(`${category} exposure is being flagged at ${severity.toLowerCase()} severity in ${clauseRef}.`);
  }

  if (bullets.length < 3) {
    bullets.push(`This clause likely needs review before the document moves forward.`);
  }

  return bullets.slice(0, 3);
}

function getStandoutStatement(text: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((item) => normalizeSentence(item))
    .filter(Boolean);

  return sentences[0] ?? text;
}

function normalizeSentence(value: string) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}
