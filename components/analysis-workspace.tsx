"use client";

import Link from "next/link";
import { type MouseEvent, type ReactNode, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronRight,
  FileSearch,
  Filter,
  LayoutPanelLeft,
  Search,
  TriangleAlert
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RISK_CATEGORIES, SEVERITIES, decisionStyles, severityRank, severityStyles } from "@/constants/risk";
import { readAnalysisSession, type StoredAnalysisSession } from "@/lib/analysis-session";
import { buildClauseAction } from "@/lib/reporting/actions";
import { downloadReportPdf } from "@/lib/reporting/pdf";
import { cn, percent, truncate } from "@/lib/utils";
import type { ContractAnalysis, RiskCategory, Severity } from "@/types/contract";

type SortKey = "severity" | "confidence" | "category";
type ReviewLens = "safer" | "simplify" | "hidden" | "standard";
type SectionId = "summary" | "risks" | "final-review";

const sortLabels: Record<SortKey, string> = {
  severity: "Severity",
  confidence: "Confidence",
  category: "Category"
};

const reviewLenses: { key: ReviewLens; label: string }[] = [
  { key: "safer", label: "Safer wording" },
  { key: "simplify", label: "Simplify" },
  { key: "hidden", label: "Hidden risk" },
  { key: "standard", label: "Standard position" }
];

const sectionTabs: { id: SectionId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "risks", label: "Risks" },
  { id: "final-review", label: "Final Review" }
];

const SECTION_SCROLL_BUFFER = 16;
const SECTION_SETTLE_TOLERANCE = 12;

