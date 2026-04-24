"use client";

import Link from "next/link";
import { Fragment, type MouseEvent, type ReactNode, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronDown, CircleAlert, Download, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RISK_CATEGORIES, severityRank } from "@/constants/risk";
import { buildClauseAction } from "@/lib/reporting/actions";
import { getReportDocumentName } from "@/lib/reporting/metadata";
import { readAnalysisSession, type StoredAnalysisSession } from "@/lib/analysis-session";
import { downloadReportPdf } from "@/lib/reporting/pdf";
import { cn, truncate } from "@/lib/utils";
import {
  RISK_REVIEW_STATUSES,
  RiskDecisionPanel,
  RiskFindingsTable,
  type RiskPanelFocusTarget,
  type RiskReviewLens,
  type RiskReviewStatus,
  type RiskSortKey
} from "@/components/risk-findings-ui";
import type { ContractAnalysis, ContractRisk, RiskCategory, Severity } from "@/types/contract";

type SectionId = "summary" | "risks" | "final-review";

const sectionTabs: { id: SectionId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "risks", label: "Risks" },
  { id: "final-review", label: "Final Review" }
];

const SECTION_OFFSET_PADDING_PX = 16;
const SECTION_ACTIVE_TOLERANCE_PX = 12;
const SECTION_NAVIGATION_SETTLE_DELAY_MS = 450;
const RISK_FOCUS_SCROLL_DELAY_MS = 220;
const SECTION_HASH_PREFIX = "#";
const knownSectionIds = sectionTabs.map((tab) => tab.id);

