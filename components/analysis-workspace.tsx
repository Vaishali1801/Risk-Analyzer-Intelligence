"use client";

import Link from "next/link";
import { Fragment, type MouseEvent, type ReactNode, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, ChevronDown, CircleAlert, Download, Info, Scale, ShieldAlert, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildClauseAction } from "@/lib/reporting/actions";
import { getReportDocumentName } from "@/lib/reporting/metadata";
import { readAnalysisSession, type StoredAnalysisSession } from "@/lib/analysis-session";
import { downloadReportPdf } from "@/lib/reporting/pdf";
import {
  buildExecutiveSummaryDetails,
  buildRiskMixBreakdown,
  buildRiskMixSummary,
  buildTopCriticalRiskItems,
  createInitialReviewByRiskId,
  getEffectiveReviewStatus,
  getOverallRiskLevel,
  getPrioritizedFindings,
  getReportModel,
  getReviewState,
  getSafeCategory,
  getSafeClauseSnippet,
  getSafeConfidenceValue,
  getSafeSeverityRank,
  getSafeSeverityStyles,
  getSummaryInsight,
  getUniqueClauseCount,
  normalizeOutputAnalysis,
  type FinalReviewDecision,
  type FinalReviewRow,
  type NormalizedDocumentAnalysis,
  type NormalizedFinding,
  type ReviewByRiskId,
  type SafeRiskCategory
} from "@/lib/output-model";
import { cn } from "@/lib/utils";
import {
  RISK_REVIEW_STATUSES,
  RiskDecisionPanel,
  RiskFindingsTable,
  type RiskPanelFocusTarget,
  type RiskReviewLens,
  type RiskReviewStatus,
  type RiskSortKey
} from "@/components/risk-findings-ui";
import type { ContractAnalysis, GapAnalysisItem, Severity } from "@/types/contract";

type SectionId = "summary" | "gaps-recommendations" | "risks" | "final-review";
type AskAiActionType = "simplify" | "safer_wording" | "hidden_risks" | "compare_standard";
type GapClauseAction = GapAnalysisItem["action"];
type GapClauseImpact = GapAnalysisItem["impact"];
type GapRegisterRow = GapAnalysisItem & {
  category?: unknown;
  aiConfidence?: unknown;
  status?: unknown;
  recommendedClause?: unknown;
  clauseVariants?: unknown;
};
type GapAskAiVariantKey = "balanced" | "detailed" | "alternative" | "protective";
type GapReviewDecision = "accepted" | "rejected";
type GapFinalReviewDecision = "Pending" | "Accepted" | "Rejected";

const sectionTabs: { id: SectionId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "gaps-recommendations", label: "Gaps & Recommendations" },
  { id: "risks", label: "Risks" },
  { id: "final-review", label: "Final Review" }
];

const gapActionFilters: GapClauseAction[] = ["Must Add", "Negotiate", "Optional"];
const fixedSeverityBadgeClassName = "w-[3.25rem] justify-center";
const gapAskAiOptions: { key: GapAskAiVariantKey; label: string }[] = [
  { key: "balanced", label: "More Balanced" },
  { key: "detailed", label: "More Detailed" },
  { key: "alternative", label: "Alternative Version" },
  { key: "protective", label: "More Protective" }
];

const SECTION_OFFSET_PADDING_PX = 16;
const SECTION_ACTIVE_TOLERANCE_PX = 12;
const SECTION_NAVIGATION_SETTLE_DELAY_MS = 450;
const RISK_FOCUS_SCROLL_DELAY_MS = 220;
const SECTION_HASH_PREFIX = "#";
const knownSectionIds = sectionTabs.map((tab) => tab.id);
const askAiActionByLens: Record<RiskReviewLens, AskAiActionType> = {
  simplify: "simplify",
  safer: "safer_wording",
  hidden: "hidden_risks",
  standard: "compare_standard"
};
const riskClauseVariantKeyByLens: Partial<Record<RiskReviewLens, keyof NormalizedFinding["clauseVariants"]>> = {
  safer: "balanced",
  hidden: "protective",
  standard: "standard"
};

