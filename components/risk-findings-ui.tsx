"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Clock3, Search, Sparkles, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SEVERITIES, severityStyles } from "@/constants/risk";
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
  isRecommendationSaved: boolean;
  focusTarget: RiskPanelFocusTarget;
  onClose: () => void;
  onReviewLensChange: (value: RiskReviewLens) => void;
  onDraftTextChange: (value: string) => void;
  onResetDraft: () => void;
  onSaveRecommendation: () => void;
  onAcceptRisk: () => void;
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
  { key: "simplify", label: "Simplify" },
  { key: "safer", label: "Safer Wording" },
  { key: "hidden", label: "Hidden Risks" },
  { key: "standard", label: "Compare Standard" }
];

export const RISK_REVIEW_STATUSES: RiskReviewStatus[] = ["Pending Review", "Accepted Risk", "Action Required"];

const riskIndexColumnWidth = "1.75rem";

const riskReviewStatusStyles: Record<RiskReviewStatus, string> = {
  "Pending Review": "border-slate-300 bg-slate-100 text-slate-700",
  "Accepted Risk": "border-emerald-300 bg-emerald-50 text-emerald-700",
  "Action Required": "border-amber-300 bg-amber-50 text-amber-700"
};

const severityBadgeStyles: Record<Severity, string> = {
  High: "border-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.14)]",
  Medium: "border-amber-300 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.14)]",
  Low: "border-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.14)]"
};

const toolbarSelectClassName =
  "h-8 w-full appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-[0.81rem] font-medium text-slate-700 shadow-sm outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-900/10";