export function AnalysisWorkspace() {
  const [session, setSession] = useState<StoredAnalysisSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<Severity | "All">("All");
  const [category, setCategory] = useState<RiskCategory | "All">("All");
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [selectedRiskId, setSelectedRiskId] = useState("");
  const [reviewLens, setReviewLens] = useState<ReviewLens>("safer");
  const [draftText, setDraftText] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("summary");
  const [isLayerSummaryExpanded, setIsLayerSummaryExpanded] = useState(true);
  const [isDetailedSummaryExpanded, setIsDetailedSummaryExpanded] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const mainHeaderRowRef = useRef<HTMLDivElement | null>(null);
  const tabRowRef = useRef<HTMLElement | null>(null);
  const pendingSectionRef = useRef<SectionId | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);

  const clearPendingNavigationTimeout = () => {
    if (settleTimeoutRef.current === null) return;
    window.clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = null;
  };

  const getSharedScrollOffset = () => {
    const headerHeight = mainHeaderRowRef.current?.getBoundingClientRect().height ?? 0;
    const tabHeight = tabRowRef.current?.getBoundingClientRect().height ?? 0;

    return headerHeight + tabHeight + SECTION_SCROLL_BUFFER;
  };

  const getSectionTop = (sectionId: SectionId) => {
    const element = document.getElementById(sectionId);
    if (!element) return null;

    return window.scrollY + element.getBoundingClientRect().top;
  };

  const getScrollTarget = (sectionId: SectionId) => {
    const sectionTop = getSectionTop(sectionId);
    if (sectionTop === null) return null;

    return Math.max(0, sectionTop - getSharedScrollOffset());
  };

  const detectActiveSection = () => {
    const threshold = window.scrollY + getSharedScrollOffset();
    let nextSection: SectionId = sectionTabs[0].id;

    for (const section of sectionTabs) {
      const sectionTop = getSectionTop(section.id);
      if (sectionTop === null) continue;

      if (sectionTop - SECTION_SETTLE_TOLERANCE <= threshold) {
        nextSection = section.id;
      }
    }

    return nextSection;
  };

  const syncActiveSection = () => {
    const detectedSection = detectActiveSection();
    const pendingSection = pendingSectionRef.current;

    if (!pendingSection) {
      setActiveSection((current) => (current === detectedSection ? current : detectedSection));
      return;
    }

    const pendingScrollTarget = getScrollTarget(pendingSection);
    const pendingSectionTop = getSectionTop(pendingSection);
    const threshold = window.scrollY + getSharedScrollOffset();
    const pendingSettled =
      pendingScrollTarget === null ||
      pendingSectionTop === null ||
      Math.abs(window.scrollY - pendingScrollTarget) <= SECTION_SETTLE_TOLERANCE ||
      Math.abs(pendingSectionTop - threshold) <= SECTION_SETTLE_TOLERANCE;

    if (pendingSettled) {
      pendingSectionRef.current = null;
      clearPendingNavigationTimeout();
      setActiveSection((current) => (current === detectedSection ? current : detectedSection));
      return;
    }

    setActiveSection((current) => (current === pendingSection ? current : pendingSection));
  };

  const schedulePendingNavigationSync = (sectionId: SectionId) => {
    clearPendingNavigationTimeout();
    settleTimeoutRef.current = window.setTimeout(() => {
      if (pendingSectionRef.current !== sectionId) return;

      pendingSectionRef.current = null;
      settleTimeoutRef.current = null;
      const detectedSection = detectActiveSection();
      setActiveSection((current) => (current === detectedSection ? current : detectedSection));
    }, 450);
  };

  const handleTabClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: SectionId) => {
    event.preventDefault();

    const scrollTarget = getScrollTarget(sectionId);
    if (scrollTarget === null) return;

    pendingSectionRef.current = sectionId;
    setActiveSection(sectionId);
    window.history.replaceState(null, "", `#${sectionId}`);
    window.scrollTo({ top: scrollTarget, behavior: "smooth" });
    schedulePendingNavigationSync(sectionId);
  };

  useEffect(() => {
    const storedSession = readAnalysisSession();
    setSession(storedSession);
    setLoaded(true);

    if (storedSession) {
      const initialRisk = getPriorityRisk(storedSession.analysis);
      setSelectedRiskId(initialRisk?.id ?? "");
    }
  }, []);

  const analysis = session?.analysis;

  const selectedRisk = useMemo(() => {
    if (!analysis) return undefined;
    return analysis.risks.find((risk) => risk.id === selectedRiskId);
  }, [analysis, selectedRiskId]);

  const filteredRisks = useMemo(() => {
    if (!analysis) return [];

    const query = deferredSearch.trim().toLowerCase();

    return [...analysis.risks]
      .filter((risk) => severity === "All" || risk.severity === severity)
      .filter((risk) => category === "All" || risk.category === category)
      .filter((risk) => {
        if (!query) return true;

        return [risk.title, risk.clauseRef, risk.highlightedText, risk.whyRisky, risk.impactIfIgnored]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        if (sortKey === "severity") {
          return severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence;
        }

        if (sortKey === "confidence") {
          return b.confidence - a.confidence || severityRank[b.severity] - severityRank[a.severity];
        }

        return a.category.localeCompare(b.category) || severityRank[b.severity] - severityRank[a.severity];
      });
  }, [analysis, category, deferredSearch, severity, sortKey]);

  const categoryBreakdown = useMemo(() => {
    if (!analysis) return [];

    return Object.entries(analysis.riskSummary.byCategory)
      .map(([name, count]) => ({ name: name as RiskCategory, count }))
      .sort((a, b) => b.count - a.count);
  }, [analysis]);

  useEffect(() => {
    if (!analysis || !analysis.risks.length) return;

    const currentSelectionExists = analysis.risks.some((risk) => risk.id === selectedRiskId);
    if (!currentSelectionExists) {
      setSelectedRiskId(getPriorityRisk(analysis)?.id ?? analysis.risks[0].id);
      return;
    }

    const currentSelectionVisible = filteredRisks.some((risk) => risk.id === selectedRiskId);
    if (!currentSelectionVisible && filteredRisks.length > 0) {
      setSelectedRiskId(filteredRisks[0].id);
    }
  }, [analysis, filteredRisks, selectedRiskId]);

  useEffect(() => {
    setReviewLens("safer");
    setDraftText(selectedRisk?.suggestedImprovement ?? "");
  }, [selectedRisk?.id, selectedRisk?.suggestedImprovement]);

  useEffect(() => {
    if (!analysis) return;

    let frameId = 0;

    const queueSectionUpdate = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(syncActiveSection);
    };

    queueSectionUpdate();
    window.addEventListener("scroll", queueSectionUpdate, { passive: true });
    window.addEventListener("resize", queueSectionUpdate);

    return () => {
      window.cancelAnimationFrame(frameId);
      clearPendingNavigationTimeout();
      window.removeEventListener("scroll", queueSectionUpdate);
      window.removeEventListener("resize", queueSectionUpdate);
    };
  }, [analysis]);

  if (!loaded) {
    return (
      <main className="min-h-screen px-5 py-10">
        <div className="mx-auto max-w-7xl">
          <Card className="border-slate-200 bg-white/90">
            <CardContent className="p-8 text-sm text-slate-500">Loading analysis workspace...</CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!session || !analysis) {
    return (
      <main className="min-h-screen px-5 py-10">
        <div className="mx-auto max-w-4xl">
          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="space-y-6 p-8">
              <Badge className="border-slate-200 bg-slate-50 text-slate-700">No active analysis</Badge>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Open a contract review first</h1>
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  The analysis workspace is a dedicated output screen. Run a new review from the homepage to populate it.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Return to homepage
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  const documentName = getDocumentName(session.sourceLabel);
  const dominantCategory = categoryBreakdown.find((item) => item.count > 0);
  const nonZeroCategoryBreakdown = categoryBreakdown.filter((item) => item.count > 0);
  const flaggedSectionCount = getUniqueClauseCount(analysis.risks);
  const totalAnalyzedSectionCount = getTotalAnalyzedSectionCount(analysis);
  const highRiskSectionCount = getUniqueClauseCount(analysis.risks, "High");
  const mediumRiskSectionCount = getUniqueClauseCount(analysis.risks, "Medium");
  const severitySnapshot = `${analysis.riskSummary.high}H / ${analysis.riskSummary.medium}M / ${analysis.riskSummary.low}L`;
  const summaryInsight = buildSummaryInsight(analysis, nonZeroCategoryBreakdown, highRiskSectionCount, mediumRiskSectionCount);
  const executiveSummaryDetails = buildExecutiveSummaryDetails(analysis, nonZeroCategoryBreakdown);
  const finalReviewChecks = [
    {
      label: "Escalate high-severity findings before signature",
      done: analysis.riskSummary.high === 0
    },
    {
      label: "Align liability and commercial protections with business value",
      done: analysis.decisionRecommendation === "Accept"
    },
    {
      label: "Validate the selected clause against fallback wording",
      done: Boolean(draftText.trim())
    },
    {
      label: "Confirm next actions have an owner and negotiation sequence",
      done: analysis.nextActions.length >= 3
    }
  ];
  const reviewCompletionCount = finalReviewChecks.filter((item) => item.done).length;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 bg-slate-50/95 shadow-[0_1px_6px_rgba(15,23,42,0.04)] backdrop-blur">
        <div ref={mainHeaderRowRef} className="border-b border-slate-200/70">
          <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-[1.6rem] font-semibold tracking-tight text-slate-950">Risk Analysis Results</h1>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2.5 lg:justify-end">
              <div className="min-w-0 max-w-full lg:max-w-[22rem]">
                <p className="truncate text-sm font-medium text-slate-500" title={documentName}>
                  {documentName}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <Button type="button" variant="ghost" size="sm" onClick={() => window.print()} className="h-8.5 px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-950">
                  Preview
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadReportPdf(analysis)}
                  className="h-8.5 border-slate-200 bg-white px-3 text-slate-700 hover:bg-slate-100"
                >
                  Download
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-8.5 bg-slate-950 px-3 text-white hover:bg-slate-800"
                  onClick={() => setIsSubmitted(true)}
                  disabled={isSubmitted}
                >
                  {isSubmitted ? "Submitted" : "Submit"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <nav ref={tabRowRef} aria-label="Analysis sections" className="border-b border-slate-200/70">
          <div className="mx-auto max-w-7xl px-5">
            <div className="flex items-center gap-6 overflow-x-auto">
              {sectionTabs.map((tab) => (
                <a
                  key={tab.id}
                  href={`#${tab.id}`}
                  onClick={(event) => handleTabClick(event, tab.id)}
                  aria-current={activeSection === tab.id ? "page" : undefined}
                  className={cn(
                    "inline-flex h-11 items-center border-b-2 text-sm font-medium whitespace-nowrap transition-colors",
                    activeSection === tab.id
                      ? "border-slate-950 text-slate-950"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-7xl space-y-5 px-5 py-5">
        <section id="summary" className="scroll-mt-40">
          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Layer 1 Risk Summary</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">Decision snapshot</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLayerSummaryExpanded((current) => !current)}
                  className="text-sm font-medium text-slate-500 transition hover:text-slate-950"
                >
                  {isLayerSummaryExpanded ? "Collapse summary \u2190" : "Expand summary \u2192"}
                </button>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <PrimarySummaryCard
                  label="Risk Level"
                  value={<Badge className={severityStyles[analysis.overallRiskLevel]}>{analysis.overallRiskLevel || "Unavailable"}</Badge>}
                />
                <PrimarySummaryCard
                  label="Sections Flagged"
                  value={
                    <span className="font-semibold tabular-nums text-slate-950">
                      <span className="text-2xl leading-none">{flaggedSectionCount}</span>
                      <span className="ml-2 text-sm font-medium text-slate-400">/ {totalAnalyzedSectionCount ?? "--"}</span>
                    </span>
                  }
                />
                <PrimarySummaryCard
                  label="Severity"
                  value={<span className="text-base font-semibold tabular-nums text-slate-950">{severitySnapshot}</span>}
                />
              </div>

              {isLayerSummaryExpanded ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                    <div className="text-sm font-medium leading-6 text-slate-900">{summaryInsight.primary}</div>
                    <div className="text-sm leading-6 text-slate-500">{summaryInsight.secondary}</div>
                  </div>

                  {nonZeroCategoryBreakdown.length ? (
                    <div className="flex flex-wrap gap-2.5">
                      {nonZeroCategoryBreakdown.map((item) => (
                        <SecondaryCategoryCard key={item.name} label={item.name} count={item.count} />
                      ))}
                    </div>
                  ) : null}

                  <div className="space-y-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsDetailedSummaryExpanded((current) => !current)}
                      className="text-sm font-medium text-slate-500 transition hover:text-slate-950"
                    >
                      {isDetailedSummaryExpanded ? "Hide detailed summary \u2190" : "View detailed summary \u2192"}
                    </button>

                    {isDetailedSummaryExpanded ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="text-sm font-semibold text-slate-950">Executive Summary</div>
                        <div className="mt-3 space-y-3">
                          <ExecutiveSummaryItem label="Overall Position" value={executiveSummaryDetails.overallPosition} />
                          <ExecutiveSummaryItem label="Key Drivers" value={executiveSummaryDetails.keyDrivers} clampLines={2} />
                          <ExecutiveSummaryItem label="Business Impact" value={executiveSummaryDetails.businessImpact} clampLines={2} />
                          <ExecutiveSummaryItem label="Recommended Action" value={executiveSummaryDetails.recommendedAction} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section id="risks" className="scroll-mt-40 grid gap-5 xl:grid-cols-[0.9fr_1.2fr_0.8fr]">
          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Risk register</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Explore findings</h2>
                  <p className="mt-1 text-sm text-slate-600">{filteredRisks.length} results in current view</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 text-slate-500">
                  <LayoutPanelLeft className="h-5 w-5" />
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search clause, title, or rationale"
                  className="pl-10"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Severity"
                  value={severity}
                  onChange={(value) => setSeverity(value as Severity | "All")}
                  options={["All", ...SEVERITIES]}
                />
                <SelectField
                  label="Category"
                  value={category}
                  onChange={(value) => setCategory(value as RiskCategory | "All")}
                  options={["All", ...RISK_CATEGORIES]}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Sort by
                </div>
                <select
                  value={sortKey}
                  onChange={(event) => setSortKey(event.target.value as SortKey)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 outline-none"
                >
                  {Object.entries(sortLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                {filteredRisks.length ? (
                  filteredRisks.map((risk) => (
                    <button
                      key={risk.id}
                      type="button"
                      onClick={() => setSelectedRiskId(risk.id)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-4 text-left transition",
                        selectedRiskId === risk.id
                          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("border", selectedRiskId === risk.id ? "border-white/20 bg-white/10 text-white" : severityStyles[risk.severity])}>
                              {risk.severity}
                            </Badge>
                            <Badge
                              className={cn(
                                "border",
                                selectedRiskId === risk.id
                                  ? "border-white/20 bg-white/10 text-white"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              )}
                            >
                              {risk.category}
                            </Badge>
                            <span className={cn("text-xs", selectedRiskId === risk.id ? "text-slate-300" : "text-slate-500")}>
                              {risk.clauseRef}
                            </span>
                          </div>
                          <div>
                            <div className={cn("text-sm font-semibold", selectedRiskId === risk.id ? "text-white" : "text-slate-950")}>
                              {risk.title}
                            </div>
                            <p className={cn("mt-1 text-sm leading-6", selectedRiskId === risk.id ? "text-slate-300" : "text-slate-600")}>
                              {truncate(risk.whyRisky, 120)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className={cn("mt-1 h-4 w-4 shrink-0", selectedRiskId === risk.id ? "text-slate-300" : "text-slate-400")} />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                    <p className="text-sm font-medium text-slate-700">No findings match the current filters.</p>
                    <p className="mt-1 text-sm text-slate-500">Broaden the search or reset severity and category filters.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="space-y-5 p-6">
              {selectedRisk ? (
                <>
                  <div className="flex flex-col gap-4 border-b border-slate-200 pb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={severityStyles[selectedRisk.severity]}>{selectedRisk.severity}</Badge>
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700">{selectedRisk.category}</Badge>
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700">{selectedRisk.mitigability} mitigability</Badge>
                      <Badge className="border-slate-200 bg-slate-50 text-slate-700">
                        {Math.round(selectedRisk.confidence * 100)}% confidence
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Clause review</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{selectedRisk.title}</h2>
                      <p className="mt-1 text-sm text-slate-600">{selectedRisk.clauseRef}</p>
                    </div>
                  </div>

                  <WorkspacePanel
                    title="Flagged language"
                    description="The excerpt driving the current risk finding."
                    tone="alert"
                  >
                    {selectedRisk.highlightedText}
                  </WorkspacePanel>

                  <div className="grid gap-4 md:grid-cols-2">
                    <WorkspacePanel title="Why this matters" description="Negotiation and legal posture">
                      {selectedRisk.whyRisky}
                    </WorkspacePanel>
                    <WorkspacePanel title="Impact if accepted" description="Operational or commercial downside">
                      {selectedRisk.impactIfIgnored}
                    </WorkspacePanel>
                  </div>

                  <WorkspacePanel title="Full clause text" description="Source language for reviewer validation">
                    {selectedRisk.clauseText}
                  </WorkspacePanel>

                  <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Review lens</p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">Pressure-test the clause</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {reviewLenses.map((lens) => (
                        <button
                          key={lens.key}
                          type="button"
                          onClick={() => setReviewLens(lens.key)}
                          className={cn(
                            "rounded-xl border px-3 py-2 text-sm font-medium transition",
                            reviewLens === lens.key
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                          )}
                        >
                          {lens.label}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700">
                      {buildClauseAction(reviewLens, selectedRisk)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Draft safer position</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">Editable fallback language</h3>
                      </div>
                      <Button type="button" variant="secondary" size="sm" onClick={() => setDraftText(selectedRisk.suggestedImprovement)}>
                        Reset draft
                      </Button>
                    </div>
                    <Textarea value={draftText} onChange={(event) => setDraftText(event.target.value)} className="min-h-40 bg-white" />
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500">
                  Select a finding from the register to open clause-level review.
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="border-slate-200 bg-white/95 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Portfolio view</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Risk concentration</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {dominantCategory
                      ? `${percent(dominantCategory.count, analysis.riskSummary.total)} of findings sit in ${dominantCategory.name.toLowerCase()}.`
                      : "No category concentration detected."}
                  </p>
                </div>

                <div className="space-y-3">
                  {categoryBreakdown.map((item) => (
                    <div key={item.name} className="space-y-2">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-slate-700">{item.name}</span>
                        <span className="text-slate-500">
                          {item.count} / {analysis.riskSummary.total}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-slate-900"
                          style={{ width: `${analysis.riskSummary.total ? (item.count / analysis.riskSummary.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white/95 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Critical watchlist</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Priority items to resolve</h2>
                </div>

                <div className="space-y-3">
                  {analysis.topCriticalRisks.map((risk) => (
                    <div key={risk} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                      {risk}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        </section>

        <section id="final-review" className="scroll-mt-40">
          <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <Card className="border-slate-200 bg-white/95 shadow-sm">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Final review</p>
                  <h2 className="text-xl font-semibold text-slate-950">Close-out status</h2>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600">
                    Confirm the recommendation, open risk load, and submission state before circulating this analysis.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    label="Recommended action"
                    value={analysis.decisionRecommendation}
                    badgeClass={decisionStyles[analysis.decisionRecommendation]}
                  />
                  <MetricCard label="Checks complete" value={`${reviewCompletionCount} / ${finalReviewChecks.length}`} detail="Completion across final review steps" />
                  <MetricCard label="High severity open" value={String(analysis.riskSummary.high)} detail="Items still requiring escalation" />
                  <MetricCard label="Submission" value={isSubmitted ? "Submitted" : "Pending"} detail={isSubmitted ? "Workflow handoff recorded" : "Awaiting final submission"} />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white/95 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Review discipline</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-950">Decision checklist</h2>
                </div>

                <div className="space-y-3">
                  {finalReviewChecks.map((item) => (
                    <ChecklistItem key={item.label} label={item.label} done={item.done} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  badgeClass
}: {
  label: string;
  value: string;
  detail?: string;
  badgeClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <div className="mt-3">
        {badgeClass ? <Badge className={badgeClass}>{value}</Badge> : <div className="text-3xl font-semibold text-slate-950">{value}</div>}
      </div>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}

function PrimarySummaryCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-[4.5rem] items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <div className="min-w-0 shrink-0 text-right">{value}</div>
    </div>
  );
}

function SecondaryCategoryCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/85 px-3 py-2 text-sm text-slate-700">
      <span className="font-medium">{label}</span>
      <span className="font-semibold tabular-nums text-slate-950">{count}</span>
    </div>
  );
}

function ExecutiveSummaryItem({ label, value, clampLines }: { label: string; value: string; clampLines?: number }) {
  return (
    <div className="grid gap-1.5 md:grid-cols-[9rem_1fr] md:gap-3">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div
        className="text-sm leading-6 text-slate-700"
        style={
          clampLines
            ? {
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: clampLines,
                overflow: "hidden"
              }
            : undefined
        }
      >
        {value}
      </div>
    </div>
  );
}

function WorkspacePanel({
  title,
  description,
  tone = "default",
  children
}: {
  title: string;
  description: string;
  tone?: "default" | "alert";
  children: string;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border p-4",
        tone === "alert" ? "border-amber-200 bg-amber-50/70" : "border-slate-200 bg-slate-50"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "mt-0.5 rounded-2xl p-2",
            tone === "alert" ? "bg-amber-100 text-amber-700" : "bg-white text-slate-500 ring-1 ring-slate-200"
          )}
        >
          {tone === "alert" ? <TriangleAlert className="h-4 w-4" /> : <FileSearch className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
          <p className="mt-3 text-sm leading-7 text-slate-700">{children}</p>
        </div>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChecklistItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div
        className={cn(
          "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
          done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
        )}
      >
        {done ? "OK" : "!"}
      </div>
      <p className="text-sm leading-6 text-slate-700">{label}</p>
    </div>
  );
}

function getPriorityRisk(analysis: ContractAnalysis) {
  return [...analysis.risks].sort((a, b) => {
    return severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence;
  })[0];
}

function getDocumentName(sourceLabel?: string) {
  if (!sourceLabel?.trim()) return "Uploaded Document";

  const [rawName] = sourceLabel.split(" | ");
  const normalizedName = rawName?.trim();

  return normalizedName || "Uploaded Document";
}

function getUniqueClauseCount(risks: ContractAnalysis["risks"], severity?: Severity) {
  const relevantRisks = severity ? risks.filter((risk) => risk.severity === severity) : risks;
  const clauseRefs = new Set(
    relevantRisks
      .map((risk) => normalizeWhitespace(risk.clauseRef))
      .filter(Boolean)
  );

  return clauseRefs.size || relevantRisks.length;
}

function getTotalAnalyzedSectionCount(_analysis: ContractAnalysis) {
  return null;
}

function buildSummaryInsight(
  analysis: ContractAnalysis,
  categoryBreakdown: { name: RiskCategory; count: number }[],
  highRiskSectionCount: number,
  mediumRiskSectionCount: number
) {
  return {
    primary: buildPrimaryInsightLine(categoryBreakdown),
    secondary: buildSecondaryInsightLine(analysis, highRiskSectionCount, mediumRiskSectionCount)
  };
}

function buildPrimaryInsightLine(categoryBreakdown: { name: RiskCategory; count: number }[]) {
  if (!categoryBreakdown.length) {
    return "Risk concentration details are not available for this document.";
  }

  const categoryLabels = categoryBreakdown.slice(0, 3).map((item) => item.name.toLowerCase());

  if (categoryLabels.length === 1) {
    return `${capitalize(categoryLabels[0])} issues are driving most of the current exposure.`;
  }

  if (categoryLabels.length === 2) {
    return `${capitalize(categoryLabels[0])} and ${categoryLabels[1]} issues are driving most of the current exposure.`;
  }

  return `${capitalize(categoryLabels[0])}, ${categoryLabels[1]}, and ${categoryLabels[2]} issues are driving most of the current exposure.`;
}

function buildSecondaryInsightLine(
  analysis: ContractAnalysis,
  highRiskSectionCount: number,
  mediumRiskSectionCount: number
) {
  if (highRiskSectionCount > 0) {
    return `${highRiskSectionCount} high-risk section${highRiskSectionCount === 1 ? "" : "s"} require attention before approval.`;
  }

  if (mediumRiskSectionCount > 0 || analysis.riskSummary.medium > 0) {
    const reviewCount = mediumRiskSectionCount || analysis.riskSummary.medium;
    return `${reviewCount} section${reviewCount === 1 ? "" : "s"} require review before approval.`;
  }

  return "No critical risks are present and the document appears largely acceptable.";
}

function buildExecutiveSummaryDetails(
  analysis: ContractAnalysis,
  categoryBreakdown: { name: RiskCategory; count: number }[]
) {
  const prioritizedRisks = [...analysis.risks].sort((a, b) => {
    return severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence;
  });

  const impactSummary = truncate(
    uniqueStrings(prioritizedRisks.map((risk) => normalizeWhitespace(risk.impactIfIgnored))).slice(0, 2).join(" "),
    170
  );
  const driverSummary = truncate(
    uniqueStrings(analysis.topCriticalRisks.map((risk) => normalizeWhitespace(risk))).slice(0, 2).join(" "),
    150
  );
  const fallbackDriverSummary = buildPrimaryInsightLine(categoryBreakdown);

  return {
    overallPosition: getOverallPositionSentence(analysis),
    keyDrivers: ensureSentence(driverSummary || fallbackDriverSummary),
    businessImpact: ensureSentence(impactSummary || normalizeWhitespace(analysis.decisionRationale)),
    recommendedAction: ensureSentence(normalizeWhitespace(analysis.nextActions[0] ?? getRecommendedActionFallback(analysis)))
  };
}

function getOverallPositionSentence(analysis: ContractAnalysis) {
  const firstSentence = extractFirstSentence(analysis.executiveSummary);
  if (firstSentence) return firstSentence;

  return `${analysis.contractTitle} currently presents a ${analysis.overallRiskLevel.toLowerCase()} risk profile based on the flagged findings.`;
}

function getRecommendedActionFallback(analysis: ContractAnalysis) {
  if (analysis.riskSummary.high > 0) {
    return "Resolve the highest-risk sections before approval";
  }

  if (analysis.riskSummary.medium > 0) {
    return "Review the flagged sections before approval";
  }

  return "Proceed after confirming the remaining low-risk items";
}

function extractFirstSentence(value: string) {
  const normalized = normalizeWhitespace(value);
  const match = normalized.match(/^.*?[.!?](?=\s|$)/);

  if (match?.[0]) return match[0];
  if (!normalized) return "";

  return ensureSentence(normalized);
}

function ensureSentence(value: string) {
  const normalized = normalizeWhitespace(value).replace(/[.!?]+$/, "");
  if (!normalized) return "Unavailable.";

  return `${normalized}.`;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function capitalize(value: string) {
  if (!value) return value;
  return `${value[0].toUpperCase()}${value.slice(1)}`;
}