export function AnalysisWorkspace() {
  const [session, setSession] = useState<StoredAnalysisSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<Severity | "All">("All");
  const [category, setCategory] = useState<RiskCategory | "All">("All");
  const [statusFilter, setStatusFilter] = useState<RiskReviewStatus | "All">("All");
  const [sortKey, setSortKey] = useState<RiskSortKey>("severity-desc");
  const [selectedRiskId, setSelectedRiskId] = useState("");
  const [reviewLens, setReviewLens] = useState<RiskReviewLens>("safer");
  const [riskDrafts, setRiskDrafts] = useState<Record<string, string>>({});
  const [savedRecommendations, setSavedRecommendations] = useState<Record<string, string>>({});
  const [riskStatuses, setRiskStatuses] = useState<Record<string, RiskReviewStatus>>({});
  const [isDecisionPanelOpen, setIsDecisionPanelOpen] = useState(false);
  const [panelFocusTarget, setPanelFocusTarget] = useState<RiskPanelFocusTarget>("summary");
  const [expandedFinalReviewRiskId, setExpandedFinalReviewRiskId] = useState<string | null>(null);
  const [isReviewFinalized, setIsReviewFinalized] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("summary");
  const [isLayerSummaryExpanded, setIsLayerSummaryExpanded] = useState(true);
  const [isDetailedSummaryExpanded, setIsDetailedSummaryExpanded] = useState(false);
  const [isRiskMixPopoverOpen, setIsRiskMixPopoverOpen] = useState(false);
  const [riskMixPopoverPosition, setRiskMixPopoverPosition] = useState<{
    top: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const deferredSearch = useDeferredValue(search);
  const mainHeaderRowRef = useRef<HTMLDivElement | null>(null);
  const tabRowRef = useRef<HTMLElement | null>(null);
  const riskMixTriggerRef = useRef<HTMLButtonElement | null>(null);
  const riskMixPopoverRef = useRef<HTMLDivElement | null>(null);
  const pendingSectionRef = useRef<SectionId | null>(null);
  const settleTimeoutRef = useRef<number | null>(null);
  const initialHashHandledRef = useRef(false);

  const clearPendingNavigationTimeout = () => {
    if (settleTimeoutRef.current === null) return;
    window.clearTimeout(settleTimeoutRef.current);
    settleTimeoutRef.current = null;
  };

  const getSectionIdFromHash = (hash: string) => {
    const normalizedHash = hash.startsWith(SECTION_HASH_PREFIX) ? hash.slice(1) : hash;
    return knownSectionIds.includes(normalizedHash as SectionId) ? (normalizedHash as SectionId) : null;
  };

  const getSectionElement = (sectionId: SectionId) => {
    return document.getElementById(sectionId);
  };

  const getSharedScrollOffset = () => {
    const headerHeight = mainHeaderRowRef.current?.getBoundingClientRect().height ?? 0;
    const tabHeight = tabRowRef.current?.getBoundingClientRect().height ?? 0;

    return headerHeight + tabHeight + SECTION_OFFSET_PADDING_PX;
  };

  const getSectionTop = (sectionId: SectionId) => {
    const element = getSectionElement(sectionId);
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

      if (sectionTop - SECTION_ACTIVE_TOLERANCE_PX <= threshold) {
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
      Math.abs(window.scrollY - pendingScrollTarget) <= SECTION_ACTIVE_TOLERANCE_PX ||
      Math.abs(pendingSectionTop - threshold) <= SECTION_ACTIVE_TOLERANCE_PX;

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
    }, SECTION_NAVIGATION_SETTLE_DELAY_MS);
  };

  const handleTabClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: SectionId) => {
    event.preventDefault();

    navigateToSection(sectionId);
  };

  const navigateToSection = (sectionId: SectionId) => {
    const scrollTarget = getScrollTarget(sectionId);
    if (scrollTarget === null || !getSectionElement(sectionId)) {
      pendingSectionRef.current = null;
      clearPendingNavigationTimeout();
      const detectedSection = detectActiveSection();
      setActiveSection((current) => (current === detectedSection ? current : detectedSection));
      return;
    }

    pendingSectionRef.current = sectionId;
    setActiveSection(sectionId);
    window.history.replaceState(null, "", `${SECTION_HASH_PREFIX}${sectionId}`);
    window.scrollTo({ top: scrollTarget, behavior: "smooth" });
    schedulePendingNavigationSync(sectionId);
  };

  const updateRiskMixPopoverPosition = () => {
    const trigger = riskMixTriggerRef.current;
    if (!trigger) return;

    const triggerRect = trigger.getBoundingClientRect();
    const viewportPadding = 12;
    const popoverWidth = 224;
    const desiredHeight = 240;
    const spaceBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
    const spaceAbove = triggerRect.top - viewportPadding;
    const openBelow = spaceBelow >= 160 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(112, Math.min(280, (openBelow ? spaceBelow : spaceAbove) - 8));
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.right - popoverWidth),
      window.innerWidth - popoverWidth - viewportPadding
    );
    const top = openBelow
      ? Math.min(triggerRect.bottom + 8, window.innerHeight - maxHeight - viewportPadding)
      : Math.max(viewportPadding, triggerRect.top - maxHeight - 8);

    setRiskMixPopoverPosition({ top, left, maxHeight });
  };

  const handleTopCriticalRiskClick = (riskId: string) => {
    const targetRisk = analysis?.risks.find((risk) => risk.id === riskId);
    if (!targetRisk) return;

    setSearch("");
    setSeverity("All");
    setCategory("All");
    setStatusFilter("All");
    setSelectedRiskId(riskId);
    setPanelFocusTarget("summary");
    setIsDecisionPanelOpen(true);

    const scrollTarget = getScrollTarget("risks");
    if (scrollTarget !== null) {
      pendingSectionRef.current = "risks";
      setActiveSection("risks");
      window.history.replaceState(null, "", "#risks");
      window.scrollTo({ top: scrollTarget, behavior: "smooth" });
      schedulePendingNavigationSync("risks");
    }

    window.setTimeout(() => {
      document.getElementById(`risk-row-${riskId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, RISK_FOCUS_SCROLL_DELAY_MS);
  };

  const openRiskPanel = (riskId: string, options?: { focusTarget?: RiskPanelFocusTarget }) => {
    setSelectedRiskId(riskId);
    setPanelFocusTarget(options?.focusTarget ?? "summary");
    setIsDecisionPanelOpen(true);
  };

  const updateRiskStatus = (riskId: string, nextStatus: RiskReviewStatus) => {
    setRiskStatuses((current) => {
      if (current[riskId] === nextStatus) return current;
      return { ...current, [riskId]: nextStatus };
    });
  };

  const updateRiskDraft = (riskId: string, nextDraft: string) => {
    setRiskDrafts((current) => {
      if (current[riskId] === nextDraft) return current;
      return { ...current, [riskId]: nextDraft };
    });
  };

  const resetRiskDraft = (risk: ContractRisk) => {
    updateRiskDraft(risk.id, risk.suggestedImprovement);
  };

  const saveRiskRecommendation = (risk: ContractRisk) => {
    const nextDraft = (riskDrafts[risk.id] ?? savedRecommendations[risk.id] ?? risk.suggestedImprovement).trim() || risk.suggestedImprovement;
    updateRiskDraft(risk.id, nextDraft);
    setSavedRecommendations((current) => {
      if (current[risk.id] === nextDraft) return current;
      return { ...current, [risk.id]: nextDraft };
    });
    updateRiskStatus(risk.id, "Action Required");
  };

  const applyReviewLens = (risk: ContractRisk, nextLens: RiskReviewLens) => {
    setReviewLens(nextLens);
    updateRiskDraft(risk.id, buildClauseAction(nextLens, risk));
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

  useEffect(() => {
    if (!isRiskMixPopoverOpen) return;

    updateRiskMixPopoverPosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !riskMixTriggerRef.current?.contains(target) &&
        !riskMixPopoverRef.current?.contains(target)
      ) {
        setIsRiskMixPopoverOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRiskMixPopoverOpen(false);
      }
    };

    const handleViewportChange = () => {
      updateRiskMixPopoverPosition();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [isRiskMixPopoverOpen]);

  const analysis = session?.analysis;

  useLayoutEffect(() => {
    if (!analysis || initialHashHandledRef.current) return;

    initialHashHandledRef.current = true;
    const targetSection = getSectionIdFromHash(window.location.hash);
    if (!targetSection) return;

    const scrollTarget = getScrollTarget(targetSection);
    if (scrollTarget === null || !getSectionElement(targetSection)) {
      const detectedSection = detectActiveSection();
      setActiveSection((current) => (current === detectedSection ? current : detectedSection));
      return;
    }

    pendingSectionRef.current = null;
    clearPendingNavigationTimeout();
    setActiveSection(targetSection);
    window.scrollTo({ top: scrollTarget, behavior: "auto" });
    const detectedSection = detectActiveSection();
    setActiveSection((current) => (current === detectedSection ? current : detectedSection));
  }, [analysis]);

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
      .filter((risk) => statusFilter === "All" || (riskStatuses[risk.id] ?? "Pending Review") === statusFilter)
      .filter((risk) => {
        if (!query) return true;

        return [risk.title, risk.highlightedText, risk.category]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "severity-desc":
            return severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence;
          case "severity-asc":
            return severityRank[a.severity] - severityRank[b.severity] || a.confidence - b.confidence;
          case "confidence-desc":
            return b.confidence - a.confidence || severityRank[b.severity] - severityRank[a.severity];
          case "confidence-asc":
            return a.confidence - b.confidence || severityRank[a.severity] - severityRank[b.severity];
          case "title-asc":
            return a.title.localeCompare(b.title) || severityRank[b.severity] - severityRank[a.severity];
          case "title-desc":
            return b.title.localeCompare(a.title) || severityRank[b.severity] - severityRank[a.severity];
          case "category-asc":
            return a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
          case "category-desc":
            return b.category.localeCompare(a.category) || a.title.localeCompare(b.title);
          default:
            return 0;
        }
      });
  }, [analysis, category, deferredSearch, riskStatuses, severity, sortKey, statusFilter]);

  const categoryOptions = useMemo(() => {
    if (!analysis) return [];

    return Array.from(new Set(analysis.risks.map((risk) => risk.category))).sort((a, b) => a.localeCompare(b));
  }, [analysis]);

  const categoryBreakdown = useMemo(() => {
    if (!analysis) return [];

    return Object.entries(analysis.riskSummary.byCategory)
      .map(([name, count]) => ({ name: name as RiskCategory, count }))
      .sort((a, b) => b.count - a.count);
  }, [analysis]);

  useEffect(() => {
    if (!analysis || !analysis.risks.length) return;

    setRiskStatuses((current) => {
      const nextStatuses = analysis.risks.reduce<Record<string, RiskReviewStatus>>((accumulator, risk) => {
        accumulator[risk.id] = current[risk.id] ?? "Pending Review";
        return accumulator;
      }, {});

      const isUnchanged =
        Object.keys(nextStatuses).length === Object.keys(current).length &&
        Object.entries(nextStatuses).every(([riskId, riskStatus]) => current[riskId] === riskStatus);

      return isUnchanged ? current : nextStatuses;
    });
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
    if (filteredRisks.length > 0) return;
    setIsDecisionPanelOpen(false);
  }, [filteredRisks.length]);

  useEffect(() => {
    setReviewLens("safer");
  }, [selectedRisk?.id]);

  useEffect(() => {
    setIsReviewFinalized(false);
  }, [riskStatuses, savedRecommendations]);

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

  useEffect(() => {
    if (!analysis) return;

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      syncActiveSection();
      secondFrame = window.requestAnimationFrame(syncActiveSection);
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [analysis, isLayerSummaryExpanded, isDetailedSummaryExpanded, filteredRisks.length, selectedRiskId]);

  useEffect(() => {
    if (!loaded) return;

    const nextTitle = session ? `Risk Analysis Results | ${getReportDocumentName(session.source.documentName)}` : "Risk Analysis Results";
    document.title = nextTitle;
  }, [loaded, session]);

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

  const documentName = getReportDocumentName(session.source.documentName);
  const dominantCategory = categoryBreakdown.find((item) => item.count > 0);
  const nonZeroCategoryBreakdown = categoryBreakdown.filter((item) => item.count > 0);
  const flaggedSectionCount = getUniqueClauseCount(analysis.risks);
  const totalAnalyzedSectionCount = getTotalAnalyzedSectionCount(analysis);
  const flaggedSectionsDisplay = formatFlaggedSectionSummary(flaggedSectionCount, totalAnalyzedSectionCount);
  const summaryInsight = buildSummaryInsight(analysis, nonZeroCategoryBreakdown);
  const executiveSummaryDetails = buildExecutiveSummaryDetails(analysis, nonZeroCategoryBreakdown);
  const riskMixSummary = buildRiskMixSummary(nonZeroCategoryBreakdown);
  const riskMixBreakdown = buildRiskMixBreakdown(analysis);
  const topCriticalRiskItems = buildTopCriticalRiskItems(analysis);
  const selectedRiskDraft = selectedRisk
    ? riskDrafts[selectedRisk.id] ?? savedRecommendations[selectedRisk.id] ?? selectedRisk.suggestedImprovement
    : "";
  const finalDecisionRows = buildFinalDecisionRows(analysis.risks, riskStatuses, savedRecommendations);
  const finalDecisionCounts = getFinalDecisionCounts(finalDecisionRows);
  const pendingCount = finalDecisionCounts.Pending;
  const finalReviewSummary = buildFinalReviewSummary(analysis, finalDecisionCounts);
  const finalReviewStatusMessage =
    pendingCount > 0
      ? "Resolve all pending clauses before finalizing review."
      : isReviewFinalized
        ? "Review finalized successfully."
        : "All clauses have a final decision.";

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
                <p className="truncate text-sm font-medium text-slate-700" title={documentName}>{documentName}</p>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => downloadReportPdf(analysis, session.source)}
                  className="h-8.5 bg-slate-950 px-3 text-white hover:bg-slate-800"
                >
                  Download
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
        <section id="summary">
          <Card className="border-slate-200 bg-white/95 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Decision snapshot</h2>

                <button
                  type="button"
                  onClick={() => setIsLayerSummaryExpanded((current) => !current)}
                  className="inline-flex items-center text-sm font-medium text-slate-500 transition hover:text-slate-950"
                >
                  {isLayerSummaryExpanded ? "Collapse summary \u2190" : "Expand summary \u2192"}
                </button>
              </div>

              <div className="overflow-x-auto pb-1">
                <div className="grid min-w-[56rem] grid-cols-4 gap-2.5">
                  <PrimarySummaryCard
                    label="Risk Level"
                    valueClassName="min-h-[1.75rem] flex items-center"
                    value={
                      <RiskLevelValue level={analysis.overallRiskLevel} />
                    }
                  />
                  <PrimarySummaryCard
                    label="Sections Flagged"
                    value={
                      <div className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
                        <span className="text-[1.58rem] font-semibold leading-none tabular-nums text-slate-950">
                          {flaggedSectionsDisplay.flaggedCount}
                        </span>
                        <span className="text-[0.92rem] font-medium text-slate-700">{flaggedSectionsDisplay.flaggedLabel}</span>
                        {flaggedSectionsDisplay.totalCount ? (
                          <span className="text-[0.84rem] font-medium tabular-nums text-slate-500">
                            / {flaggedSectionsDisplay.totalCount} {flaggedSectionsDisplay.totalLabel}
                          </span>
                        ) : null}
                      </div>
                    }
                  />
                  <PrimarySummaryCard
                    label="Severity"
                    value={
                      <div className="flex min-w-0 items-center gap-2.5 overflow-hidden whitespace-nowrap text-[0.9rem] text-slate-700">
                        <InlineSeverityStat tone="high" count={analysis.riskSummary.high} label="High" />
                        <InlineSeverityStat tone="medium" count={analysis.riskSummary.medium} label="Medium" />
                        <InlineSeverityStat tone="low" count={analysis.riskSummary.low} label="Low" />
                      </div>
                    }
                  />
                  <PrimarySummaryCard
                    label="Risk Mix"
                    headerAccessory={
                      riskMixSummary?.hasHiddenCategories ? (
                        <div className="shrink-0">
                          <button
                            ref={riskMixTriggerRef}
                            type="button"
                            onClick={() => setIsRiskMixPopoverOpen((current) => !current)}
                            aria-expanded={isRiskMixPopoverOpen}
                            className="text-[0.72rem] font-medium text-slate-500 transition hover:text-slate-800"
                          >
                            View all &rarr;
                          </button>
                        </div>
                      ) : null
                    }
                    value={
                      riskMixSummary ? (
                        <div className="min-w-0 overflow-hidden" title={riskMixSummary.fullText}>
                          <div className="xl:hidden">
                            <RiskMixLine items={riskMixSummary.compactItems} />
                          </div>
                          <div className="hidden xl:block">
                            <RiskMixLine items={riskMixSummary.expandedItems} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">No flagged categories</span>
                      )
                    }
                  />
                </div>
              </div>

              {isLayerSummaryExpanded ? (
                <>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                    <p className="text-[0.97rem] leading-6 text-slate-700">
                      <span className="mr-2 inline-flex text-[0.74rem] font-semibold uppercase tracking-[0.15em] text-slate-800">
                        AI Insight:
                      </span>
                      <span>{summaryInsight}</span>
                    </p>
                  </div>

                  {topCriticalRiskItems.length ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-slate-600">Top Critical Risks</div>
                        <div className="text-[0.72rem] font-medium text-slate-500">(click a risk to view)</div>
                      </div>
                      <div className="overflow-x-auto pb-1">
                        <div className="grid min-w-full grid-flow-col auto-cols-[minmax(12rem,1fr)] items-stretch gap-2.5">
                        {topCriticalRiskItems.map((risk) => (
                          <TopCriticalRiskPill
                            key={risk.id}
                            label={risk.label}
                            onClick={() => handleTopCriticalRiskClick(risk.id)}
                          />
                        ))}
                        </div>
                      </div>
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
                          <ExecutiveSummaryItem label="Key Drivers" value={executiveSummaryDetails.keyDrivers} />
                          <ExecutiveSummaryItem label="Business Impact" value={executiveSummaryDetails.businessImpact} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <section id="risks" className="space-y-5">
          <RiskFindingsTable
            risks={filteredRisks}
            totalRiskCount={analysis.risks.length}
            search={search}
            severity={severity}
            category={category}
            status={statusFilter}
            categoryOptions={categoryOptions}
            sortKey={sortKey}
            selectedRiskId={selectedRiskId}
            riskStatuses={riskStatuses}
            onSearchChange={setSearch}
            onSeverityChange={setSeverity}
            onCategoryChange={setCategory}
            onStatusChange={setStatusFilter}
            onSortChange={setSortKey}
            onReviewRisk={(risk) => openRiskPanel(risk.id)}
            onAskAi={(risk) => {
              setReviewLens("safer");
              openRiskPanel(risk.id, { focusTarget: "ask-ai" });
            }}
          />
        </section>

        <section id="final-review" className="space-y-4">
          <Card className="overflow-hidden border-slate-200 bg-white/95 shadow-[0_18px_44px_rgba(15,23,42,0.07)]">
            <CardContent className="p-0">
              <div className="grid gap-5 border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_58%,#eef2f7_100%)] p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Final review</p>
                    <p className="mt-3 text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-slate-600">Overall Recommendation</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950">{finalReviewSummary.recommendation}</h2>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-slate-600">{finalReviewSummary.readiness}</p>
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <FinalReviewCountPill label="Revised" value={finalDecisionCounts.Revised} tone="revised" />
                  <FinalReviewCountPill label="Accepted" value={finalDecisionCounts.Accepted} tone="accepted" />
                  <FinalReviewCountPill label="Pending" value={finalDecisionCounts.Pending} tone="pending" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-hidden rounded-[1.05rem] border border-slate-300/80 bg-white shadow-[0_12px_26px_rgba(15,23,42,0.04)]">
            <div className="border-b border-slate-200 bg-slate-100/80 px-4 py-3">
              <div className="text-sm font-semibold text-slate-950">Final Decisions</div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[840px] w-full table-fixed border-separate border-spacing-0">
                <colgroup>
                  <col className="w-[34%]" />
                  <col className="w-[14%]" />
                  <col className="w-[36%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead>
                  <tr className="bg-slate-50 text-left">
                    <th className="border-b border-slate-200 px-4 py-2.5">
                      <TableHeaderLabel>Risk</TableHeaderLabel>
                    </th>
                    <th className="border-b border-slate-200 px-4 py-2.5 text-center">
                      <TableHeaderLabel align="center">Decision</TableHeaderLabel>
                    </th>
                    <th className="border-b border-slate-200 px-4 py-2.5">
                      <TableHeaderLabel>Final Clause</TableHeaderLabel>
                    </th>
                    <th className="border-b border-slate-200 px-4 py-2.5 text-center">
                      <TableHeaderLabel align="center">Compare</TableHeaderLabel>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {finalDecisionRows.map((row) => {
                    const isExpanded = expandedFinalReviewRiskId === row.risk.id;

                    return (
                      <Fragment key={row.risk.id}>
                        <tr className="bg-white align-middle transition hover:bg-slate-50/80">
                          <td className="border-b border-slate-200/90 px-4 py-3">
                            <div className="min-w-0">
                              <div
                                className="overflow-hidden text-[0.86rem] font-semibold leading-5 text-slate-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                                title={row.risk.title}
                              >
                                {row.risk.title}
                              </div>
                              <div className="mt-1 text-[0.72rem] font-medium text-slate-500">{row.risk.clauseRef}</div>
                            </div>
                          </td>
                          <td className="border-b border-slate-200/90 px-4 py-3 text-center">
                            <FinalReviewDecisionBadge decision={row.decision} />
                          </td>
                          <td className="border-b border-slate-200/90 px-4 py-3">
                            <p className="overflow-hidden text-[0.82rem] leading-5 text-slate-700 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" title={row.finalClause}>
                              {row.finalClause}
                            </p>
                          </td>
                          <td className="border-b border-slate-200/90 px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setExpandedFinalReviewRiskId(isExpanded ? null : row.risk.id)}
                              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                              aria-expanded={isExpanded}
                            >
                              {row.actionLabel}
                              <ChevronDown className={cn("h-3.5 w-3.5 transition", isExpanded ? "rotate-180" : "")} />
                            </button>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-slate-50/70">
                            <td colSpan={4} className="border-b border-slate-200 px-4 py-3.5">
                              <FinalReviewExpansion row={row} />
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[1.05rem] border border-slate-200 bg-white/95 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <p
              className={cn(
                "text-sm font-medium",
                pendingCount > 0 ? "text-amber-700" : isReviewFinalized ? "text-emerald-700" : "text-slate-600"
              )}
            >
              {finalReviewStatusMessage}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => downloadReportPdf(analysis, session.source)}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Download Report
              </Button>
              <Button
                type="button"
                disabled={pendingCount > 0}
                onClick={() => setIsReviewFinalized(true)}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Finalize Review
              </Button>
            </div>
          </div>
        </section>
      </div>

      <RiskDecisionPanel
        open={isDecisionPanelOpen}
        risk={selectedRisk}
        status={selectedRisk ? riskStatuses[selectedRisk.id] ?? "Pending Review" : RISK_REVIEW_STATUSES[0]}
        reviewLens={reviewLens}
        draftText={selectedRiskDraft}
        isRecommendationSaved={selectedRisk ? savedRecommendations[selectedRisk.id] === selectedRiskDraft : false}
        focusTarget={panelFocusTarget}
        onClose={() => setIsDecisionPanelOpen(false)}
        onReviewLensChange={(value) => {
          if (!selectedRisk) return;
          applyReviewLens(selectedRisk, value);
        }}
        onDraftTextChange={(value) => {
          if (!selectedRisk) return;
          updateRiskDraft(selectedRisk.id, value);
        }}
        onResetDraft={() => {
          if (!selectedRisk) return;
          resetRiskDraft(selectedRisk);
        }}
        onSaveRecommendation={() => {
          if (!selectedRisk) return;
          saveRiskRecommendation(selectedRisk);
        }}
        onAcceptRisk={() => {
          if (!selectedRisk) return;
          updateRiskStatus(selectedRisk.id, "Accepted Risk");
        }}
        onStatusChange={(value) => {
          if (!selectedRisk) return;
          updateRiskStatus(selectedRisk.id, value);
        }}
      />

      {isRiskMixPopoverOpen && riskMixPopoverPosition
        ? createPortal(
            <div
              ref={riskMixPopoverRef}
              className="fixed z-[120] w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]"
              style={{
                top: riskMixPopoverPosition.top,
                left: riskMixPopoverPosition.left,
                maxHeight: riskMixPopoverPosition.maxHeight
              }}
            >
              <div className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Category Breakdown
              </div>
              <div className="space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight: riskMixPopoverPosition.maxHeight - 36 }}>
                {riskMixBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-[0.83rem] text-slate-700">
                    <span>{item.name}</span>
                    <span className="font-semibold tabular-nums text-slate-950">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </main>
  );
}

function TableHeaderLabel({ children, align = "left" }: { children: ReactNode; align?: "left" | "center" }) {
  return (
    <span className={cn("block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500", align === "center" ? "text-center" : "text-left")}>
      {children}
    </span>
  );
}

function FinalReviewCountPill({
  label,
  value,
  tone
}: {
  label: FinalReviewDecision;
  value: number;
  tone: "revised" | "accepted" | "pending";
}) {
  return (
    <div
      className={cn(
        "inline-flex min-w-[8.5rem] items-center justify-between gap-3 rounded-full border bg-white px-3.5 py-2 text-sm shadow-sm",
        tone === "revised"
          ? "border-blue-200 text-blue-800"
          : tone === "accepted"
            ? "border-emerald-200 text-emerald-800"
            : "border-amber-200 text-amber-800"
      )}
    >
      <span className="font-semibold tabular-nums text-slate-950">{value}</span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

function FinalReviewDecisionBadge({ decision }: { decision: FinalReviewDecision }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold",
        decision === "Revised"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : decision === "Accepted"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
      )}
    >
      {decision}
    </span>
  );
}

function FinalReviewExpansion({ row }: { row: FinalDecisionRow }) {
  return (
    <div className="grid gap-3 rounded-[0.95rem] border border-slate-200 bg-white p-3 md:grid-cols-2">
      <ClauseComparisonBlock label="Original Clause" value={row.originalClause} />
      {row.decision === "Revised" ? (
        <ClauseComparisonBlock label="Revised Clause" value={row.revisedClause ?? ""} tone="revised" />
      ) : (
        <div className="flex min-h-[6rem] flex-col justify-between rounded-[0.85rem] border border-slate-200 bg-slate-50 p-3">
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Decision Note</div>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{row.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ClauseComparisonBlock({
  label,
  value,
  tone
}: {
  label: string;
  value: string;
  tone?: "revised";
}) {
  return (
    <div
      className={cn(
        "rounded-[0.85rem] border p-3",
        tone === "revised" ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-slate-50"
      )}
    >
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <p className="mt-2 max-h-36 overflow-y-auto pr-1 text-sm leading-6 text-slate-700">{value || "Not available"}</p>
    </div>
  );
}

function PrimarySummaryCard({
  label,
  value,
  valueClassName,
  headerAccessory
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  headerAccessory?: ReactNode;
}) {
  return (
    <div className="flex min-h-[4.85rem] flex-col justify-between rounded-[1.15rem] border border-slate-200/80 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.045)] ring-1 ring-slate-950/[0.02]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.8rem] font-medium uppercase tracking-[0.14em] text-slate-700">{label}</span>
        {headerAccessory}
      </div>
      <div className={cn("min-w-0 flex min-h-[2.1rem] flex-1 items-center text-left", valueClassName)}>{value}</div>
    </div>
  );
}

function RiskLevelValue({ level }: { level: Severity }) {
  const Icon = level === "High" ? TriangleAlert : level === "Medium" ? CircleAlert : ShieldCheck;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.95rem] font-semibold leading-none shadow-[0_6px_14px_rgba(15,23,42,0.04)]",
        level === "High"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : level === "Medium"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{level || "Unavailable"}</span>
    </div>
  );
}

function InlineSeverityStat({ tone, count, label }: { tone: "high" | "medium" | "low"; count: number; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 rounded-full",
          tone === "high" ? "bg-rose-500" : tone === "medium" ? "bg-amber-400" : "bg-emerald-500"
        )}
      />
      <span className="font-semibold tabular-nums text-slate-950">{count}</span>
      <span>{label}</span>
    </span>
  );
}

function RiskMixLine({
  items
}: {
  items: { name: RiskCategory; count: number }[];
}) {
  return (
    <div className="flex min-w-0 items-center overflow-hidden whitespace-nowrap text-[0.92rem] text-slate-600">
      {items.map((item, index) => (
        <span key={item.name} className="inline-flex items-baseline whitespace-nowrap">
          {index > 0 ? <span className="px-2 text-slate-300">{"\u2022"}</span> : null}
          <span>{item.name}</span>
          <span className="ml-1 font-semibold tabular-nums text-slate-950">{item.count}</span>
        </span>
      ))}
    </div>
  );
}

function TopCriticalRiskPill({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex w-full min-w-0 cursor-pointer items-center rounded-[1.05rem] border border-slate-300/90 bg-white px-3.5 py-2.5 text-left text-[0.92rem] font-medium leading-5 text-slate-700 shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition hover:border-slate-400 hover:bg-slate-50 active:translate-y-px active:border-slate-500"
      )}
      title={label}
    >
      <span className="min-w-0">{label}</span>
    </button>
  );
}

function ExecutiveSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-2 md:grid-cols-[8rem_minmax(0,1fr)] md:items-start md:gap-5">
      <div className="pt-0.5 text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-slate-600">{label}</div>
      <div className="min-w-0 text-sm leading-[1.52rem] text-slate-700">{value}</div>
    </div>
  );
}

type FinalReviewDecision = "Revised" | "Accepted" | "Pending";

type FinalDecisionRow = {
  risk: ContractRisk;
  decision: FinalReviewDecision;
  finalClause: string;
  actionLabel: string;
  originalClause: string;
  revisedClause?: string;
  note: string;
};

function buildFinalDecisionRows(
  risks: ContractRisk[],
  riskStatuses: Record<string, RiskReviewStatus>,
  savedRecommendations: Record<string, string>
): FinalDecisionRow[] {
  return risks.map((risk) => {
    const status = riskStatuses[risk.id] ?? "Pending Review";
    const savedClause = normalizeWhitespace(savedRecommendations[risk.id] ?? "");
    const originalClause = normalizeWhitespace(risk.clauseText || risk.highlightedText);

    if (status === "Accepted Risk") {
      return {
        risk,
        decision: "Accepted",
        finalClause: "Original retained",
        actionLabel: "View Original",
        originalClause,
        note: "Accepted as-is"
      };
    }

    if (status === "Action Required" && savedClause) {
      return {
        risk,
        decision: "Revised",
        finalClause: buildFinalClauseSnippet(savedClause),
        actionLabel: "View Changes",
        originalClause,
        revisedClause: savedClause,
        note: "Revised clause saved"
      };
    }

    return {
      risk,
      decision: "Pending",
      finalClause: "Awaiting decision",
      actionLabel: "Review",
      originalClause,
      note: "Awaiting final decision"
    };
  });
}

function getFinalDecisionCounts(rows: FinalDecisionRow[]) {
  return rows.reduce<Record<FinalReviewDecision, number>>(
    (counts, row) => {
      counts[row.decision] += 1;
      return counts;
    },
    { Revised: 0, Accepted: 0, Pending: 0 }
  );
}

function buildFinalReviewSummary(
  analysis: ContractAnalysis,
  counts: Record<FinalReviewDecision, number>
) {
  const hasPendingItems = counts.Pending > 0;
  const hasRevisedItems = counts.Revised > 0;

  if (hasPendingItems) {
    return {
      recommendation: hasRevisedItems ? "Resolve Pending Changes" : "Pending Resolution",
      readiness: "Ready after pending items are resolved."
    };
  }

  if (analysis.decisionRecommendation === "Reject") {
    return {
      recommendation: "Do Not Proceed",
      readiness: "Ready to finalize rejection recommendation."
    };
  }

  if (hasRevisedItems || analysis.decisionRecommendation === "Renegotiate") {
    return {
      recommendation: "Proceed with Changes",
      readiness: "Ready to finalize with revised clause positions."
    };
  }

  return {
    recommendation: "Proceed as Drafted",
    readiness: "Ready to finalize with original clauses retained."
  };
}

function buildFinalClauseSnippet(value: string) {
  return truncate(normalizeWhitespace(value), 118);
}

function getPriorityRisk(analysis: ContractAnalysis) {
  return getPrioritizedRisks(analysis)[0];
}

function getPrioritizedRisks(analysis: ContractAnalysis) {
  return [...analysis.risks].sort((a, b) => {
    return severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence;
  });
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

function formatFlaggedSectionSummary(flaggedCount: number, totalCount: number | null) {
  if (typeof totalCount === "number" && Number.isFinite(totalCount)) {
    return {
      flaggedCount: String(flaggedCount),
      flaggedLabel: "Flagged",
      totalCount: String(totalCount),
      totalLabel: "Sections"
    };
  }

  return {
    flaggedCount: String(flaggedCount),
    flaggedLabel: "Flagged",
    totalCount: "",
    totalLabel: ""
  };
}

function buildSummaryInsight(
  analysis: ContractAnalysis,
  categoryBreakdown: { name: RiskCategory; count: number }[]
) {
  return buildPrimaryInsightLine(analysis, categoryBreakdown);
}

function buildPrimaryInsightLine(
  analysis: ContractAnalysis,
  categoryBreakdown: { name: RiskCategory; count: number }[]
) {
  const riskDrivers = buildTopCriticalRiskItems(analysis)
    .slice(0, 2)
    .map((item) => item.label.toLowerCase());
  const highRiskSectionCount = getUniqueClauseCount(analysis.risks, "High");
  const mediumRiskSectionCount = getUniqueClauseCount(analysis.risks, "Medium");

  if (riskDrivers.length) {
    const concentrationBasis =
      highRiskSectionCount > 0
        ? `${highRiskSectionCount} high-risk section${highRiskSectionCount === 1 ? "" : "s"}`
        : mediumRiskSectionCount > 0
          ? `${mediumRiskSectionCount} medium-risk section${mediumRiskSectionCount === 1 ? "" : "s"}`
          : `${analysis.riskSummary.total} flagged finding${analysis.riskSummary.total === 1 ? "" : "s"}`;
    const riskLedSummary = `Primary exposure is concentrated in ${joinWithAnd(riskDrivers)} across ${concentrationBasis}.`;
    if (riskLedSummary.length <= 152) {
      return riskLedSummary;
    }
  }

  if (!categoryBreakdown.length) {
    return "Primary exposure drivers are not available for this document.";
  }

  const categoryLabels = categoryBreakdown.slice(0, 2).map((item) => item.name.toLowerCase());
  const categorySummary = buildCategoryDriverSummary(categoryLabels).replace(/[.!?]+$/, "");
  const concentrationBasis = highRiskSectionCount > 0 ? `${highRiskSectionCount} high-risk sections` : `${analysis.riskSummary.total} flagged findings`;

  return `${categorySummary}, with most material exposure concentrated in ${concentrationBasis}.`;
}

function buildRiskMixSummary(categoryBreakdown: { name: RiskCategory; count: number }[]) {
  if (!categoryBreakdown.length) return null;

  const compactItems = categoryBreakdown.slice(0, 2);
  const expandedItems = categoryBreakdown.slice(0, 3);
  const fullText = buildRiskMixSummaryText(categoryBreakdown);

  return {
    compactItems,
    expandedItems,
    hasHiddenCategories: categoryBreakdown.length > compactItems.length,
    fullText
  };
}

function buildRiskMixBreakdown(analysis: ContractAnalysis) {
  return RISK_CATEGORIES.map((name) => ({
    name,
    count: analysis.riskSummary.byCategory[name] ?? 0
  }));
}

function buildTopCriticalRiskItems(analysis: ContractAnalysis) {
  const prioritizedRisks = getPrioritizedRisks(analysis);
  const matchedRiskIds = new Set<string>();
  const items: { id: string; label: string }[] = [];

  for (const summaryRisk of uniqueStrings(analysis.topCriticalRisks.map((risk) => normalizeWhitespace(risk)))) {
    const matchedRisk = findBestMatchingRisk(summaryRisk, prioritizedRisks, matchedRiskIds);
    if (!matchedRisk) continue;

    matchedRiskIds.add(matchedRisk.id);
    items.push({
      id: matchedRisk.id,
      label: buildTopCriticalRiskLabel(matchedRisk.title)
    });

    if (items.length === 4) return items;
  }

  for (const risk of prioritizedRisks) {
    if (matchedRiskIds.has(risk.id)) continue;

    matchedRiskIds.add(risk.id);
    items.push({
      id: risk.id,
      label: buildTopCriticalRiskLabel(risk.title)
    });

    if (items.length === 4) break;
  }

  return items;
}

function buildCategoryDriverSummary(categoryLabels: string[]) {
  if (categoryLabels.length === 1) {
    return `${capitalize(categoryLabels[0])} terms drive the current exposure`;
  }

  if (categoryLabels.length === 2) {
    return `Primary exposure is concentrated in ${categoryLabels[0]} and ${categoryLabels[1]} terms`;
  }

  return `${capitalize(categoryLabels[0])}, ${categoryLabels[1]}, and ${categoryLabels[2]} terms drive the current exposure`;
}

function joinWithAnd(values: string[]) {
  if (!values.length) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildRiskMixSummaryText(items: { name: RiskCategory; count: number }[]) {
  const separator = " \u2022 ";
  return items.map((item) => `${item.name} ${item.count}`).join(separator);
}

function findBestMatchingRisk(
  summaryRisk: string,
  prioritizedRisks: ContractAnalysis["risks"],
  matchedRiskIds: Set<string>
) {
  const normalizedSummaryRisk = normalizeWhitespace(summaryRisk).toLowerCase();
  let bestRisk: ContractAnalysis["risks"][number] | undefined;
  let bestScore = 0;

  for (const risk of prioritizedRisks) {
    if (matchedRiskIds.has(risk.id)) continue;

    const normalizedTitle = normalizeWhitespace(risk.title).toLowerCase();
    if (normalizedTitle === normalizedSummaryRisk) {
      return risk;
    }

    const score = scoreRiskMatch(summaryRisk, risk);
    if (score > bestScore) {
      bestRisk = risk;
      bestScore = score;
    }
  }

  return bestScore > 0 ? bestRisk : undefined;
}

function scoreRiskMatch(summaryRisk: string, risk: ContractAnalysis["risks"][number]) {
  const sourceTokens = new Set(getMeaningfulTokens(summaryRisk));
  const candidateTokens = new Set([
    ...getMeaningfulTokens(risk.title),
    ...getMeaningfulTokens(risk.whyRisky),
    ...getMeaningfulTokens(risk.highlightedText)
  ]);

  let score = 0;
  sourceTokens.forEach((token) => {
    if (candidateTokens.has(token)) score += 1;
  });

  return score;
}

function getMeaningfulTokens(value: string) {
  const stopWords = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "into",
    "that",
    "this",
    "will",
    "shall",
    "must",
    "does",
    "have",
    "has",
    "are",
    "too"
  ]);

  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function buildTopCriticalRiskLabel(value: string) {
  const normalized = normalizeWhitespace(value)
    .replace(/\([^)]*\)/g, "")
    .replace(/[.!?]+$/, "");
  if (normalized.length <= 38) return normalized;

  const separators = [
    " because ",
    " due to ",
    " without ",
    " with ",
    " if ",
    " when ",
    " after ",
    " before ",
    " under ",
    " allowing ",
    " allow ",
    " permits ",
    " permit ",
    " requires ",
    " require ",
    ": ",
    "; ",
    ", "
  ];
  const normalizedLower = normalized.toLowerCase();
  for (const separator of separators) {
    const separatorIndex = normalizedLower.indexOf(separator);
    if (separatorIndex > 16) {
      return normalized.slice(0, separatorIndex).trim();
    }
  }

  const words = normalized.split(" ");
  if (words.length > 5) {
    return trimTrailingConnectorWords(words.slice(0, 5)).join(" ");
  }

  return normalized;
}

function trimTrailingConnectorWords(words: string[]) {
  const trailingWords = new Set(["and", "or", "for", "with", "without", "to", "of", "the", "a", "an", "in", "on"]);
  const trimmedWords = [...words];

  while (trimmedWords.length > 2 && trailingWords.has(trimmedWords[trimmedWords.length - 1].toLowerCase())) {
    trimmedWords.pop();
  }

  return trimmedWords;
}

function buildExecutiveSummaryDetails(
  analysis: ContractAnalysis,
  categoryBreakdown: { name: RiskCategory; count: number }[]
) {
  const prioritizedRisks = [...analysis.risks].sort((a, b) => {
    return severityRank[b.severity] - severityRank[a.severity] || b.confidence - a.confidence;
  });

  return {
    overallPosition: getOverallPositionSentence(analysis),
    keyDrivers: buildExecutiveKeyDrivers(analysis, categoryBreakdown),
    businessImpact: buildExecutiveBusinessImpact(prioritizedRisks, analysis)
  };
}

function buildExecutiveKeyDrivers(
  analysis: ContractAnalysis,
  categoryBreakdown: { name: RiskCategory; count: number }[]
) {
  const driverLabels = buildTopCriticalRiskItems(analysis)
    .slice(0, 2)
    .map((item) => item.label.toLowerCase());

  if (driverLabels.length) {
    return ensureSentence(`Primary drivers are ${joinWithAnd(driverLabels)}`);
  }

  return ensureSentence(buildPrimaryInsightLine(analysis, categoryBreakdown));
}

function buildExecutiveBusinessImpact(
  prioritizedRisks: ContractAnalysis["risks"],
  analysis: ContractAnalysis
) {
  const impactSentences = collectCompleteSummarySentences(
    prioritizedRisks.map((risk) => risk.impactIfIgnored),
    2
  );

  if (impactSentences.length) {
    return impactSentences.join(" ");
  }

  const rationaleSentence = extractFirstSentence(analysis.decisionRationale);
  if (rationaleSentence) {
    return rationaleSentence;
  }

  return "Business impact details are not available.";
}

function collectCompleteSummarySentences(values: string[], maxCount: number) {
  const sentences: string[] = [];

  for (const value of uniqueStrings(values.map((item) => normalizeWhitespace(item)).filter(Boolean))) {
    const sentence = extractFirstSentence(value);
    if (!sentence || sentences.includes(sentence)) continue;

    sentences.push(sentence);
    if (sentences.length === maxCount) break;
  }

  return sentences;
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
