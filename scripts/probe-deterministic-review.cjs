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
const { getFinalReviewDecision, getOverallRiskLevel } = outputModel;
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

console.log("Deterministic review probes passed.");