const compactBadgeClassName = "gap-1 px-2 py-[0.28rem] text-[0.7rem] font-semibold";

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
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(search));
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const emptyStateMessage = totalRiskCount === 0 ? "No findings" : "No risks match filters";

  useEffect(() => {
    if (search) {
      setIsSearchOpen(true);
    }
  }, [search]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onSearchChange("");
      setIsSearchOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSearchOpen, onSearchChange]);

  return (
    <Card className="border-slate-300/80 bg-white/95 shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold tracking-tight text-slate-950">Risk Register</h2>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.72rem] font-medium tabular-nums text-slate-500">
              {formatFindingsCount(risks.length)}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {isSearchOpen ? (
              <div className="relative w-full sm:w-[18rem]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  id="risk-search"
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search risk title, clause snippet, or category"
                  className="h-8 rounded-lg border-slate-200 pl-8 pr-8 text-[0.8rem] placeholder:text-slate-400 focus-visible:ring-slate-900/10"
                />
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange("");
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-2 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                if (isSearchOpen) {
                  searchInputRef.current?.focus();
                  return;
                }

                setIsSearchOpen(true);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-950"
              aria-label="Search findings"
            >
              <Search className="h-3.5 w-3.5" />
            </button>

            <div className="w-[11.25rem]">
              <SelectControl
                value={sortKey}
                onChange={(value) => onSortChange(value as RiskSortKey)}
                options={SORT_OPTIONS}
                ariaLabel="Sort findings"
                selectClassName={toolbarSelectClassName}
              />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.05rem] border border-slate-300/80 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.04)]">
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
                          <Badge className={cn(compactBadgeClassName, severityStyles[risk.severity], severityBadgeStyles[risk.severity])}>{risk.severity}</Badge>
                          <StatusBadge status={rowStatus} />
                        </div>
                        <div
                          className="mt-1.5 overflow-hidden text-[0.84rem] font-semibold leading-5 text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                          title={risk.title}
                        >
                          {risk.title}
                        </div>
                        <div className="mt-0.5 text-[0.72rem] leading-4 text-slate-500">{risk.category} / {risk.clauseRef}</div>
                        <p
                          className="mt-1.5 overflow-hidden text-[0.77rem] leading-5 text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                          title={risk.highlightedText}
                        >
                          {risk.highlightedText}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.82rem] font-semibold text-slate-950">{Math.round(risk.confidence * 100)}%</div>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2 text-[0.78rem] font-medium">
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
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
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
            <table className="min-w-[880px] w-full table-fixed border-separate border-spacing-0">
              <colgroup>
                <col style={{ width: riskIndexColumnWidth, minWidth: riskIndexColumnWidth, maxWidth: riskIndexColumnWidth }} />
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
                <col className="w-[20%]" />
                <col className="w-[10%]" />
                <col className="w-[11%]" />
                <col className="w-[11%]" />
              </colgroup>
              <thead>
                <tr className="bg-slate-100/90 text-left align-middle backdrop-blur">
                    <th
                      style={{ width: riskIndexColumnWidth, minWidth: riskIndexColumnWidth, maxWidth: riskIndexColumnWidth }}
                    className="border-b border-slate-300/80 px-0.5 py-1.5"
                  >
                    <TableHeaderLabel align="center">#</TableHeaderLabel>
                  </th>
                  <th className="border-b border-slate-300/80 px-3 py-1.5">
                    <TableHeaderLabel align="center">Risk</TableHeaderLabel>
                  </th>
                  <th className="border-b border-slate-300/80 px-3 py-1.5 text-center">
                    <HeaderFilter
                      label="Category"
                      value={category}
                      onChange={(value) => onCategoryChange(value as RiskCategory | "All")}
                      options={["All", ...categoryOptions]}
                      ariaLabel="Filter findings by category"
                    />
                  </th>
                  <th className="border-b border-slate-300/80 px-3 py-1.5 text-center">
                    <HeaderFilter
                      label="Severity"
                      value={severity}
                      onChange={(value) => onSeverityChange(value as Severity | "All")}
                      options={["All", ...SEVERITIES]}
                      ariaLabel="Filter findings by severity"
                    />
                  </th>
                  <th className="border-b border-slate-300/80 px-3.5 py-1.5">
                    <TableHeaderLabel align="center">Clause Snippet</TableHeaderLabel>
                  </th>
                  <th className="border-b border-slate-300/80 px-3 py-1.5 text-center">
                    <TableHeaderLabel align="center">AI Confidence</TableHeaderLabel>
                  </th>
                  <th className="border-b border-slate-300/80 px-3 py-1.5 text-center">
                    <HeaderFilter
                      label="Status"
                      value={status}
                      onChange={(value) => onStatusChange(value as RiskReviewStatus | "All")}
                      options={STATUS_FILTER_OPTIONS}
                      ariaLabel="Filter findings by status"
                    />
                  </th>
                  <th className="border-b border-slate-300/80 px-3 py-1.5 text-center">
                    <TableHeaderLabel align="center">Actions</TableHeaderLabel>
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
                        <td
                          style={{ width: riskIndexColumnWidth, minWidth: riskIndexColumnWidth, maxWidth: riskIndexColumnWidth }}
                          className="border-b border-slate-200/90 px-0.5 py-2.5 text-center align-middle text-[0.76rem] font-semibold text-slate-400"
                        >
                          {index + 1}
                        </td>
                        <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle">
                          <div className="space-y-[0.15rem]">
                            <div
                              className="overflow-hidden text-[0.82rem] font-semibold leading-5 text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                              title={risk.title}
                            >
                              {risk.title}
                            </div>
                            <div className="text-[0.72rem] leading-4 text-slate-500">{risk.clauseRef}</div>
                          </div>
                        </td>
                        <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle text-center text-[0.78rem] font-medium text-slate-700">
                          {risk.category}
                        </td>
                        <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle">
                          <div className="flex justify-center">
                            <Badge className={cn(compactBadgeClassName, severityStyles[risk.severity], severityBadgeStyles[risk.severity])}>{risk.severity}</Badge>
                          </div>
                        </td>
                        <td className="border-b border-slate-200/90 px-3.5 py-2.5 align-middle">
                          <p
                            className="overflow-hidden text-[0.78rem] leading-5 text-slate-700 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                            title={risk.highlightedText}
                          >
                            {risk.highlightedText}
                          </p>
                        </td>
                        <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle text-center">
                          <div className="text-[0.81rem] font-semibold tabular-nums text-slate-900">{Math.round(risk.confidence * 100)}%</div>
                        </td>
                        <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle">
                          <div className="flex justify-center">
                            <StatusBadge status={rowStatus} />
                          </div>
                        </td>
                        <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle">
                          <div className="flex flex-col items-center justify-center gap-1 text-[0.75rem] font-medium leading-none">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onReviewRisk(risk);
                              }}
                              className="inline-flex min-h-0 items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                onAskAi(risk);
                              }}
                              className="inline-flex min-h-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
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
  isRecommendationSaved,
  focusTarget,
  onClose,
  onReviewLensChange,
  onDraftTextChange,
  onResetDraft,
  onSaveRecommendation,
  onAcceptRisk,
  onStatusChange
}: RiskDecisionPanelProps) {
  const askAiRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [isClauseExpanded, setIsClauseExpanded] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const clausePreviewText = useMemo(() => {
    if (!risk) return "";
    return isClauseExpanded ? risk.clauseText : buildClauseExcerpt(risk.clauseText, risk.highlightedText, 360);
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
    setCopyState("idle");
  }, [risk?.id]);

  if (!risk) return null;

  const headerClauseRef = risk.clauseRef.trim();

  return createPortal(
    <div className={cn("fixed inset-0 z-[140] transition-opacity duration-300", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}>
      <button
        type="button"
        aria-label="Close decision panel"
        onClick={onClose}
        className={cn("absolute inset-0 bg-slate-950/6 backdrop-blur-[0.5px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
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
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3.5 sm:px-6">
            <div className="min-w-0 space-y-2.5">
              <div className="text-[0.72rem] font-bold tracking-[0.08em] text-slate-700">Risk Review</div>
              <div className="min-w-0">
                <h2 className="text-[1.22rem] font-semibold tracking-tight text-slate-950 sm:text-[1.38rem]">{risk.title}</h2>
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 text-[0.72rem] font-semibold text-slate-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {headerClauseRef ? (
                    <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                      {headerClauseRef}
                    </span>
                  ) : null}
                  <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                    {risk.category}
                  </span>
                  <Badge className={cn(compactBadgeClassName, "shrink-0", severityStyles[risk.severity])}>{risk.severity}</Badge>
                  <div className="shrink-0">
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="shrink-0 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <PanelSection title="Flagged Clause">
              <div className="rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3.5">
                <p className="text-sm leading-7 text-slate-700">{renderHighlightedClauseText(clausePreviewText, risk.highlightedText)}</p>
                {risk.clauseText.length > clausePreviewText.length ? (
                  <button
                    type="button"
                    onClick={() => setIsClauseExpanded((current) => !current)}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    {isClauseExpanded ? "Show less" : "View full clause"}
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

            <PanelSection title="Business Impact" className="border-transparent bg-transparent p-0">
              <div className="rounded-[1.1rem] border border-rose-200 bg-rose-50/80 px-4 py-3.5 text-sm font-medium leading-6 text-rose-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                {highlightedImpact}
              </div>
            </PanelSection>

            <PanelSection
              title="Ask AI"
              className="border-slate-300 bg-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
              titleClassName="text-[0.92rem] font-bold tracking-[0.01em] text-slate-900"
            >
              <div ref={askAiRef} className="space-y-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {REVIEW_LENSES.map((lens) => (
                    <button
                      key={lens.key}
                      type="button"
                      onClick={() => onReviewLensChange(lens.key)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[0.78rem] font-medium transition",
                        reviewLens === lens.key
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      )}
                    >
                      {lens.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Recommended Draft</div>
                    </div>
                    {isRecommendationSaved ? (
                      <div className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.72rem] font-semibold text-emerald-700">
                        <Check className="h-3.5 w-3.5" />
                        Saved
                      </div>
                    ) : null}
                  </div>

                  <Textarea
                    value={draftText}
                    onChange={(event) => onDraftTextChange(event.target.value)}
                    className="min-h-28 border-slate-200 text-sm leading-6 shadow-none"
                  />

                  <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                    <Button type="button" variant="secondary" size="sm" onClick={onResetDraft} className="h-9 rounded-full px-3.5">
                      Reset Draft
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(draftText);
                          setCopyState("done");
                          window.setTimeout(() => setCopyState("idle"), 1400);
                        } catch {
                          setCopyState("idle");
                        }
                      }}
                      className="h-9 rounded-full px-3.5"
                    >
                      {copyState === "done" ? "Copied" : "Copy"}
                    </Button>
                    <Button type="button" size="sm" onClick={onSaveRecommendation} className="h-9 rounded-full px-3.5">
                      Save Recommendation
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Accept Risk</div>
                    <div className="text-[0.78rem] text-slate-500">Use this when the clause is accepted as-is for final review.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {status !== "Pending Review" ? (
                      <button
                        type="button"
                        onClick={() => onStatusChange("Pending Review")}
                        className="text-[0.78rem] font-medium text-slate-500 transition hover:text-slate-900"
                      >
                        Mark Pending
                      </button>
                    ) : null}
                    <Button
                      type="button"
                      variant={status === "Accepted Risk" ? "default" : "secondary"}
                      size="sm"
                      onClick={onAcceptRisk}
                      className="h-8 rounded-full px-3"
                    >
                      Accept Risk
                    </Button>
                  </div>
                </div>
              </div>
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
  children,
  align = "left"
}: {
  children: ReactNode;
  align?: "left" | "center";
}) {
  return <div className={cn("text-[0.84rem] font-bold tracking-[0.01em] text-slate-900", align === "center" && "text-center")}>{children}</div>;
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
  const isActive = value !== "All";

  return (
    <div className="flex justify-center">
      <div
        className={cn(
          "group relative inline-flex items-center gap-1 rounded-md px-1.5 py-1 transition hover:bg-slate-100/90 focus-within:bg-white focus-within:shadow-sm",
          isActive && "bg-slate-100 text-slate-950"
        )}
      >
        <span className="text-[0.84rem] font-bold tracking-[0.01em] text-slate-900">{label}</span>
        {isActive ? <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-400" /> : null}
        <ChevronDown className="pointer-events-none h-3.5 w-3.5 text-slate-400 transition group-hover:text-slate-600" />
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={ariaLabel}
          className="absolute inset-0 cursor-pointer text-[0.84rem] font-bold opacity-0"
        >
          {options.map((option) => {
            if (typeof option === "string") {
              return (
                <option key={option} value={option}>
                  {option}
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
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: RiskReviewStatus }) {
  const label = getRiskStatusLabel(status);
  const Icon = getRiskStatusIcon(status);

  return (
    <Badge className={cn(compactBadgeClassName, riskReviewStatusStyles[status])} title={status}>
      <Icon className="h-3 w-3 opacity-80" />
      {label}
    </Badge>
  );
}

function EmptyState({ totalRiskCount, message }: { totalRiskCount: number; message: string }) {
  return (
    <div className="mx-auto max-w-md">
      <p className="text-sm font-semibold text-slate-800">{message}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {totalRiskCount > 0 ? "Try adjusting filters or search terms." : "No risks were identified for this document."}
      </p>
    </div>
  );
}

function PanelSection({
  title,
  children,
  action,
  className,
  titleClassName
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <section className={cn("rounded-[1.25rem] border border-slate-200 bg-slate-50/70 p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={cn("text-[0.82rem] font-semibold tracking-[0.02em] text-slate-700", titleClassName)}>{title}</h3>
        {action}
      </div>
      {children}
    </section>
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

function getRiskStatusIcon(status: RiskReviewStatus) {
  switch (status) {
    case "Pending Review":
      return Clock3;
    case "Accepted Risk":
      return Check;
    case "Action Required":
      return TriangleAlert;
    default:
      return Clock3;
  }
}

function buildClauseExcerpt(clauseText: string, highlightedText: string, maxLength: number) {
  const normalizedClause = clauseText.trim();
  if (normalizedClause.length <= maxLength || !highlightedText.trim()) return normalizedClause;

  const highlightMatch = findClauseHighlightMatch(normalizedClause, highlightedText);
  if (!highlightMatch) {
    return `${normalizedClause.slice(0, maxLength).trimEnd()}...`;
  }

  const excerptPadding = Math.max(80, Math.floor((maxLength - (highlightMatch.end - highlightMatch.start)) / 2));
  const start = Math.max(0, highlightMatch.start - excerptPadding);
  const end = Math.min(normalizedClause.length, highlightMatch.end + excerptPadding);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalizedClause.length ? "..." : "";

  return `${prefix}${normalizedClause.slice(start, end).trim()}${suffix}`;
}

function renderHighlightedClauseText(clauseText: string, highlightedText: string) {
  const needle = normalizeInlineText(highlightedText);
  if (!needle) return clauseText;

  const match = findClauseHighlightMatch(clauseText, needle);
  if (!match) {
    return (
      <>
        {clauseText}
        <span className="mt-3 block">
          <span className="inline-flex max-w-full items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.72rem] font-medium leading-5 text-amber-900">
            <span className="shrink-0">Flagged language:</span>
            <span className="ml-1 truncate">{truncate(needle, 120)}</span>
          </span>
        </span>
      </>
    );
  }

  const before = clauseText.slice(0, match.start);
  const after = clauseText.slice(match.end);

  return (
    <>
      {before}
      <mark className="rounded-md bg-amber-100 px-1 py-0.5 font-medium text-amber-950">{clauseText.slice(match.start, match.end)}</mark>
      {after}
    </>
  );
}

type ClauseHighlightMatch = {
  start: number;
  end: number;
};

type ComparableToken = {
  value: string;
  start: number;
  end: number;
};

type ComparableText = {
  text: string;
  map: number[];
  tokens: ComparableToken[];
};

function findClauseHighlightMatch(clauseText: string, highlightedText: string): ClauseHighlightMatch | null {
  const clause = clauseText.trim();
  const needle = normalizeInlineText(highlightedText);
  if (!clause || !needle) return null;

  const directIndex = clause.toLowerCase().indexOf(needle.toLowerCase());
  if (directIndex >= 0) {
    return { start: directIndex, end: directIndex + needle.length };
  }

  const comparableClause = buildComparableText(clause);
  const comparableNeedle = buildComparableText(needle);
  if (!comparableClause.text || !comparableNeedle.text) return null;

  const normalizedIndex = comparableClause.text.indexOf(comparableNeedle.text);
  if (normalizedIndex >= 0) {
    return mapComparableRangeToOriginal(comparableClause, normalizedIndex, normalizedIndex + comparableNeedle.text.length);
  }

  const partialMatch = findBestPartialComparableMatch(comparableClause, comparableNeedle);
  if (!partialMatch) return null;

  return mapComparableRangeToOriginal(comparableClause, partialMatch.start, partialMatch.end);
}

function buildComparableText(value: string): ComparableText {
  let text = "";
  const map: number[] = [];
  let previousWasSeparator = true;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (isComparableCharacter(character)) {
      text += character.toLowerCase();
      map.push(index);
      previousWasSeparator = false;
      continue;
    }

    if (!previousWasSeparator && text.length > 0) {
      text += " ";
      map.push(index);
      previousWasSeparator = true;
    }
  }

  while (text.endsWith(" ")) {
    text = text.slice(0, -1);
    map.pop();
  }

  return { text, map, tokens: buildComparableTokens(text) };
}

function buildComparableTokens(value: string) {
  const tokens: ComparableToken[] = [];
  let tokenStart = -1;

  for (let index = 0; index <= value.length; index += 1) {
    const character = value[index] ?? " ";
    if (character !== " " && tokenStart === -1) {
      tokenStart = index;
      continue;
    }

    if ((character === " " || index === value.length) && tokenStart !== -1) {
      tokens.push({
        value: value.slice(tokenStart, index),
        start: tokenStart,
        end: index
      });
      tokenStart = -1;
    }
  }

  return tokens;
}

function findBestPartialComparableMatch(clause: ComparableText, needle: ComparableText): ClauseHighlightMatch | null {
  if (!clause.tokens.length || !needle.tokens.length) return null;

  let bestLength = 0;
  let bestClauseTokenIndex = -1;
  const previousRow = Array.from({ length: needle.tokens.length }, () => 0);

  for (let clauseIndex = 0; clauseIndex < clause.tokens.length; clauseIndex += 1) {
    const currentRow = Array.from({ length: needle.tokens.length }, () => 0);

    for (let needleIndex = 0; needleIndex < needle.tokens.length; needleIndex += 1) {
      if (clause.tokens[clauseIndex].value !== needle.tokens[needleIndex].value) continue;

      currentRow[needleIndex] = (clauseIndex > 0 && needleIndex > 0 ? previousRow[needleIndex - 1] : 0) + 1;

      if (currentRow[needleIndex] > bestLength) {
        bestLength = currentRow[needleIndex];
        bestClauseTokenIndex = clauseIndex;
      }
    }

    for (let rowIndex = 0; rowIndex < currentRow.length; rowIndex += 1) {
      previousRow[rowIndex] = currentRow[rowIndex];
    }
  }

  if (bestLength <= 0 || bestClauseTokenIndex < 0) return null;

  const startToken = clause.tokens[bestClauseTokenIndex - bestLength + 1];
  const endToken = clause.tokens[bestClauseTokenIndex];
  const matchedText = clause.text.slice(startToken.start, endToken.end);
  const tokenCount = matchedText.split(" ").filter(Boolean).length;

  if (tokenCount < 2 && matchedText.length < 6) return null;

  return { start: startToken.start, end: endToken.end };
}

function mapComparableRangeToOriginal(comparable: ComparableText, start: number, end: number): ClauseHighlightMatch | null {
  if (start < 0 || end <= start || end > comparable.map.length) return null;

  const originalStart = comparable.map[start];
  const originalEnd = comparable.map[end - 1] + 1;

  if (originalStart == null || originalEnd == null || originalEnd <= originalStart) return null;

  return { start: originalStart, end: originalEnd };
}

function normalizeInlineText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isComparableCharacter(character: string) {
  return (character >= "0" && character <= "9") || character.toLowerCase() !== character.toUpperCase();
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