export function AnalysisWorkspace() {
  const [session, setSession] = useState<StoredAnalysisSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState<Severity | "All">("All");
  const [category, setCategory] = useState<SafeRiskCategory | "All">("All");
  const [statusFilter, setStatusFilter] = useState<RiskReviewStatus | "All">("All");
  const [sortKey, setSortKey] = useState<RiskSortKey>("severity-desc");
  const [selectedRiskId, setSelectedRiskId] = useState("");
  const [reviewLens, setReviewLens] = useState<RiskReviewLens | null>(null);
  const [activeAskAiLens, setActiveAskAiLens] = useState<RiskReviewLens | null>(null);
  const [reviewByRiskId, setReviewByRiskId] = useState<ReviewByRiskId>({});
  const [isDecisionPanelOpen, setIsDecisionPanelOpen] = useState(false);
  const [panelFocusTarget, setPanelFocusTarget] = useState<RiskPanelFocusTarget>("summary");
  const [expandedFinalReviewGapId, setExpandedFinalReviewGapId] = useState<string | null>(null);
  const [expandedFinalReviewRiskId, setExpandedFinalReviewRiskId] = useState<string | null>(null);
  const [isReviewFinalized, setIsReviewFinalized] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("summary");
  const [activeGapAction, setActiveGapAction] = useState<GapClauseAction>("Must Add");
  const [selectedGapId, setSelectedGapId] = useState("");
  const [gapReviewById, setGapReviewById] = useState<Record<string, GapReviewDecision>>({});
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
  const reviewSessionKeyRef = useRef<string | null>(null);
  const expandedFinalReviewSessionKeyRef = useRef<string | null>(null);

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
    const targetRisk = documentModel?.findings.find((risk) => risk.riskId === riskId);
    if (!targetRisk) return;

    setSearch("");
    setSeverity("All");
    setCategory("All");
    setStatusFilter("All");
    setSelectedRiskId(riskId);
    setReviewLens(null);
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
    setReviewLens(null);
    setPanelFocusTarget(options?.focusTarget ?? "summary");
    setIsDecisionPanelOpen(true);
  };

  const updateRiskStatus = (riskId: string, nextStatus: RiskReviewStatus) => {
    setReviewByRiskId((current) => {
      const finding = documentModel?.findings.find((risk) => risk.riskId === riskId);
      const currentReview = current[riskId] ?? (finding ? getReviewState(current, finding) : undefined);
      if (!currentReview || currentReview.status === nextStatus) return current;

      return {
        ...current,
        [riskId]: {
          ...currentReview,
          status: nextStatus,
          savedRecommendation:
            nextStatus === "needs_change" ? currentReview.savedRecommendation : undefined,
          lastUpdated: new Date().toISOString()
        }
      };
    });
  };

  const updateRiskDraft = (riskId: string, nextDraft: string) => {
    setReviewByRiskId((current) => {
      const finding = documentModel?.findings.find((risk) => risk.riskId === riskId);
      const currentReview = current[riskId] ?? (finding ? getReviewState(current, finding) : undefined);
      if (!currentReview || currentReview.currentDraft === nextDraft) return current;

      return {
        ...current,
        [riskId]: {
          ...currentReview,
          currentDraft: nextDraft
        }
      };
    });
  };

  const resetRiskDraft = (risk: NormalizedFinding) => {
    setReviewLens(null);
    updateRiskDraft(risk.riskId, normalizeReviewText(risk.originalRecommendedDraft));
  };

  const saveRiskRecommendation = (risk: NormalizedFinding) => {
    setReviewByRiskId((current) => {
      const currentReview = getReviewState(current, risk);
      const nextDraft = normalizeReviewText(currentReview.currentDraft) || normalizeReviewText(risk.originalRecommendedDraft);
      if (!nextDraft) return current;

      return {
        ...current,
        [risk.riskId]: {
          ...currentReview,
          status: "needs_change",
          currentDraft: nextDraft,
          savedRecommendation: nextDraft,
          lastUpdated: new Date().toISOString()
        }
      };
    });
  };

  const acceptRisk = (risk: NormalizedFinding) => {
    setReviewByRiskId((current) => {
      const currentReview = getReviewState(current, risk);

      return {
        ...current,
        [risk.riskId]: {
          ...currentReview,
          status: "accepted",
          savedRecommendation: undefined,
          lastUpdated: new Date().toISOString()
        }
      };
    });
  };

  const applyReviewLens = async (risk: NormalizedFinding, nextLens: RiskReviewLens) => {
    if (activeAskAiLens) return;

    const storedVariant = getRiskStoredClauseVariant(risk, nextLens);
    if (storedVariant) {
      setReviewLens(nextLens);
      updateRiskDraft(risk.riskId, storedVariant);
      return;
    }

    setReviewLens(nextLens);
    setActiveAskAiLens(nextLens);

    try {
      const currentReview = getReviewState(effectiveReviewByRiskId, risk);
      const response = await fetch("/api/ask-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          actionType: askAiActionByLens[nextLens],
          riskTitle: risk.riskTitle,
          category: risk.category,
          severity: risk.severity,
          sectionRef: risk.sectionRef,
          fullClauseText: risk.fullClauseText,
          flaggedText: risk.flaggedText,
          whyItMatters: risk.whyItMatters,
          businessImpact: risk.businessImpact,
          currentDraft: currentReview.currentDraft
        })
      });
      const payload = response.ok ? ((await response.json()) as { output?: unknown }) : null;
      const aiOutput = normalizeReviewText(payload?.output);
      const fallbackOutput = aiOutput ? "" : normalizeReviewText(buildClauseAction(nextLens, risk));
      const nextDraft = aiOutput || fallbackOutput;

      if (nextDraft) {
        updateRiskDraft(risk.riskId, nextDraft);
      }
    } catch {
      const fallbackOutput = normalizeReviewText(buildClauseAction(nextLens, risk));
      if (fallbackOutput) {
        updateRiskDraft(risk.riskId, fallbackOutput);
      }
    } finally {
      setActiveAskAiLens(null);
    }
  };

  useEffect(() => {
    const storedSession = readAnalysisSession();
    setSession(storedSession);
    setLoaded(true);
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
  const documentModel = useMemo(() => {
    if (!session) return null;
    return normalizeOutputAnalysis(session.analysis, session.source, session.savedAt);
  }, [session]);
  const reviewSessionKey = useMemo(() => {
    if (!session) return null;
    return [
      session.analysisId ?? "local",
      session.savedAt,
      session.source.sourceKind,
      session.source.documentName
    ].join("|");
  }, [session]);
  const effectiveReviewByRiskId = useMemo(() => {
    if (!documentModel) return reviewByRiskId;
    const scopedReviewByRiskId = reviewSessionKey && reviewSessionKeyRef.current === reviewSessionKey ? reviewByRiskId : {};
    return createInitialReviewByRiskId(documentModel.findings, scopedReviewByRiskId);
  }, [documentModel, reviewByRiskId, reviewSessionKey]);
  const reportModel = useMemo(() => {
    if (!documentModel) return null;
    return getReportModel(documentModel, effectiveReviewByRiskId);
  }, [documentModel, effectiveReviewByRiskId]);

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
    if (!documentModel) return undefined;
    return documentModel.findings.find((risk) => risk.riskId === selectedRiskId);
  }, [documentModel, selectedRiskId]);
  const filteredRisks = useMemo(() => {
    if (!documentModel) return [];

    const query = deferredSearch.trim().toLowerCase();

    return [...documentModel.findings]
      .filter((risk) => severity === "All" || risk.severity === severity)
      .filter((risk) => category === "All" || getSafeCategory(risk) === category)
      .filter((risk) => statusFilter === "All" || getEffectiveReviewStatus(getReviewState(effectiveReviewByRiskId, risk)) === statusFilter)
      .filter((risk) => {
        if (!query) return true;

        return [risk.riskTitle, getSafeClauseSnippet(risk), getSafeCategory(risk)]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "severity-desc":
            return getSafeSeverityRank(b.severity) - getSafeSeverityRank(a.severity) || (getSafeConfidenceValue(b.confidence) ?? -1) - (getSafeConfidenceValue(a.confidence) ?? -1);
          case "severity-asc":
            return getSafeSeverityRank(a.severity) - getSafeSeverityRank(b.severity) || (getSafeConfidenceValue(a.confidence) ?? -1) - (getSafeConfidenceValue(b.confidence) ?? -1);
          case "confidence-desc":
            return (getSafeConfidenceValue(b.confidence) ?? -1) - (getSafeConfidenceValue(a.confidence) ?? -1) || getSafeSeverityRank(b.severity) - getSafeSeverityRank(a.severity);
          case "confidence-asc":
            return (getSafeConfidenceValue(a.confidence) ?? -1) - (getSafeConfidenceValue(b.confidence) ?? -1) || getSafeSeverityRank(a.severity) - getSafeSeverityRank(b.severity);
          case "category-asc":
            return getSafeCategory(a).localeCompare(getSafeCategory(b)) || a.riskTitle.localeCompare(b.riskTitle);
          case "category-desc":
            return getSafeCategory(b).localeCompare(getSafeCategory(a)) || a.riskTitle.localeCompare(b.riskTitle);
          default:
            return 0;
        }
      });
  }, [category, deferredSearch, documentModel, effectiveReviewByRiskId, severity, sortKey, statusFilter]);

  const categoryOptions = useMemo(() => {
    if (!documentModel) return [];

    return Array.from(new Set(documentModel.findings.map((risk) => getSafeCategory(risk)))).sort((a, b) => a.localeCompare(b));
  }, [documentModel]);

  const categoryBreakdown = useMemo(() => {
    if (!documentModel) return [];

    return Object.entries(documentModel.summary.categoryMix)
      .map(([name, count]) => ({ name: name as SafeRiskCategory, count }))
      .sort((a, b) => b.count - a.count);
  }, [documentModel]);
  const gapRecommendations = useMemo(() => {
    return documentModel?.gapAnalysis ?? [];
  }, [documentModel]);
  const gapRecommendationCounts = useMemo(() => {
    return gapActionFilters.reduce<Record<GapClauseAction, number>>(
      (counts, action) => {
        counts[action] = gapRecommendations.filter((clause) => clause.action === action).length;
        return counts;
      },
      { "Must Add": 0, Negotiate: 0, Optional: 0 }
    );
  }, [gapRecommendations]);
  const availableGapActionFilters = useMemo(() => {
    return gapActionFilters.filter((action) => gapRecommendationCounts[action] > 0);
  }, [gapRecommendationCounts]);
  const firstAvailableGapAction = availableGapActionFilters[0] ?? null;
  const selectedGapAction =
    firstAvailableGapAction && gapRecommendationCounts[activeGapAction] > 0
      ? activeGapAction
      : firstAvailableGapAction;
  const hasGapRecommendations = gapRecommendations.length > 0;
  const activeGapClauses = useMemo(() => {
    if (!selectedGapAction) return [];
    return gapRecommendations.filter((clause) => clause.action === selectedGapAction);
  }, [gapRecommendations, selectedGapAction]);
  const selectedGap = useMemo(() => {
    if (!selectedGapId) return undefined;
    return gapRecommendations.find((gap) => gap.id === selectedGapId);
  }, [gapRecommendations, selectedGapId]);

  useEffect(() => {
    if (!firstAvailableGapAction || gapRecommendationCounts[activeGapAction] > 0) return;

    setActiveGapAction(firstAvailableGapAction);
  }, [activeGapAction, firstAvailableGapAction, gapRecommendationCounts]);

  useEffect(() => {
    if (!documentModel || !reviewSessionKey) return;

    setReviewByRiskId((current) => {
      const shouldResetReview = reviewSessionKeyRef.current !== reviewSessionKey;
      const nextReview = createInitialReviewByRiskId(documentModel.findings, shouldResetReview ? {} : current);
      const isUnchanged =
        !shouldResetReview &&
        Object.keys(nextReview).length === Object.keys(current).length &&
        Object.entries(nextReview).every(([riskId, review]) => current[riskId] === review);

      reviewSessionKeyRef.current = reviewSessionKey;
      return isUnchanged ? current : nextReview;
    });
  }, [documentModel, reviewSessionKey]);

  useEffect(() => {
    if (!reviewSessionKey) {
      expandedFinalReviewSessionKeyRef.current = null;
      setExpandedFinalReviewGapId(null);
      setExpandedFinalReviewRiskId(null);
      return;
    }

    if (expandedFinalReviewSessionKeyRef.current === reviewSessionKey) return;

    expandedFinalReviewSessionKeyRef.current = reviewSessionKey;
    setExpandedFinalReviewGapId(null);
    setExpandedFinalReviewRiskId(null);
  }, [reviewSessionKey]);

  useEffect(() => {
    if (!documentModel || !documentModel.findings.length) return;

    const currentSelectionExists = documentModel.findings.some((risk) => risk.riskId === selectedRiskId);
    if (!currentSelectionExists) {
      setSelectedRiskId(getPriorityFinding(documentModel)?.riskId ?? documentModel.findings[0].riskId);
      return;
    }

    const currentSelectionVisible = filteredRisks.some((risk) => risk.riskId === selectedRiskId);
    if (!currentSelectionVisible && filteredRisks.length > 0) {
      setSelectedRiskId(filteredRisks[0].riskId);
    }
  }, [documentModel, filteredRisks, selectedRiskId]);

  useEffect(() => {
    if (filteredRisks.length > 0) return;
    setIsDecisionPanelOpen(false);
  }, [filteredRisks.length]);

  useEffect(() => {
    setReviewLens(null);
  }, [selectedRisk?.riskId]);

  useEffect(() => {
    setIsReviewFinalized(false);
  }, [reviewByRiskId]);

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

  if (!session || !analysis || !documentModel || !reportModel) {
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

  const documentName = documentModel.documentName;
  const nonZeroCategoryBreakdown = categoryBreakdown.filter((item) => item.count > 0);
  const flaggedSectionCount = getUniqueClauseCount(documentModel.findings);
  const totalAnalyzedSectionCount = getTotalAnalyzedSectionCount(analysis);
  const flaggedSectionsDisplay = formatFlaggedSectionSummary(flaggedSectionCount, totalAnalyzedSectionCount);
  const summaryRiskLevel = getOverallRiskLevel(documentModel.findings, documentModel.overallRiskLevel);
  const summaryInsight = getSummaryInsight(documentModel);
  const executiveSummaryDetails = buildExecutiveSummaryDetails(documentModel, nonZeroCategoryBreakdown);
  const riskMixSummary = buildRiskMixSummary(nonZeroCategoryBreakdown);
  const riskMixBreakdown = buildRiskMixBreakdown(documentModel);
  const topCriticalRiskItems = buildTopCriticalRiskItems(documentModel);
  const selectedReview = selectedRisk ? getReviewState(effectiveReviewByRiskId, selectedRisk) : undefined;
  const selectedReviewStatus = selectedReview ? getEffectiveReviewStatus(selectedReview) : RISK_REVIEW_STATUSES[0];
  const selectedRiskDraft = getReviewDraftValue(selectedReview?.currentDraft);
  const finalDecisionRows = reportModel.finalReviewRows;
  const finalDecisionCounts = reportModel.finalReviewCounts;
  const pendingCount = finalDecisionCounts.Pending;
  const finalReviewSummary = buildFinalReviewSummary(reportModel);
  const finalReviewCountsLine = `${finalDecisionCounts.Revised} Revised \u2022 ${finalDecisionCounts.Accepted} Accepted \u2022 ${finalDecisionCounts.Pending} Pending`;
  const finalizeReviewTooltip = pendingCount > 0 ? "Resolve pending items before finalizing" : undefined;

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-40 shadow-[0_10px_26px_rgba(7,27,58,0.22)]">
        <div ref={mainHeaderRowRef} className="border-b border-white/10 bg-[#071B3A] text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-5 py-2.5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h1 className="flex items-center gap-3 text-[1.6rem] font-semibold tracking-tight text-white">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-7 w-7 shrink-0 text-white"
                  fill="none"
                >
                  <path d="M7.6 7.8 12 12m4.4-4.2L12 12m-4.5 4.3L12 12m4.6 4.2L12 12M7.6 7.8h8.8M7.5 16.3h9.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="7.6" cy="7.8" r="1.45" fill="currentColor" />
                  <circle cx="16.4" cy="7.8" r="1.45" fill="currentColor" />
                  <circle cx="7.5" cy="16.3" r="1.45" fill="currentColor" />
                  <circle cx="16.6" cy="16.2" r="1.45" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                </svg>
                <span>AI Risk Analyzer</span>
              </h1>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2.5 lg:justify-end">
              <div className="min-w-0 max-w-full lg:max-w-[22rem]">
                <p className="truncate text-sm font-medium text-white/75" title={documentName}>{documentName}</p>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => downloadReportPdf(reportModel)}
                  className="h-8.5 bg-white px-3 text-[#071B3A] shadow-sm hover:bg-blue-50"
                >
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>

        <nav ref={tabRowRef} aria-label="Analysis sections" className="border-b border-slate-200 bg-white">
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
                      ? "border-[#071B3A] text-[#071B3A]"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  )}
                >
                  {tab.label}
                </a>
              ))}
            </div>
          </div>
        </nav>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-7">
        <section id="summary">
          <Card className="border-slate-300/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_58%,rgba(239,246,255,0.9)_100%)] shadow-[0_22px_56px_rgba(15,23,42,0.1)]">
            <CardContent className="space-y-5 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Decision snapshot</h2>

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
                    tone="primary"
                    valueClassName="min-h-[1.75rem] flex items-center"
                    value={
                      <RiskLevelValue level={summaryRiskLevel} />
                    }
                  />
                  <PrimarySummaryCard
                    label="Sections Flagged"
                    tone="secondary"
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
                    tone="secondary"
                    value={
                      <div className="flex min-w-0 items-center gap-2.5 overflow-hidden whitespace-nowrap text-[0.9rem] text-slate-700">
                        <InlineSeverityStat tone="high" count={documentModel.summary.severityMix.High} label="High" />
                        <InlineSeverityStat tone="medium" count={documentModel.summary.severityMix.Medium} label="Medium" />
                        <InlineSeverityStat tone="low" count={documentModel.summary.severityMix.Low} label="Low" />
                      </div>
                    }
                  />
                  <PrimarySummaryCard
                    label="Risk Mix"
                    tone="tertiary"
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
                  <div className="rounded-2xl border border-blue-100/90 border-l-4 border-l-blue-500/80 bg-blue-50/55 px-5 py-4 shadow-[0_12px_28px_rgba(37,99,235,0.07)]">
                    <p className="text-[1.02rem] leading-7 text-slate-700">
                      <span className="mr-2 inline-flex text-[0.76rem] font-semibold uppercase tracking-[0.15em] text-blue-800">
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
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {topCriticalRiskItems.map((risk) => (
                            <TopCriticalRiskPill
                              key={risk.id}
                              label={risk.label}
                              severity={documentModel.findings.find((finding) => finding.riskId === risk.id)?.severity}
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

        <section id="gaps-recommendations">
          <Card className="border-slate-300/80 bg-white/95 shadow-[0_22px_52px_rgba(15,23,42,0.09)]">
            <CardContent className="space-y-5 p-6 sm:p-7">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Gaps & Recommendations</h2>

              {hasGapRecommendations ? (
                <>
                  <div className="flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100/80 p-1">
                    {availableGapActionFilters.map((action) => (
                      <GapFilterCard
                        key={action}
                        action={action}
                        count={gapRecommendationCounts[action]}
                        selected={selectedGapAction === action}
                        onClick={() => setActiveGapAction(action)}
                      />
                    ))}
                  </div>

                  <GapRegisterTable gaps={activeGapClauses} reviewById={gapReviewById} onOpenGap={(gap) => setSelectedGapId(gap.id)} />
                </>
              ) : (
                <GapRecommendationsEmptyState />
              )}
            </CardContent>
          </Card>
        </section>

        <section id="risks" className="space-y-6">
          <RiskFindingsTable
            risks={filteredRisks}
            totalRiskCount={documentModel.findings.length}
            search={search}
            severity={severity}
            category={category}
            status={statusFilter}
            categoryOptions={categoryOptions}
            sortKey={sortKey}
            selectedRiskId={selectedRiskId}
            reviewByRiskId={effectiveReviewByRiskId}
            onSearchChange={setSearch}
            onSeverityChange={setSeverity}
            onCategoryChange={setCategory}
            onStatusChange={setStatusFilter}
            onSortChange={setSortKey}
            onReviewRisk={(risk) => openRiskPanel(risk.riskId)}
            onAskAi={(risk) => {
              openRiskPanel(risk.riskId, { focusTarget: "ask-ai" });
            }}
          />
        </section>

        <section id="final-review">
          <Card className="overflow-hidden border-slate-300/80 bg-white/95 shadow-[0_22px_52px_rgba(15,23,42,0.09)]">
            <CardContent className="p-0">
              <div className="px-4 pt-4 sm:px-5">
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Final Review</h2>
              </div>

              <div className="grid gap-4 border-b border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_62%,#eef2f7_100%)] px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="text-[0.74rem] font-semibold uppercase tracking-[0.16em] text-slate-600">Recommended Decision</p>
                  <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="text-2xl font-semibold tracking-tight text-slate-950">{finalReviewSummary.recommendation}</h3>
                    <p className="text-sm font-medium text-slate-500">{finalReviewCountsLine}</p>
                  </div>
                  {isReviewFinalized ? (
                    <p className="mt-2 text-sm font-medium text-emerald-700">Review finalized successfully.</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadReportPdf(reportModel)}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Report
                  </Button>
                  <span className="inline-flex" title={finalizeReviewTooltip}>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!reportModel.canFinalize}
                      onClick={() => setIsReviewFinalized(true)}
                      className="gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Finalize Review
                    </Button>
                  </span>
                </div>
              </div>

              <div>
                <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
                  <div className="text-sm font-semibold text-slate-950">Final Decisions</div>
                </div>
                <div className="border-b border-slate-200 pb-3">
                  <div className="px-4 pb-2.5 pt-4 sm:px-5">
                    <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-950">Gap Final Review</h3>
                  </div>
                  {gapRecommendations.length ? (
                    <GapFinalReviewTable
                      gaps={gapRecommendations}
                      reviewById={gapReviewById}
                      expandedGapId={expandedFinalReviewGapId}
                      onToggleGap={(gapId) => setExpandedFinalReviewGapId((current) => (current === gapId ? null : gapId))}
                    />
                  ) : (
                    <div className="px-4 py-2.5 text-sm font-medium text-slate-500 sm:px-5">
                      No gap recommendations available for final review.
                    </div>
                  )}
                </div>
                <div className="pt-4">
                  <div className="px-4 pb-2.5 sm:px-5">
                    <h3 className="text-[0.95rem] font-semibold tracking-tight text-slate-950">Risk Final Review</h3>
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
                        <tr className="bg-slate-100/80 text-left">
                          <th className="border-b border-slate-300/80 px-4 py-2">
                            <TableHeaderLabel className="font-bold tracking-[0.14em] text-slate-600">Risk Title</TableHeaderLabel>
                          </th>
                          <th className="border-b border-slate-300/80 px-4 py-2 text-center">
                            <TableHeaderLabel align="center" className="font-bold tracking-[0.14em] text-slate-600">Decision</TableHeaderLabel>
                          </th>
                          <th className="border-b border-slate-300/80 px-4 py-2">
                            <TableHeaderLabel className="font-bold tracking-[0.14em] text-slate-600">Revised Clause Snippet</TableHeaderLabel>
                          </th>
                          <th className="border-b border-slate-300/80 px-4 py-2 text-center">
                            <TableHeaderLabel align="center" className="font-bold tracking-[0.14em] text-slate-600">Action</TableHeaderLabel>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {finalDecisionRows.map((row) => {
                          const isExpanded = expandedFinalReviewRiskId === row.finding.riskId;

                          return (
                            <Fragment key={row.finding.riskId}>
                              <tr className="bg-white align-middle transition hover:bg-slate-50/80">
                                <td className="border-b border-slate-200/90 px-4 py-2.5">
                                  <div className="min-w-0">
                                    <div
                                      className="overflow-hidden text-[0.86rem] font-semibold leading-5 text-slate-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                                      title={row.finding.riskTitle}
                                    >
                                      {row.finding.riskTitle}
                                    </div>
                                    <div className="mt-0.5 text-[0.72rem] font-medium text-slate-500">{row.finding.sectionRef}</div>
                                  </div>
                                </td>
                                <td className="border-b border-slate-200/90 px-4 py-2.5 text-center">
                                  <FinalReviewDecisionBadge decision={row.decision} />
                                </td>
                                <td className="border-b border-slate-200/90 px-4 py-2.5">
                                  <p className="overflow-hidden text-[0.82rem] leading-5 text-slate-700 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" title={row.finalClause}>
                                    {row.finalClause}
                                  </p>
                                </td>
                                <td className="border-b border-slate-200/90 px-4 py-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedFinalReviewRiskId(isExpanded ? null : row.finding.riskId)}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                                    aria-expanded={isExpanded}
                                  >
                                    {row.actionLabel === "Review" ? "Compare Clauses" : row.actionLabel}
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
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <RiskDecisionPanel
        open={isDecisionPanelOpen}
        risk={selectedRisk}
        status={selectedReviewStatus}
        reviewLens={reviewLens}
        activeAskAiLens={activeAskAiLens}
        draftText={selectedRiskDraft}
        isRecommendationSaved={Boolean(selectedReview?.savedRecommendation && selectedReview.savedRecommendation === selectedRiskDraft)}
        focusTarget={panelFocusTarget}
        onClose={() => setIsDecisionPanelOpen(false)}
        onReviewLensChange={(value) => {
          if (!selectedRisk) return;
          applyReviewLens(selectedRisk, value);
        }}
        onDraftTextChange={(value) => {
          if (!selectedRisk) return;
          updateRiskDraft(selectedRisk.riskId, value);
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
          acceptRisk(selectedRisk);
        }}
        onStatusChange={(value) => {
          if (!selectedRisk) return;
          updateRiskStatus(selectedRisk.riskId, value);
        }}
      />

      <GapReviewPanel
        open={Boolean(selectedGap)}
        gap={selectedGap}
        reviewDecision={selectedGap ? gapReviewById[selectedGap.id] : undefined}
        onClose={() => setSelectedGapId("")}
        onAccept={(gap) => setGapReviewById((current) => ({ ...current, [gap.id]: "accepted" }))}
        onReject={(gap) => setGapReviewById((current) => ({ ...current, [gap.id]: "rejected" }))}
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

function TableHeaderLabel({
  children,
  align = "left",
  className
}: {
  children: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <span className={cn("block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500", align === "center" ? "text-center" : "text-left", className)}>
      {children}
    </span>
  );
}

function GapFinalReviewTable({
  gaps,
  reviewById,
  expandedGapId,
  onToggleGap
}: {
  gaps: GapAnalysisItem[];
  reviewById: Record<string, GapReviewDecision>;
  expandedGapId: string | null;
  onToggleGap: (gapId: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[840px] w-full table-fixed border-separate border-spacing-0">
        <colgroup>
          <col className="w-[34%]" />
          <col className="w-[14%]" />
          <col className="w-[36%]" />
          <col className="w-[16%]" />
        </colgroup>
        <thead>
          <tr className="bg-slate-100/80 text-left">
            <th className="border-b border-slate-300/80 px-4 py-2">
              <TableHeaderLabel className="font-bold tracking-[0.14em] text-slate-600">Gap Title</TableHeaderLabel>
            </th>
            <th className="border-b border-slate-300/80 px-4 py-2 text-center">
              <TableHeaderLabel align="center" className="font-bold tracking-[0.14em] text-slate-600">Decision</TableHeaderLabel>
            </th>
            <th className="border-b border-slate-300/80 px-4 py-2">
              <TableHeaderLabel className="font-bold tracking-[0.14em] text-slate-600">Recommended Clause Snippet</TableHeaderLabel>
            </th>
            <th className="border-b border-slate-300/80 px-4 py-2 text-center">
              <TableHeaderLabel align="center" className="font-bold tracking-[0.14em] text-slate-600">Action</TableHeaderLabel>
            </th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((gap) => {
            const row = gap as GapRegisterRow;
            const isExpanded = expandedGapId === gap.id;
            const decision = getGapFinalReviewDecision(row, reviewById);
            const recommendedClause = getGapRecommendedClause(row);

            return (
              <Fragment key={gap.id}>
                <tr
                  onClick={() => onToggleGap(gap.id)}
                  className="cursor-pointer bg-white align-middle transition hover:bg-slate-50/80"
                >
                  <td className="border-b border-slate-200/90 px-4 py-3">
                    <div
                      className="overflow-hidden text-[0.86rem] font-semibold leading-5 text-slate-950 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                      title={gap.clauseName}
                    >
                      {gap.clauseName}
                    </div>
                  </td>
                  <td className="border-b border-slate-200/90 px-4 py-3 text-center">
                    <GapFinalReviewDecisionBadge decision={decision} />
                  </td>
                  <td className="border-b border-slate-200/90 px-4 py-3">
                    <p className="overflow-hidden text-[0.82rem] leading-5 text-slate-700 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]" title={recommendedClause}>
                      {recommendedClause}
                    </p>
                  </td>
                  <td className="border-b border-slate-200/90 px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleGap(gap.id);
                      }}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[0.78rem] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                      aria-expanded={isExpanded}
                    >
                      Review Clause
                      <ChevronDown className={cn("h-3.5 w-3.5 transition", isExpanded ? "rotate-180" : "")} />
                    </button>
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="bg-slate-50/70">
                    <td colSpan={4} className="border-b border-slate-200 px-4 py-3.5">
                      <GapFinalReviewExpansion recommendedClause={recommendedClause} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GapFinalReviewDecisionBadge({ decision }: { decision: GapFinalReviewDecision }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[0.72rem] font-semibold",
        decision === "Accepted"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : decision === "Rejected"
            ? "border-rose-200 bg-rose-50 text-rose-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
      )}
    >
      {decision}
    </span>
  );
}

function GapFinalReviewExpansion({ recommendedClause }: { recommendedClause: string }) {
  return (
    <div className="rounded-[0.95rem] border border-slate-200 bg-white p-3">
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Full Recommended Clause</div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{recommendedClause}</p>
    </div>
  );
}

function GapRecommendationsEmptyState() {
  return (
    <div className="rounded-[0.95rem] border border-slate-200 bg-slate-50/80 p-4">
      <h3 className="text-sm font-semibold text-slate-950">No significant gaps identified</h3>
      <p className="mt-1.5 text-sm leading-6 text-slate-600">
        The document appears to contain the key elements typically expected for this document type.
      </p>
    </div>
  );
}

function GapFilterCard({
  action,
  count,
  selected,
  onClick
}: {
  action: GapClauseAction;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  const Icon = getGapFilterIcon(action);

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm transition",
        selected
          ? getGapFilterActiveClassName(action)
          : getGapFilterInactiveClassName(action)
      )}
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={2} />
        <span className="font-semibold">{action}</span>
      </span>
      <span className="tabular-nums">({count})</span>
    </button>
  );
}

function GapRegisterTable({
  gaps,
  reviewById,
  onOpenGap
}: {
  gaps: GapAnalysisItem[];
  reviewById: Record<string, GapReviewDecision>;
  onOpenGap: (gap: GapAnalysisItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-[1.05rem] border border-slate-200/90 bg-slate-50/45 shadow-[0_8px_20px_rgba(15,23,42,0.035)]">
      <div className="overflow-x-auto">
        <table className="min-w-[880px] w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[15%]" />
            <col className="w-[13%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead>
            <tr className="bg-slate-100/90 text-left align-middle backdrop-blur">
              <th className="border-b border-slate-300/80 px-3 py-1.5">
                <TableHeaderLabel align="center">Gap Title</TableHeaderLabel>
              </th>
              <th className="border-b border-slate-300/80 px-3 py-1.5">
                <TableHeaderLabel align="center">Category</TableHeaderLabel>
              </th>
              <th className="border-b border-slate-300/80 px-3 py-1.5">
                <TableHeaderLabel align="center">Impact</TableHeaderLabel>
              </th>
              <th className="border-b border-slate-300/80 px-3 py-1.5">
                <TableHeaderLabel align="center">AI Confidence</TableHeaderLabel>
              </th>
              <th className="border-b border-slate-300/80 px-3 py-1.5">
                <TableHeaderLabel align="center">Status</TableHeaderLabel>
              </th>
              <th className="border-b border-slate-300/80 px-3 py-1.5">
                <TableHeaderLabel align="center">Action</TableHeaderLabel>
              </th>
            </tr>
          </thead>
          <tbody>
            {gaps.map((gap) => {
              const row = gap as GapRegisterRow;
              const status = reviewById[gap.id] ? getGapReviewDecisionLabel(reviewById[gap.id]) : getGapStatusLabel(row.status);
              return (
                <tr
                  key={gap.id}
                  onClick={() => onOpenGap(gap)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onOpenGap(gap);
                  }}
                  tabIndex={0}
                  className="group cursor-pointer bg-white transition hover:bg-slate-50/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-900/20"
                >
                  <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle">
                    <div
                      className="overflow-hidden text-[0.82rem] font-semibold leading-5 text-slate-900 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                      title={gap.clauseName}
                    >
                      {gap.clauseName}
                    </div>
                  </td>
                  <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle text-center text-[0.78rem] font-medium text-slate-700">
                    {getGapCategoryLabel(row)}
                  </td>
                  <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle">
                    <div className="flex justify-center">
                      <GapImpactBadge impact={gap.impact} />
                    </div>
                  </td>
                  <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle text-center">
                    <div className="text-[0.81rem] font-semibold tabular-nums text-slate-900">{formatGapAiConfidence(row.aiConfidence)}</div>
                  </td>
                  <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle">
                    <div className="flex justify-center">
                      <GapStatusBadge status={status} />
                    </div>
                  </td>
                  <td className="border-b border-slate-200/90 px-3 py-2.5 align-middle">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenGap(gap);
                        }}
                        className="inline-flex min-h-0 items-center justify-center rounded-full border border-slate-200 bg-white px-2 py-1 text-[0.75rem] font-semibold leading-none text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
                      >
                        Draft Clause
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GapImpactBadge({ impact }: { impact: GapClauseImpact }) {
  return (
    <Badge className={cn("gap-1 px-2 py-[0.28rem] text-[0.7rem] font-semibold", fixedSeverityBadgeClassName, getSafeSeverityStyles(impact), getGapImpactBadgeAccentClassName(impact))}>
      {impact}
    </Badge>
  );
}

function GapStatusBadge({ status }: { status: string }) {
  return (
    <Badge className={cn("gap-1 px-2 py-[0.28rem] text-[0.7rem] font-semibold", getGapStatusBadgeClassName(status))}>
      {status}
    </Badge>
  );
}

function GapReviewPanel({
  open,
  gap,
  reviewDecision,
  onClose,
  onAccept,
  onReject
}: {
  open: boolean;
  gap?: GapAnalysisItem;
  reviewDecision?: GapReviewDecision;
  onClose: () => void;
  onAccept: (gap: GapAnalysisItem) => void;
  onReject: (gap: GapAnalysisItem) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const askAiRef = useRef<HTMLDivElement | null>(null);
  const [activeVariant, setActiveVariant] = useState<GapAskAiVariantKey | null>(null);
  const [variantMessage, setVariantMessage] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "done">("idle");
  const row = gap as GapRegisterRow | undefined;
  const category = row ? getGapCategoryLabel(row) : "General";
  const confidence = row ? formatGapAiConfidence(row.aiConfidence) : "\u2014";
  const baseRecommendedClause = getGapRecommendedClause(row);
  const activeVariantText = row && activeVariant ? getGapClauseVariant(row, activeVariant) : "";
  const displayedRecommendedClause = activeVariantText || baseRecommendedClause;

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
    if (!open || !gap) return;

    setActiveVariant(null);
    setVariantMessage("");
    setCopyState("idle");
    window.requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, [gap?.id, open]);

  if (!gap || !row) return null;

  return createPortal(
    <div className={cn("fixed inset-0 z-[140] transition-opacity duration-300", open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")}>
      <button
        type="button"
        aria-label="Close gap review panel"
        onClick={onClose}
        className={cn("absolute inset-0 bg-slate-950/6 backdrop-blur-[0.5px] transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${gap.clauseName} gap review panel`}
        aria-hidden={!open}
        className={cn(
          "absolute inset-y-0 right-0 h-full w-full max-w-full border-l border-slate-200 bg-white shadow-[-24px_0_60px_rgba(15,23,42,0.16)] transition-transform duration-300 ease-out sm:max-w-[44rem] lg:max-w-[52vw]",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3.5 sm:px-6">
            <div className="min-w-0 space-y-2.5">
              <div className="text-[0.72rem] font-bold tracking-[0.08em] text-slate-700">Gap Review</div>
              <div className="min-w-0">
                <h2 className="text-[1.22rem] font-semibold tracking-tight text-slate-950 sm:text-[1.38rem]">{gap.clauseName}</h2>
                <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1 text-[0.72rem] font-semibold text-slate-600 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">{category}</span>
                  <Badge className={cn("shrink-0 gap-1 px-2 py-[0.28rem] text-[0.7rem] font-semibold", getSafeSeverityStyles(gap.impact), getGapImpactBadgeAccentClassName(gap.impact))}>
                    {gap.impact}
                  </Badge>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 tabular-nums">{confidence}</span>
                </div>
              </div>
            </div>

            <Button type="button" variant="ghost" size="sm" onClick={onClose} className="shrink-0 rounded-full">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div ref={scrollContainerRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">
            <GapPanelSection title="Why This Matters">
              <p className="text-sm leading-7 text-slate-700">{normalizeReviewText(gap.whyThisMatters) || "No rationale provided."}</p>
            </GapPanelSection>

            <GapPanelSection title="Suggested Fix">
              <p className="text-sm leading-7 text-slate-700">{normalizeReviewText(gap.suggestedFix) || "No suggested fix provided."}</p>
            </GapPanelSection>

            <GapPanelSection
              title="Ask AI"
              className="border-slate-300 bg-slate-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
              titleClassName="text-[0.92rem] font-bold tracking-[0.01em] text-slate-900"
            >
              <div ref={askAiRef} className="space-y-4">
                <div className="grid gap-1.5 sm:grid-cols-4">
                  {gapAskAiOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => {
                        const variant = getGapClauseVariant(row, option.key);
                        setActiveVariant(option.key);
                        setVariantMessage(variant ? "" : "AI rewrite is not available yet for this item.");
                      }}
                      className={cn(
                        "inline-flex min-h-8 items-center justify-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.78rem] font-medium transition",
                        activeVariant === option.key
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2.5">
                  <div className="text-sm font-semibold text-slate-900">Recommended Clause</div>
                  <div className="whitespace-pre-wrap rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3.5 text-sm leading-7 text-slate-700">
                    {displayedRecommendedClause}
                  </div>
                  {variantMessage ? <div className="text-sm font-medium leading-6 text-amber-700">{variantMessage}</div> : null}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setActiveVariant(null);
                        setVariantMessage("");
                        setCopyState("idle");
                      }}
                      className="h-9 rounded-full px-3.5"
                    >
                      Reset Draft
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(displayedRecommendedClause);
                          setCopyState("done");
                          window.setTimeout(() => setCopyState("idle"), 1400);
                        } catch {
                          setCopyState("idle");
                        }
                      }}
                      className="h-9 rounded-full px-3.5"
                    >
                      {copyState === "done" ? "Copied" : "Copy Clause"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" onClick={() => onAccept(gap)} className="h-9 rounded-full px-3.5">
                      Accept
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onReject(gap)} className="h-9 rounded-full px-3.5">
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </GapPanelSection>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}

function GapPanelSection({
  title,
  children,
  className,
  titleClassName
}: {
  title: string;
  children: ReactNode;
  className?: string;
  titleClassName?: string;
}) {
  return (
    <section className={cn("rounded-[1.1rem] border border-slate-200 bg-white p-4 shadow-[0_8px_22px_rgba(15,23,42,0.045)]", className)}>
      <div className={cn("mb-3 text-[0.88rem] font-semibold tracking-tight text-slate-900", titleClassName)}>{title}</div>
      {children}
    </section>
  );
}

function getGapFilterActiveClassName(action: GapClauseAction) {
  if (action === "Must Add") return "border-rose-300 bg-rose-100 text-rose-800 font-bold shadow-sm";
  if (action === "Negotiate") return "border-amber-300 bg-amber-100 text-amber-800 font-bold shadow-sm";
  return "border-slate-300 bg-slate-100 text-slate-800 font-bold shadow-sm";
}

function getGapFilterInactiveClassName(action: GapClauseAction) {
  if (action === "Must Add") return "border-transparent bg-rose-50/30 font-medium text-rose-700/75 hover:border-rose-200 hover:bg-rose-50";
  if (action === "Negotiate") return "border-transparent bg-amber-50/30 font-medium text-amber-700/75 hover:border-amber-200 hover:bg-amber-50";
  return "border-transparent bg-slate-50/70 font-medium text-slate-600 hover:border-slate-200 hover:bg-slate-100";
}

function getGapFilterIcon(action: GapClauseAction) {
  if (action === "Must Add") return ShieldAlert;
  if (action === "Negotiate") return Scale;
  return Info;
}

function getGapCategoryLabel(gap: GapRegisterRow) {
  return normalizeReviewText(gap.category) || "General";
}

function formatGapAiConfidence(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014";

  const percent = value <= 1 ? value * 100 : value;
  return `${Math.round(percent)}%`;
}

function getGapStatusLabel(value: unknown) {
  return normalizeReviewText(value) || "Pending";
}

function getGapReviewDecisionLabel(decision: GapReviewDecision) {
  return decision === "accepted" ? "Accepted" : "Rejected";
}

function getGapFinalReviewDecision(gap: GapRegisterRow, reviewById: Record<string, GapReviewDecision>): GapFinalReviewDecision {
  const reviewDecision = reviewById[gap.id];
  if (reviewDecision) return getGapReviewDecisionLabel(reviewDecision);

  const status = getGapStatusLabel(gap.status).toLowerCase().replace(/[\s_-]+/g, " ");
  if (status === "accepted") return "Accepted";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

function getGapStatusBadgeClassName(status: string) {
  const normalizedStatus = status.toLowerCase().replace(/[\s_-]+/g, " ");
  if (normalizedStatus === "accepted" || normalizedStatus === "accept") return "border-emerald-300 bg-emerald-50 text-emerald-700";
  if (normalizedStatus === "rejected" || normalizedStatus === "reject") return "border-rose-300 bg-rose-50 text-rose-700";
  if (normalizedStatus === "needs change" || normalizedStatus === "revised" || normalizedStatus === "revise") return "border-amber-300 bg-amber-50 text-amber-700";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

function getGapRecommendedClause(gap?: GapRegisterRow) {
  return normalizeReviewText(gap?.recommendedClause) || "Recommended clause language is not available yet.";
}

function getGapClauseVariant(gap: GapRegisterRow, variantKey: GapAskAiVariantKey) {
  const variants = getObjectRecord(gap.clauseVariants);
  if (!variants) return "";

  return normalizeReviewText(variants[variantKey]);
}

function getObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  return value as Record<string, unknown>;
}

function getGapImpactBadgeAccentClassName(impact: GapClauseImpact) {
  if (impact === "High") return "border-red-300 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.14)]";
  if (impact === "Medium") return "border-amber-300 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.14)]";
  return "border-emerald-300 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.14)]";
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

function FinalReviewExpansion({ row }: { row: FinalReviewRow }) {
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
  headerAccessory,
  tone = "secondary"
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  headerAccessory?: ReactNode;
  tone?: "primary" | "secondary" | "tertiary";
}) {
  return (
    <div
      className={cn(
        "flex min-h-[4.15rem] flex-col justify-between rounded-[1rem] border px-3.5 py-2.5 ring-1 ring-slate-950/[0.02]",
        tone === "primary"
          ? "border-slate-300 bg-white shadow-[0_16px_34px_rgba(15,23,42,0.1)]"
          : tone === "tertiary"
            ? "border-slate-200/80 bg-slate-50/75 shadow-[0_6px_16px_rgba(15,23,42,0.035)]"
            : "border-slate-200/90 bg-white/95 shadow-[0_10px_22px_rgba(15,23,42,0.055)]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-[0.8rem] uppercase tracking-[0.14em]",
            tone === "primary" ? "font-semibold text-slate-900" : "font-medium text-slate-700"
          )}
        >
          {label}
        </span>
        {headerAccessory}
      </div>
      <div className={cn("min-w-0 flex min-h-[1.65rem] items-center text-left", valueClassName)}>{value}</div>
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
  items: { name: SafeRiskCategory; count: number }[];
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

function TopCriticalRiskPill({ label, severity, onClick }: { label: string; severity?: Severity | "Unknown"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full border border-slate-300/80 bg-white/90 px-3.5 py-2 text-left text-[0.86rem] font-semibold leading-tight text-slate-700 shadow-[0_7px_16px_rgba(15,23,42,0.055)] transition hover:-translate-y-0.5 hover:border-slate-500 hover:bg-white hover:text-slate-950 hover:shadow-[0_12px_24px_rgba(15,23,42,0.09)] active:translate-y-px active:border-slate-600"
      )}
      title={label}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white",
          severity === "High"
            ? "bg-rose-500"
            : severity === "Medium"
              ? "bg-amber-400"
              : severity === "Low"
                ? "bg-emerald-500"
                : "bg-slate-400"
        )}
      />
      <span>{label}</span>
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

function getReviewDraftValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeReviewText(value: unknown) {
  return getReviewDraftValue(value).trim();
}

function getRiskStoredClauseVariant(risk: NormalizedFinding, lens: RiskReviewLens) {
  const variantKey = riskClauseVariantKeyByLens[lens];
  return variantKey ? normalizeReviewText(risk.clauseVariants[variantKey]) : "";
}

function buildFinalReviewSummary(reportModel: ReturnType<typeof getReportModel>) {
  if (reportModel.finalReviewCounts.Pending > 0) {
    return {
      recommendation: "Hold for Review",
      readiness: "Ready after pending items are resolved."
    };
  }

  if (reportModel.overallDecision === "Reject") {
    return {
      recommendation: "Reject",
      readiness: "Ready to finalize rejection recommendation."
    };
  }

  if (reportModel.overallDecision === "Approve with Changes") {
    return {
      recommendation: "Approve with Changes",
      readiness: "Ready to finalize with revised clause positions."
    };
  }

  return {
    recommendation: "Approve",
    readiness: "Ready to finalize with original clauses retained."
  };
}

function getPriorityFinding(documentModel: NormalizedDocumentAnalysis) {
  return getPrioritizedFindings(documentModel.findings)[0];
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
