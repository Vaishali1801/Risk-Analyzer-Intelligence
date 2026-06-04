const fs = require("fs");
const ts = require("typescript");

function loadTsModule(path, localRequire = require) {
  const mod = { exports: {} };
  const source = fs.readFileSync(path, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  new Function("require", "module", "exports", code)(localRequire, mod, mod.exports);
  return mod.exports;
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

const outputModel = loadTsModule("lib/output-model.ts", (id) => {
  if (id === "@/constants/risk") {
    return {
      RISK_CATEGORIES: ["Legal", "Financial", "Operational", "Compliance", "Technical"],
      severityRank: { High: 3, Medium: 2, Low: 1 },
      severityStyles: { High: "", Medium: "", Low: "" }
    };
  }

  if (id === "@/lib/reporting/metadata") {
    return { getReportDocumentName: (name) => name || "Contract" };
  }

  return require(id);
});

const schema = loadTsModule("schemas/contract-analysis.ts");
const pdfModel = loadTsModule("lib/reporting/pdf-model.ts", (id) => {
  if (id === "@/lib/output-model") return outputModel;
  return require(id);
});

const {
  getEffectiveGapReviewDecision,
  getFinalGapReviewCounts,
  getFinalReviewDecision,
  getOverallRiskLevel,
  getReportModel
} = outputModel;
const { buildPdfReportModel } = pdfModel;
const { normalizeGapAnalysis } = schema;

const findings = (severities) =>
  severities.map((severity, index) => ({
    riskId: `RISK-${index + 1}`,
    severity,
    confidence: null,
    category: "Legal"
  }));

assertEqual(getOverallRiskLevel(findings(["High"])), "High", "Risk Level: High by weighted average");
assertEqual(getOverallRiskLevel(findings(["High", "Low"])), "High", "Risk Level: High by high-risk percentage");
assertEqual(getOverallRiskLevel(findings(["Medium"])), "Medium", "Risk Level: Medium by weighted average");
assertEqual(getOverallRiskLevel(findings(["Low"])), "Low", "Risk Level: Low below threshold");
assertEqual(getOverallRiskLevel([]), "Low", "Risk Level: zero-risk fallback");

const riskCounts = (Revised, Accepted, Pending) => ({ Revised, Accepted, Pending });
const gapCounts = (Accepted, Rejected, Pending) => ({ Accepted, Rejected, Pending });

const finalReviewCases = [
  ["pending risk", riskCounts(0, 1, 1), gapCounts(0, 0, 0), "Hold for Review"],
  ["pending gap", riskCounts(0, 2, 0), gapCounts(0, 1, 1), "Hold for Review"],
  ["revised risk", riskCounts(1, 1, 0), gapCounts(0, 2, 0), "Approve with Changes"],
  ["accepted gap", riskCounts(0, 2, 0), gapCounts(1, 2, 0), "Approve with Changes"],
  ["all risks accepted and all gaps rejected", riskCounts(0, 2, 0), gapCounts(0, 3, 0), "Approve"],
  ["all risks accepted and no gaps", riskCounts(0, 2, 0), gapCounts(0, 0, 0), "Approve"],
  ["rejected gaps alone", riskCounts(0, 2, 0), gapCounts(0, 2, 0), "Approve"]
];

finalReviewCases.forEach(([label, risks, gaps, expected]) => {
  const actual = getFinalReviewDecision(risks, gaps);
  assertEqual(actual, expected, `Final Review: ${label}`);
  if (actual === "Reject") {
    throw new Error(`Final Review: ${label} returned forbidden Reject outcome`);
  }
});

const baseGap = {
  id: "GAP-1",
  clauseName: "Security Clause",
  category: "Compliance",
  action: "Must Add",
  impact: "High",
  aiConfidence: 90,
  whyThisMatters: "This missing control creates an operational review gap.",
  suggestedFix: "Add an appropriate security obligation.",
  recommendedClause: "Supplier will maintain appropriate administrative and technical controls.",
  clauseVariants: {
    balanced: "Balanced clause text.",
    detailed: "Detailed clause text.",
    alternative: "Alternative clause text.",
    protective: "Protective clause text."
  }
};

const normalizedGaps = normalizeGapAnalysis([
  { ...baseGap, id: "GAP-P", status: "Pending" },
  { ...baseGap, id: "GAP-A", status: "Accepted" },
  { ...baseGap, id: "GAP-R", status: "Rejected" },
  { ...baseGap, id: "GAP-X", status: "Unexpected" },
  { ...baseGap, id: "GAP-M", status: undefined }
]).items;

normalizedGaps.forEach((gap) => {
  assertEqual(gap.status, "Pending", `Gap status normalization: ${gap.id}`);
});

const acceptedRiskReviewById = {
  "RISK-1": {
    status: "accepted",
    currentDraft: "Use the original clause."
  }
};

const normalizedFinding = {
  riskId: "RISK-1",
  riskTitle: "Risk title",
  sectionRef: "Section 1",
  category: "Legal",
  severity: "Low",
  confidence: 0.9,
  clauseSnippet: "Original clause snippet.",
  fullClauseText: "Original clause text used for final review.",
  flaggedText: "Original clause snippet.",
  whyItMatters: "This risk matters for contract review.",
  businessImpact: "This risk can affect contract operations.",
  originalRecommendedDraft: "Use a safer clause draft.",
  clauseVariants: {}
};

const normalizedDocument = {
  documentName: "Contract",
  contractTitle: "Contract",
  sourceType: "upload",
  analysisGeneratedAt: new Date(0).toISOString(),
  savedAt: new Date(0).toISOString(),
  executiveSummary: "Executive summary placeholder.",
  decisionRationale: "Raw AI rationale placeholder.",
  nextActions: [],
  aiInsight: "Insight placeholder.",
  overallRiskLevel: "Low",
  rawAiDecisionRecommendation: "Reject",
  findings: [normalizedFinding],
  gapAnalysis: [{ ...baseGap, status: "Pending" }],
  topCriticalRiskIds: [],
  summary: {
    totalRiskCount: 1,
    severityMix: { High: 0, Medium: 0, Low: 1 },
    categoryMix: { Legal: 1, Financial: 0, Operational: 0, Compliance: 0, Technical: 0, Uncategorized: 0 }
  }
};

assertEqual(getEffectiveGapReviewDecision({ id: "GAP-1", status: "Accepted" }, {}), "Pending", "Gap decision: raw Accepted remains Pending");
assertEqual(getEffectiveGapReviewDecision({ id: "GAP-1", status: "Rejected" }, {}), "Pending", "Gap decision: raw Rejected remains Pending");
assertEqual(getEffectiveGapReviewDecision({ id: "GAP-1", status: "Pending" }, { "GAP-1": "accepted" }), "Accepted", "Gap decision: user Accepted wins");
assertEqual(getEffectiveGapReviewDecision({ id: "GAP-1", status: "Pending" }, { "GAP-1": "rejected" }), "Rejected", "Gap decision: user Rejected wins");
assertEqual(getFinalGapReviewCounts([{ id: "GAP-1", status: "Accepted" }], {}).Pending, 1, "Gap counts: raw Accepted remains Pending");

let reportModel = getReportModel(normalizedDocument, acceptedRiskReviewById);
assertEqual(reportModel.canFinalize, true, "Finalize: legacy risk-only field remains true");
assertEqual(reportModel.canFinalizeAll, false, "Finalize: pending gap blocks gap-aware field");
assertEqual(reportModel.gapFinalReviewCounts.Pending, 1, "Finalize: pending gap counted");
assertEqual(
  getFinalReviewDecision(reportModel.finalReviewCounts, reportModel.gapFinalReviewCounts),
  "Hold for Review",
  "Final Review: raw AI Reject does not override pending gap decision"
);

const pdfDataWithPendingGap = buildPdfReportModel(reportModel, {});
assertEqual(
  pdfDataWithPendingGap.dashboard.statusMessage,
  "Pending decisions remain. Complete review before finalization.",
  "PDF statusMessage: pending gap blocks ready message"
);

reportModel = getReportModel(normalizedDocument, acceptedRiskReviewById, { "GAP-1": "rejected" });
assertEqual(reportModel.canFinalizeAll, true, "Finalize: rejected gap is completed");
assertEqual(
  getFinalReviewDecision(reportModel.finalReviewCounts, reportModel.gapFinalReviewCounts),
  "Approve",
  "Final Review: raw AI Reject does not drive completed review decision"
);

console.log("Deterministic review probes passed.");
