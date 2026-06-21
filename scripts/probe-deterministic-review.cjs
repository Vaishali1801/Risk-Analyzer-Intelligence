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

function assertDeepEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}: expected ${expectedJson}, received ${actualJson}`);
  }
}

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) {
    throw new Error(`${message}: expected to include ${expected}`);
  }
}

function assertNotIncludes(value, unexpected, message) {
  if (value.includes(unexpected)) {
    throw new Error(`${message}: expected not to include ${unexpected}`);
  }
}

function assertMatches(value, pattern, message) {
  if (!pattern.test(value)) {
    throw new Error(`${message}: expected pattern ${pattern}`);
  }
}

function assertThrows(fn, message) {
  try {
    fn();
  } catch {
    return;
  }

  throw new Error(`${message}: expected function to throw`);
}

function assertThrowsInputError(fn, expectedStatusCode, expectedMessagePart, message) {
  try {
    fn();
  } catch (error) {
    assertEqual(error.statusCode, expectedStatusCode, `${message}: status code`);
    assertIncludes(error.message, expectedMessagePart, `${message}: message`);
    return;
  }

  throw new Error(`${message}: expected input validation error`);
}

function listSourceFiles(dir, excludedPathParts = []) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;

    if (excludedPathParts.some((excludedPathPart) => path.includes(excludedPathPart))) {
      return [];
    }

    if (entry.isDirectory()) {
      return listSourceFiles(path, excludedPathParts);
    }

    return /\.(ts|tsx|js|jsx|cjs)$/.test(entry.name) ? [path] : [];
  });
}

const severityRules = loadTsModule("lib/ai/config/severity-rules.ts");
const categoryRules = loadTsModule("lib/ai/config/category-rules.ts");
const gapPriorityRules = loadTsModule("lib/ai/config/gap-priority-rules.ts");
const impactRules = loadTsModule("lib/ai/config/impact-rules.ts");
const confidenceRules = loadTsModule("lib/ai/config/confidence-rules.ts");
const askAiVariants = loadTsModule("lib/ai/config/ask-ai-variants.ts");
const analyzeContractPrompt = loadTsModule("lib/ai/prompts/analyze-contract-prompt.ts", (id) => {
  if (id === "@/lib/ai/config") {
    return {
      ...severityRules,
      ...categoryRules,
      ...gapPriorityRules,
      ...impactRules,
      ...confidenceRules,
      ...askAiVariants
    };
  }

  return require(id);
});
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

  if (id === "@/lib/ai/config/severity-rules") {
    return severityRules;
  }

  return require(id);
});

const schema = loadTsModule("schemas/contract-analysis.ts");
const actions = loadTsModule("lib/reporting/actions.ts");
const parserPreprocess = loadTsModule("lib/parsers/preprocess.ts");
const analyzeInputValidation = loadTsModule("lib/validation/analyze-input.ts");
const clauseSegment = loadTsModule("lib/clauses/segment.ts");
const clauseTag = loadTsModule("lib/clauses/tag.ts", (id) => {
  if (id === "../ai/config/category-rules") return categoryRules;
  return require(id);
});
const clauseBatch = loadTsModule("lib/clauses/batch.ts");
const clauseRender = loadTsModule("lib/clauses/render.ts");
const clauseInput = loadTsModule("lib/clauses/input.ts", (id) => {
  if (id === "./segment") return clauseSegment;
  if (id === "./tag") return clauseTag;
  if (id === "./batch") return clauseBatch;
  if (id === "./render") return clauseRender;
  return require(id);
});
const pdfModel = loadTsModule("lib/reporting/pdf-model.ts", (id) => {
  if (id === "@/lib/output-model") return outputModel;
  return require(id);
});

const {
  deriveTopRiskDriverIds,
  getEffectiveGapReviewDecision,
  getFinalGapReviewCounts,
  getFinalReviewDecision,
  getOverallRiskLevel,
  getReportModel,
  normalizeOutputAnalysis
} = outputModel;
const { buildPdfReportModel } = pdfModel;
const { ContractAnalysisSchema, normalizeGapAnalysis, normalizeRiskAnalysis } = schema;
const { buildClauseAction } = actions;
const { preprocessContractText } = parserPreprocess;
const {
  MAX_CLEAN_TEXT_CHARS,
  MAX_FILE_SIZE_BYTES,
  MIN_TEXT_LENGTH,
  assessTextQuality,
  normalizeDocumentName,
  validatePastedTextPayload,
  validatePreparedText,
  validateUploadedFile
} = analyzeInputValidation;
const { segmentContractClauses } = clauseSegment;
const { tagClause, tagClauses } = clauseTag;
const { createClauseBatches, estimateClauseTokens } = clauseBatch;
const { renderClauseBatch, renderClauseBatches } = clauseRender;
const { buildClauseAwareAnalysisInput } = clauseInput;

const riskUiSource = fs.readFileSync("components/risk-findings-ui.tsx", "utf8");
const analysisWorkspaceSource = fs.readFileSync("components/analysis-workspace.tsx", "utf8");
const askAiRouteSource = fs.readFileSync("app/api/ask-ai/route.ts", "utf8");
const analyzeRouteSource = fs.readFileSync("app/api/analyze/route.ts", "utf8");
const clauseTagSource = fs.readFileSync("lib/clauses/tag.ts", "utf8");
const canonicalRiskDomains = [...categoryRules.RISK_DOMAINS];
const promptWithRetrievedGuidance = analyzeContractPrompt.buildAnalyzeContractPrompt({
  contractText: "Master services agreement with confidentiality, audit, and payment terms.",
  retrievedGuidance: "Use enterprise fallback language for audit rights."
});
const promptWithFallbackGuidance = analyzeContractPrompt.buildAnalyzeContractPrompt({
  contractText: "Short contract text for placeholder replacement."
});

assertEqual(preprocessContractText("Alpha\r\nBeta\rGamma"), "Alpha\nBeta\nGamma", "Preprocess: CRLF and CR normalize to LF");
assertEqual(preprocessContractText("Alpha   Beta\t\tGamma"), "Alpha Beta Gamma", "Preprocess: repeated spaces and tabs collapse");
assertEqual(preprocessContractText("Alpha\n\n\n\nBeta"), "Alpha\n\nBeta", "Preprocess: three or more newlines collapse to one blank line");
assertEqual(preprocessContractText("Alpha\nPage 12 of 34\n\nBeta"), "Alpha\n\nBeta", "Preprocess: Page X of Y marker is removed");
assertIncludes(preprocessContractText("1. Payment Terms\nCustomer shall pay invoices."), "1. Payment Terms", "Preprocess: numbered heading is preserved");
assertIncludes(preprocessContractText("1.1 Fees\nFees are due monthly."), "1.1 Fees", "Preprocess: nested heading is preserved");
assertIncludes(
  preprocessContractText("Section 5. Confidentiality\nEach party protects confidential information."),
  "Section 5. Confidentiality",
  "Preprocess: Section heading is preserved"
);
assertIncludes(
  preprocessContractText("ARTICLE IV - TERMINATION\nEither party may terminate for material breach."),
  "ARTICLE IV - TERMINATION",
  "Preprocess: ARTICLE heading is preserved"
);
assertEqual(
  preprocessContractText("1. Payment Terms\nCustomer shall pay invoices.\n\n2. Liability\nLiability is capped."),
  "1. Payment Terms\nCustomer shall pay invoices.\n\n2. Liability\nLiability is capped.",
  "Preprocess: paragraph boundaries remain suitable for clause segmentation"
);
assertEqual(
  preprocessContractText("- First item\n* Second item\n\u2022 Third item\n(a) Fourth item\n(i) Fifth item"),
  "- First item\n* Second item\n\u2022 Third item\n(a) Fourth item\n(i) Fifth item",
  "Preprocess: bullet and list markers are preserved"
);
assertEqual(preprocessContractText("Supplier shall indem-\nnify customer."), "Supplier shall indemnify customer.", "Preprocess: simple hyphen line break is repaired");
assertEqual(preprocessContractText("   \r\n\t  "), "", "Preprocess: whitespace-only input returns empty string");

assertEqual(MAX_FILE_SIZE_BYTES, 4 * 1024 * 1024, "Analyze input guardrails: max upload size is 4 MB");
assertEqual(MIN_TEXT_LENGTH, 200, "Analyze input guardrails: minimum text length is 200");
assertEqual(MAX_CLEAN_TEXT_CHARS, 80000, "Analyze input guardrails: max cleaned text length is 80,000");
assertEqual(normalizeDocumentName("  Master Services Agreement  ", "Fallback"), "Master Services Agreement", "Analyze input guardrails: document name trims");
assertEqual(normalizeDocumentName("   ", "Fallback"), "Fallback", "Analyze input guardrails: blank document name falls back");
assertThrowsInputError(
  () => validateUploadedFile(null),
  400,
  "Please upload a PDF or DOCX contract.",
  "Analyze input guardrails: missing upload file"
);
assertThrowsInputError(
  () => validateUploadedFile({ name: "empty.pdf", size: 0, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }),
  400,
  "The uploaded file is empty.",
  "Analyze input guardrails: empty upload file"
);
assertThrowsInputError(
  () =>
    validateUploadedFile({
      name: "large.pdf",
      size: MAX_FILE_SIZE_BYTES + 1,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
    }),
  400,
  "under 4 MB",
  "Analyze input guardrails: oversized upload file"
);
assertDeepEqual(
  validatePastedTextPayload({ text: "  Payment terms apply.  ", documentName: "  Pasted MSA  " }),
  { rawText: "Payment terms apply.", documentName: "Pasted MSA" },
  "Analyze input guardrails: pasted payload trims text and document name"
);
assertThrowsInputError(
  () => validatePastedTextPayload({ text: "   " }),
  400,
  "Paste contract text before running the review.",
  "Analyze input guardrails: empty pasted text"
);

const goodContractQualityText = `1. Payment Terms
This agreement is entered into by the parties for services, payment, obligations, confidentiality, termination, liability, indemnity, and governing law. Customer shall pay undisputed invoices within thirty days and supplier shall perform the services in accordance with the agreed term.`;
const goodQuality = assessTextQuality(goodContractQualityText);
assertEqual(goodQuality.ok, true, "Analyze input guardrails: good contract text passes quality check");
assertEqual(goodQuality.likelyScanned, false, "Analyze input guardrails: good contract text is not likely scanned");
assertThrowsInputError(
  () => validatePreparedText("This agreement is too short.", "paste"),
  422,
  "too short. Paste a longer contract or clause set.",
  "Analyze input guardrails: short pasted text keeps friendly short-text behavior"
);
assertThrowsInputError(
  () => validatePreparedText("", "upload"),
  422,
  "text-based PDF or DOCX",
  "Analyze input guardrails: empty upload extraction keeps scanned/text-based PDF guidance"
);

const symbolHeavyGarbage = "@@@ ### $$$ %%% ??? \uFFFD ".repeat(30);
const garbageQuality = assessTextQuality(symbolHeavyGarbage);
assertEqual(garbageQuality.ok, false, "Analyze input guardrails: symbol-heavy garbage fails quality check");
assertEqual(garbageQuality.likelyScanned, true, "Analyze input guardrails: symbol-heavy garbage is likely scanned/unreadable");

const repeatedLineNoise = Array.from({ length: 8 }, () => "The parties agree to provide services and payment obligations under this agreement.").join("\n");
const repeatedLineQuality = assessTextQuality(repeatedLineNoise);
assertEqual(repeatedLineQuality.ok, true, "Analyze input guardrails: repeated-line noise is diagnostic, not a hard fail");
assertEqual(
  repeatedLineQuality.issues.some((issue) => issue.includes("repeated lines")),
  true,
  "Analyze input guardrails: repeated-line noise is flagged"
);

const noHeadingContractText =
  "This agreement between the parties describes services, payment obligations, confidentiality duties, termination rights, liability limits, indemnity obligations, and governing law. Supplier shall provide support and customer shall pay all undisputed invoices within thirty days after receipt.";
const noHeadingQuality = assessTextQuality(noHeadingContractText);
assertEqual(noHeadingQuality.ok, true, "Analyze input guardrails: normal contract text without many headings still passes");
assertEqual(
  noHeadingQuality.issues.some((issue) => issue.includes("no obvious clause headings")),
  true,
  "Analyze input guardrails: missing headings are diagnostic only"
);
assertThrowsInputError(
  () => validatePreparedText(symbolHeavyGarbage, "upload"),
  422,
  "Scanned image PDFs may need OCR first.",
  "Analyze input guardrails: unreadable upload extraction gets scanned-style guidance"
);
assertThrowsInputError(
  () => validatePreparedText("Agreement ".repeat(9000), "paste"),
  413,
  "under 80,000 characters",
  "Analyze input guardrails: text over 80,000 chars fails"
);
assertMatches(
  analyzeRouteSource,
  /new AnalyzeInputError\("Invalid JSON request\. Paste contract text before running the review\.", 400\)/,
  "Analyze route guardrails: malformed JSON path returns friendly 400"
);
assertIncludes(analyzeRouteSource, "validatePreparedText(text, analysisSourceKind)", "Analyze route guardrails: route validates prepared text through helper");

assertIncludes(
  promptWithRetrievedGuidance,
  "Master services agreement with confidentiality, audit, and payment terms.",
  "Analyze prompt: includes provided contract text"
);
assertIncludes(promptWithRetrievedGuidance, "Severity values:", "Analyze prompt: includes severity config guidance");
assertIncludes(promptWithRetrievedGuidance, "Categories:", "Analyze prompt: includes category config guidance");
assertIncludes(promptWithRetrievedGuidance, "Gap priorities:", "Analyze prompt: includes gap priority config guidance");
assertIncludes(promptWithRetrievedGuidance, "Gap impact:", "Analyze prompt: includes impact config guidance");
assertIncludes(promptWithRetrievedGuidance, "Confidence:", "Analyze prompt: includes confidence config guidance");
assertIncludes(promptWithRetrievedGuidance, "Risk variants:", "Analyze prompt: includes risk variant guidance");
assertIncludes(promptWithRetrievedGuidance, "Gap variants:", "Analyze prompt: includes gap variant guidance");
assertIncludes(promptWithRetrievedGuidance, "The application derives or defaults system-owned outputs", "Analyze prompt: includes system-owned fields note");
assertIncludes(promptWithRetrievedGuidance, "overall risk level", "Analyze prompt: ownership note covers risk level");
assertIncludes(promptWithRetrievedGuidance, "risk summary", "Analyze prompt: ownership note covers risk summary");
assertIncludes(promptWithRetrievedGuidance, "top risk drivers", "Analyze prompt: ownership note covers top drivers");
assertIncludes(promptWithRetrievedGuidance, "decision recommendation", "Analyze prompt: ownership note covers decision recommendation");
assertIncludes(promptWithRetrievedGuidance, "recommended actions", "Analyze prompt: ownership note covers recommended actions");
assertIncludes(promptWithRetrievedGuidance, "risk and gap review status", "Analyze prompt: ownership note covers review status");
assertIncludes(promptWithRetrievedGuidance, "PDF layout, counts, summaries, status messages, final review, ordering, and rendering are system-derived.", "Analyze prompt: preserves PDF ownership note");
assertIncludes(promptWithRetrievedGuidance, "Do not output application-derived decision, summary, review, recommended actions, status, or PDF fields.", "Analyze prompt: tells LLM not to emit app-owned output fields");
assertIncludes(promptWithRetrievedGuidance, "Return valid JSON only.", "Analyze prompt: preserves JSON-only guardrail");
assertIncludes(promptWithRetrievedGuidance, "Do not include comments.", "Analyze prompt: preserves no-comments guardrail");
assertIncludes(promptWithRetrievedGuidance, "Do not invent clause references.", "Analyze prompt: preserves no-invented-clause-reference guardrail");
assertIncludes(promptWithRetrievedGuidance, 'use "Section unknown"', "Analyze prompt: preserves unclear clause reference fallback");
assertIncludes(promptWithRetrievedGuidance, "Keep quoted clause text minimal and relevant.", "Analyze prompt: preserves minimal quote guardrail");
assertIncludes(promptWithRetrievedGuidance, "Confidence must be a JSON number between 0 and 1.", "Analyze prompt: preserves confidence JSON number guardrail");
["contractTitle", "executiveSummary", "aiInsight", "risks[]", "gapAnalysis[]"].forEach((field) => {
  assertIncludes(promptWithRetrievedGuidance, field, `Analyze prompt: keeps top-level LLM field ${field}`);
});
assertIncludes(promptWithRetrievedGuidance, "gapAnalysis[]", "Analyze prompt: uses schema-compatible gapAnalysis field");
[
  "id (optional if available)",
  "title",
  "category",
  "severity",
  "clauseRef",
  "clauseText",
  "highlightedText",
  "mitigability",
  "confidence",
  "whyRisky",
  "impactIfIgnored",
  "suggestedImprovement",
  "clauseVariants",
  "sourceClauseIds",
  "evidence",
  "primaryCategory",
  "secondaryCategories",
  "domain",
  "domainSignals"
].forEach((field) => {
  assertIncludes(promptWithRetrievedGuidance, field, `Analyze prompt: keeps canonical risk field ${field}`);
});
assertIncludes(promptWithRetrievedGuidance, "standard", "Analyze prompt: uses schema-compatible standard variant field");
[
  "id (optional if available)",
  "clauseName",
  "category",
  "action",
  "impact",
  "aiConfidence",
  "whyThisMatters",
  "suggestedFix",
  "recommendedClause",
  "clauseVariants",
  "sourceClauseIds",
  "evidence",
  "primaryCategory",
  "secondaryCategories",
  "domain",
  "domainSignals",
  "missingOrWeakProtection"
].forEach((field) => {
  assertIncludes(promptWithRetrievedGuidance, field, `Analyze prompt: keeps canonical gap field ${field}`);
});
assertIncludes(
  promptWithRetrievedGuidance,
  "Use enterprise fallback language for audit rights.",
  "Analyze prompt: includes retrieved guidance"
);
assertIncludes(
  promptWithFallbackGuidance,
  "None provided.",
  "Analyze prompt: includes retrieved guidance fallback"
);
assertNotIncludes(promptWithRetrievedGuidance, "{{CONTRACT_TEXT}}", "Analyze prompt: replaces contract placeholder");
assertNotIncludes(promptWithRetrievedGuidance, "{{CONFIG_GUIDANCE}}", "Analyze prompt: replaces config placeholder");
assertNotIncludes(promptWithRetrievedGuidance, "{{RETRIEVED_GUIDANCE}}", "Analyze prompt: replaces retrieved guidance placeholder");
assertNotIncludes(promptWithRetrievedGuidance, "gaps[]", "Analyze prompt: no longer uses old gaps array field");
assertNotIncludes(promptWithRetrievedGuidance, "askAI", "Analyze prompt: no longer uses old askAI field");
assertNotIncludes(promptWithRetrievedGuidance, "clauseSnippet", "Analyze prompt: no longer uses old clauseSnippet field");
assertNotIncludes(promptWithRetrievedGuidance, "flaggedClause", "Analyze prompt: no longer uses old flaggedClause field");
assertNotIncludes(promptWithRetrievedGuidance, "recommendedDraft", "Analyze prompt: no longer uses old recommendedDraft field");
assertNotIncludes(promptWithRetrievedGuidance, "industryStandard", "Analyze prompt: no longer uses old industryStandard field");
assertNotIncludes(promptWithRetrievedGuidance, "overallRiskLevel", "Analyze prompt: no longer asks for overallRiskLevel output");
assertNotIncludes(promptWithRetrievedGuidance, "decisionRecommendation", "Analyze prompt: no longer asks for decisionRecommendation output");
assertNotIncludes(promptWithRetrievedGuidance, "decisionRationale", "Analyze prompt: no longer asks for decisionRationale output");
assertNotIncludes(promptWithRetrievedGuidance, "riskSummary", "Analyze prompt: no longer asks for riskSummary output");
assertNotIncludes(promptWithRetrievedGuidance, "topCriticalRisks", "Analyze prompt: no longer asks for topCriticalRisks output");
assertNotIncludes(promptWithRetrievedGuidance, "nextActions", "Analyze prompt: no longer asks for nextActions output");
assertNotIncludes(promptWithRetrievedGuidance, "* status", "Analyze prompt: no longer asks for status output fields");
assertNotIncludes(promptWithRetrievedGuidance, "Gap status compatibility", "Analyze prompt: removes old gap status compatibility section");
assertNotIncludes(promptWithRetrievedGuidance, "Do not generate or reason about gap status", "Analyze prompt: removes gap-status-as-output wording");

assertIncludes(riskUiSource, '{ key: "balanced", label: "More Balanced" }', "Risk Ask AI mapping: More Balanced uses balanced key");
assertIncludes(riskUiSource, '{ key: "protective", label: "More Protective" }', "Risk Ask AI mapping: More Protective uses protective key");
assertIncludes(riskUiSource, '{ key: "standard", label: "Industry Standard" }', "Risk Ask AI mapping: Industry Standard uses standard key");
assertNotIncludes(riskUiSource, '{ key: "safer", label: "More Balanced" }', "Risk Ask AI mapping: More Balanced no longer uses safer key");
assertNotIncludes(riskUiSource, '{ key: "hidden", label: "More Protective" }', "Risk Ask AI mapping: More Protective no longer uses hidden key");
assertMatches(
  analysisWorkspaceSource,
  /const askAiActionByLens[\s\S]*balanced: "balanced"[\s\S]*protective: "protective"[\s\S]*standard: "standard"/,
  "Risk Ask AI routing: visible lenses use schema-aligned API actions"
);
assertMatches(
  analysisWorkspaceSource,
  /const riskClauseVariantKeyByLens[\s\S]*balanced: "balanced"[\s\S]*protective: "protective"[\s\S]*standard: "standard"/,
  "Risk Ask AI routing: visible lenses use schema-aligned clauseVariants"
);
assertIncludes(
  askAiRouteSource,
  'const AskAiActionSchema = z.enum(["simplify", "balanced", "protective", "standard", "safer_wording", "hidden_risks", "compare_standard"]);',
  "Risk Ask AI API: schema-aligned actions are accepted"
);
assertIncludes(askAiRouteSource, 'protective: "protective"', "Risk Ask AI API: protective fallback maps to protective action");
assertNotIncludes(askAiRouteSource, 'protective: "hidden"', "Risk Ask AI API: protective fallback does not map to hidden risks");
assertIncludes(
  analysisWorkspaceSource,
  'type GapAskAiVariantKey = "balanced" | "detailed" | "alternative" | "protective";',
  "Gap Ask AI mapping: variant key union remains unchanged"
);
assertIncludes(analysisWorkspaceSource, '{ key: "balanced", label: "More Balanced" }', "Gap Ask AI mapping: balanced option remains");
assertIncludes(analysisWorkspaceSource, '{ key: "detailed", label: "More Detailed" }', "Gap Ask AI mapping: detailed option remains");
assertIncludes(analysisWorkspaceSource, '{ key: "alternative", label: "Alternative Version" }', "Gap Ask AI mapping: alternative option remains");
assertIncludes(analysisWorkspaceSource, '{ key: "protective", label: "More Protective" }', "Gap Ask AI mapping: protective option remains");
assertNotIncludes(
  buildClauseAction("protective", { category: "Legal", originalRecommendedDraft: "" }),
  "Hidden risk",
  "Risk Ask AI fallback: protective action does not use hidden-risk language"
);

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

const partialGap = normalizeGapAnalysis([
  {
    id: "GAP-PARTIAL",
    title: "Missing audit rights",
    action: "Must Add",
    impact: "High"
  }
]).items[0];

assertEqual(partialGap.clauseName, "Missing audit rights", "Gap fallback: title aliases clauseName");
assertEqual(partialGap.category, "General", "Gap fallback: missing category");
assertEqual(partialGap.aiConfidence, 0.75, "Gap fallback: missing confidence");
assertEqual(partialGap.whyThisMatters, "No rationale provided.", "Gap fallback: missing rationale");
assertEqual(partialGap.suggestedFix, "No suggested fix provided.", "Gap fallback: missing suggested fix");
assertEqual(partialGap.recommendedClause, "Recommended clause language is not available yet.", "Gap fallback: missing recommended clause");
assertEqual(partialGap.clauseVariants.balanced, partialGap.recommendedClause, "Gap fallback: balanced variant");
assertEqual(partialGap.clauseVariants.protective, partialGap.recommendedClause, "Gap fallback: protective variant");
assertEqual(normalizeGapAnalysis([{ id: "EMPTY-GAP" }]).items.length, 0, "Gap normalization: empty gap drops safely");
assertEqual(normalizeGapAnalysis([{ ...baseGap, id: "GAP-RAW-CONFIDENCE", aiConfidence: 90 }]).items[0].aiConfidence, 0.9, "Gap confidence: raw percent normalizes");
assertEqual(normalizeGapAnalysis([{ ...baseGap, id: "GAP-DECIMAL-CONFIDENCE", aiConfidence: 0.9 }]).items[0].aiConfidence, 0.9, "Gap confidence: decimal remains decimal");
assertEqual(normalizeGapAnalysis([{ ...baseGap, id: "GAP-HIGH-CONFIDENCE", aiConfidence: 150 }]).items[0].aiConfidence, 1, "Gap confidence: high clamps");
assertEqual(normalizeGapAnalysis([{ ...baseGap, id: "GAP-LOW-CONFIDENCE", aiConfidence: -10 }]).items[0].aiConfidence, 0, "Gap confidence: low clamps");

const sourceGroundedGap = normalizeGapAnalysis([
  {
    ...baseGap,
    id: "GAP-SOURCE-GROUNDED",
    sourceClauseIds: ["CLAUSE-12", "CLAUSE-12"],
    evidence: {
      clauseId: "CLAUSE-12",
      sectionRef: "Section 12",
      quote: "The agreement does not include audit rights.",
      confidence: 88
    },
    primaryCategory: "Compliance",
    secondaryCategories: ["Operational", "Operational"],
    domain: "Compliance",
    domainSignals: ["audit", "controls"],
    missingOrWeakProtection: "Audit rights are missing or too weak."
  }
]).items[0];

assertDeepEqual(sourceGroundedGap.sourceClauseIds, ["CLAUSE-12"], "Gap source grounding: sourceClauseIds preserved and deduplicated");
assertEqual(sourceGroundedGap.evidence.confidence, 0.88, "Gap evidence: confidence normalizes to decimal");
assertEqual(sourceGroundedGap.primaryCategory, "Compliance", "Gap source grounding: primaryCategory preserved");
assertDeepEqual(sourceGroundedGap.secondaryCategories, ["Operational"], "Gap source grounding: secondaryCategories preserved and deduplicated");
assertEqual(sourceGroundedGap.domain, "Compliance", "Gap source grounding: domain preserved");
assertDeepEqual(sourceGroundedGap.domainSignals, ["audit", "controls"], "Gap source grounding: domainSignals preserved");
assertEqual(sourceGroundedGap.missingOrWeakProtection, "Audit rights are missing or too weak.", "Gap source grounding: missingOrWeakProtection preserved");

const baseRisk = {
  id: "RISK-1",
  title: "Broad indemnity exposure",
  category: "Legal",
  severity: "High",
  clauseRef: "Section 8",
  clauseText: "Supplier must indemnify customer for all losses without limitation.",
  highlightedText: "indemnify customer for all losses",
  mitigability: "Medium",
  confidence: 0.9,
  whyRisky: "The indemnity obligation is broad and uncapped.",
  impactIfIgnored: "The business may accept uncapped financial exposure.",
  suggestedImprovement: "Add reasonable exclusions and a liability cap."
};

const leanSchemaAnalysis = ContractAnalysisSchema.parse({
  contractTitle: "Lean Services Agreement",
  executiveSummary:
    "This lean services agreement contains enough meaningful summary content for validation while leaving application-owned decision fields to deterministic logic.",
  risks: [
    {
      category: "Legal",
      severity: "High",
      evidence: { sectionRef: "Section 12" },
      clauseText: "Supplier may recover unlimited indirect damages from customer without a mutual liability cap or exclusion.",
      highlightedText: "unlimited indirect damages",
      confidence: 82,
      whyRisky: "The clause creates uncapped exposure for indirect damages and lacks mutual limitations.",
      impactIfIgnored: "The business may accept material financial exposure without a negotiated cap.",
      suggestedImprovement: "Add a mutual liability cap and exclude indirect or consequential damages."
    }
  ],
  gaps: [
    {
      clauseName: "Missing Audit Rights",
      action: "Must Add",
      impact: "High",
      status: "Accepted",
      whyThisMatters: "The agreement does not provide a way to verify operational controls.",
      suggestedFix: "Add reasonable audit rights with notice, scope, and confidentiality controls.",
      recommendedClause: "Customer may audit relevant controls on reasonable notice no more than once per year."
    }
  ]
});

assertEqual(leanSchemaAnalysis.overallRiskLevel, "Medium", "Schema compatibility: missing overallRiskLevel defaults");
assertEqual(leanSchemaAnalysis.decisionRecommendation, "Renegotiate", "Schema compatibility: missing decisionRecommendation defaults");
assertIncludes(
  leanSchemaAnalysis.decisionRationale,
  "final decision is derived by the application",
  "Schema compatibility: missing decisionRationale defaults"
);
assertDeepEqual(
  leanSchemaAnalysis.riskSummary,
  {
    total: 1,
    high: 1,
    medium: 0,
    low: 0,
    byCategory: { Legal: 1, Financial: 0, Operational: 0, Compliance: 0, Technical: 0 }
  },
  "Schema compatibility: missing riskSummary is synthesized from raw risks"
);
assertDeepEqual(
  leanSchemaAnalysis.topCriticalRisks,
  ["unlimited indirect damages"],
  "Schema compatibility: missing topCriticalRisks is synthesized from available risk text"
);
assertDeepEqual(
  leanSchemaAnalysis.nextActions,
  ["Review identified risks and gaps before approval."],
  "Schema compatibility: missing nextActions is synthesized from risks and gaps"
);
assertEqual(leanSchemaAnalysis.risks[0].id, "RISK-1", "Schema compatibility: missing risk id uses canonical RISK-n id");
assertEqual(leanSchemaAnalysis.risks[0].title, "unlimited indirect damages", "Schema risk fallback: missing title derives from highlighted text");
assertEqual(leanSchemaAnalysis.risks[0].clauseRef, "Section 12", "Schema risk fallback: missing clauseRef uses evidence sectionRef");
assertEqual(leanSchemaAnalysis.risks[0].mitigability, "Medium", "Schema risk fallback: missing mitigability still defaults through nested normalization");
assertEqual(leanSchemaAnalysis.risks[0].confidence, 0.82, "Schema risk fallback: raw percent confidence still normalizes through nested normalization");
assertEqual(leanSchemaAnalysis.gapAnalysis.length, 1, "Schema compatibility: gaps aliases to gapAnalysis when gapAnalysis is missing");
assertEqual(leanSchemaAnalysis.gapAnalysis[0].id, "GAP-1", "Schema compatibility: missing gap id uses canonical GAP-n id");
assertEqual(leanSchemaAnalysis.gapAnalysis[0].status, "Pending", "Schema gap fallback: raw status still defaults through nested normalization");

assertThrows(
  () =>
    ContractAnalysisSchema.parse({
      contractTitle: "Bad Agreement",
      executiveSummary: "Too short",
      risks: [baseRisk]
    }),
  "Schema compatibility: executiveSummary remains meaningfully required"
);

assertEqual(normalizeRiskAnalysis([{ ...baseRisk, id: "RISK-MISSING-CONFIDENCE", confidence: undefined }]).items[0].confidence, 0.75, "Risk confidence: missing defaults");
assertEqual(normalizeRiskAnalysis([{ ...baseRisk, id: "RISK-PERCENT-CONFIDENCE", confidence: 82 }]).items[0].confidence, 0.82, "Risk confidence: percent normalizes");
assertEqual(normalizeRiskAnalysis([{ ...baseRisk, id: "RISK-DECIMAL-CONFIDENCE", confidence: 0.82 }]).items[0].confidence, 0.82, "Risk confidence: decimal remains decimal");
assertEqual(normalizeRiskAnalysis([{ ...baseRisk, id: "RISK-HIGH-CONFIDENCE", confidence: 150 }]).items[0].confidence, 1, "Risk confidence: high clamps");
assertEqual(normalizeRiskAnalysis([{ ...baseRisk, id: "RISK-LOW-CONFIDENCE", confidence: -10 }]).items[0].confidence, 0, "Risk confidence: low clamps");

const shortTitleRisk = normalizeRiskAnalysis([{ ...baseRisk, id: "RISK-SHORT-TITLE", title: "AI" }]).items[0];
assertEqual(shortTitleRisk.title, baseRisk.highlightedText, "Risk fallback: short title derives from highlighted text instead of dropping risk");

const sourceGroundedRisk = normalizeRiskAnalysis([
  {
    ...baseRisk,
    id: "RISK-SOURCE-GROUNDED",
    sourceClauseIds: ["CLAUSE-8", "CLAUSE-8", "CLAUSE-9"],
    evidence: {
      clauseId: "CLAUSE-8",
      clauseIds: ["CLAUSE-8", "CLAUSE-9"],
      clauseTitle: "Indemnity",
      sectionNumber: "8",
      sectionRef: "Section 8",
      pageNumber: 3,
      quote: "Supplier must indemnify customer for all losses without limitation.",
      highlightedText: "all losses without limitation",
      confidence: 92
    },
    primaryCategory: "Legal",
    secondaryCategories: ["Financial", "Financial"],
    domain: "Legal",
    domainSignals: ["indemnity", "uncapped"]
  }
]).items[0];

assertDeepEqual(sourceGroundedRisk.sourceClauseIds, ["CLAUSE-8", "CLAUSE-9"], "Risk source grounding: sourceClauseIds preserved and deduplicated");
assertEqual(sourceGroundedRisk.evidence.clauseId, "CLAUSE-8", "Risk evidence: clauseId preserved");
assertEqual(sourceGroundedRisk.evidence.confidence, 0.92, "Risk evidence: confidence normalizes to decimal");
assertEqual(sourceGroundedRisk.primaryCategory, "Legal", "Risk source grounding: primaryCategory preserved");
assertDeepEqual(sourceGroundedRisk.secondaryCategories, ["Financial"], "Risk source grounding: secondaryCategories preserved and deduplicated");
assertEqual(sourceGroundedRisk.domain, "Legal", "Risk source grounding: domain preserved");
assertDeepEqual(sourceGroundedRisk.domainSignals, ["indemnity", "uncapped"], "Risk source grounding: domainSignals preserved");

const validRisk = normalizeRiskAnalysis([{ ...baseRisk, id: "RISK-VALID" }]).items[0];
assertEqual(validRisk.whyRisky, baseRisk.whyRisky, "Risk normalization: valid whyRisky remains unchanged");
assertEqual(validRisk.impactIfIgnored, baseRisk.impactIfIgnored, "Risk normalization: valid impactIfIgnored remains unchanged");
assertEqual(validRisk.suggestedImprovement, baseRisk.suggestedImprovement, "Risk normalization: valid suggestedImprovement remains unchanged");

const shortSecondaryRisk = normalizeRiskAnalysis([
  {
    ...baseRisk,
    id: "RISK-SHORT-SECONDARY",
    whyRisky: "short",
    impactIfIgnored: " brief ",
    suggestedImprovement: "fix"
  }
]).items[0];

assertEqual(shortSecondaryRisk.whyRisky, "Risk rationale was not provided by the analysis.", "Risk fallback: short whyRisky");
assertEqual(shortSecondaryRisk.impactIfIgnored, "Business impact was not provided by the analysis.", "Risk fallback: short impactIfIgnored");
assertEqual(shortSecondaryRisk.suggestedImprovement, "Review and revise this clause with legal counsel before approval.", "Risk fallback: short suggestedImprovement");

const partialRisk = normalizeRiskAnalysis([
  {
    id: "RISK-PARTIAL",
    title: "Unclear termination rights",
    category: "Legal",
    severity: "Medium",
    mitigability: "Medium",
    whyRisky: "The termination language does not describe a clear cure process."
  }
]).items[0];

assertEqual(partialRisk.confidence, 0.75, "Risk fallback: partial risk confidence");
assertEqual(partialRisk.clauseText, "Clause evidence was not provided by the analysis.", "Risk fallback: missing clause evidence");
assertEqual(partialRisk.impactIfIgnored, "Business impact was not provided by the analysis.", "Risk fallback: missing business impact");
assertEqual(partialRisk.suggestedImprovement, "Review and revise this clause with legal counsel before approval.", "Risk fallback: missing recommendation");
assertEqual(normalizeRiskAnalysis([{ id: "EMPTY-RISK", title: "Empty risk" }]).items.length, 0, "Risk normalization: empty risk drops safely");

const legacyAnalysis = ContractAnalysisSchema.parse({
  contractTitle: "Legacy Agreement",
  executiveSummary: "This legacy agreement has enough summary detail for validation and review.",
  overallRiskLevel: "Medium",
  decisionRecommendation: "Renegotiate",
  decisionRationale: "The contract should be renegotiated because several terms require review.",
  riskSummary: {
    total: 1,
    high: 1,
    medium: 0,
    low: 0,
    byCategory: { Legal: 1, Financial: 0, Operational: 0, Compliance: 0, Technical: 0 }
  },
  topCriticalRisks: ["Broad indemnity exposure"],
  risks: [baseRisk],
  nextActions: ["Review the indemnity clause before approval."]
});

assertEqual(Array.isArray(legacyAnalysis.gapAnalysis ?? []), true, "Legacy analysis: missing gapAnalysis remains backward-compatible");

const staleGapConfidenceDocument = normalizeOutputAnalysis(
  {
    contractTitle: "Legacy Gap Confidence Agreement",
    executiveSummary: "This agreement has enough summary detail for validation and review.",
    overallRiskLevel: "Medium",
    decisionRecommendation: "Renegotiate",
    decisionRationale: "The contract should be renegotiated because several terms require review.",
    riskSummary: {
      total: 1,
      high: 1,
      medium: 0,
      low: 0,
      byCategory: { Legal: 1, Financial: 0, Operational: 0, Compliance: 0, Technical: 0 }
    },
    topCriticalRisks: ["Broad indemnity exposure"],
    risks: [baseRisk],
    gapAnalysis: [{ ...baseGap, id: "GAP-STALE-CONFIDENCE", aiConfidence: 94 }],
    nextActions: ["Review the indemnity clause before approval."]
  },
  { sourceKind: "upload", documentName: "Legacy Gap Confidence Agreement" },
  new Date(0).toISOString()
);

assertEqual(staleGapConfidenceDocument.gapAnalysis[0].aiConfidence, 0.94, "Output model: stale gap confidence normalizes");

const topDriverDocument = normalizeOutputAnalysis(
  {
    contractTitle: "Top Driver Agreement",
    executiveSummary: "This agreement has enough summary detail for deterministic driver validation.",
    overallRiskLevel: "Medium",
    decisionRecommendation: "Renegotiate",
    decisionRationale: "The contract should be renegotiated because several terms require review.",
    riskSummary: {
      total: 4,
      high: 3,
      medium: 1,
      low: 0,
      byCategory: { Legal: 4, Financial: 0, Operational: 0, Compliance: 0, Technical: 0 }
    },
    topCriticalRisks: ["AI-provided order should not drive normalized top risk IDs"],
    risks: [
      { ...baseRisk, id: "RISK-MEDIUM-HIGH-CONFIDENCE", severity: "Medium", confidence: 0.99 },
      { ...baseRisk, id: "RISK-HIGH-SAME-CONFIDENCE-NO-EVIDENCE", severity: "High", confidence: 0.7 },
      { ...baseRisk, id: "RISK-HIGH-SAME-CONFIDENCE-WITH-EVIDENCE", severity: "High", confidence: 0.7, sourceClauseIds: ["CLAUSE-8"] },
      { ...baseRisk, id: "RISK-HIGH-HIGHEST-CONFIDENCE", severity: "High", confidence: 0.8 }
    ],
    gapAnalysis: [],
    nextActions: ["Review the indemnity clause before approval."]
  },
  { sourceKind: "upload", documentName: "Top Driver Agreement", extractedCharacters: 1200 },
  new Date(0).toISOString()
);

assertDeepEqual(
  topDriverDocument.topCriticalRiskIds,
  [
    "RISK-HIGH-HIGHEST-CONFIDENCE",
    "RISK-HIGH-SAME-CONFIDENCE-WITH-EVIDENCE",
    "RISK-HIGH-SAME-CONFIDENCE-NO-EVIDENCE",
    "RISK-MEDIUM-HIGH-CONFIDENCE"
  ],
  "Output model: topCriticalRiskIds derive deterministically from severity, confidence, evidence, and original order"
);
assertDeepEqual(
  deriveTopRiskDriverIds(topDriverDocument.findings),
  topDriverDocument.topCriticalRiskIds,
  "Top risk driver helper: normalized document uses shared deterministic helper"
);
assertDeepEqual(topDriverDocument.findings[2].sourceClauseIds, ["CLAUSE-8"], "Output model: sourceClauseIds preserved on normalized finding");
assertEqual(topDriverDocument.findings[2].primaryCategory, "Legal", "Output model: primaryCategory falls back to category");

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

const partialGapPdfData = buildPdfReportModel(
  getReportModel({ ...normalizedDocument, gapAnalysis: [partialGap] }, acceptedRiskReviewById),
  {}
);
assertEqual(
  partialGapPdfData.detailedGaps[0].recommendedClause,
  partialGap.recommendedClause,
  "PDF gap rendering: fallback recommended clause"
);
assertEqual(
  partialGapPdfData.finalReview.gapRows[0].finalRecommendedClause,
  partialGap.recommendedClause,
  "PDF gap final review: fallback recommended clause"
);
assertEqual(partialGapPdfData.detailedGaps[0].confidenceLabel, "75%", "PDF gap rendering: normalized confidence display");

reportModel = getReportModel(normalizedDocument, acceptedRiskReviewById, { "GAP-1": "rejected" });
assertEqual(reportModel.canFinalizeAll, true, "Finalize: rejected gap is completed");
assertEqual(
  getFinalReviewDecision(reportModel.finalReviewCounts, reportModel.gapFinalReviewCounts),
  "Approve",
  "Final Review: raw AI Reject does not drive completed review decision"
);

assertDeepEqual(
  canonicalRiskDomains,
  ["Financial", "Legal", "Compliance", "Operational", "Technical"],
  "Clause tagging: canonical app domains remain aligned"
);
assertIncludes(
  clauseTagSource,
  "../ai/config/category-rules",
  "Clause tagging: imports canonical category domain config"
);
[
  "severity-rules",
  "confidence-rules",
  "impact-rules",
  "gap-priority-rules",
  "ask-ai-variants",
  "normalizeSeverity",
  "normalizeConfidenceScore",
  "normalizeImpact",
  "normalizeGapPriority",
  "formatAskAiVariantRulesForPrompt"
].forEach((unexpectedConfigSignal) => {
  assertNotIncludes(
    clauseTagSource,
    unexpectedConfigSignal,
    `Clause tagging: does not use unrelated config signal ${unexpectedConfigSignal}`
  );
});

const segmentedClauses = segmentContractClauses(`1. Payment Terms
Customer shall pay all undisputed invoices within thirty days after receipt. Taxes and price increases require written approval.

2. Limitation of Liability
Neither party will be liable for indirect damages, and aggregate liability is capped at fees paid in the prior twelve months.

Section 5. Confidentiality
Each party shall protect confidential information using reasonable safeguards and limit disclosure to authorized personnel.`);

assertEqual(segmentedClauses.length, 3, "Clause segmentation: numbered and section clauses are detected");
assertEqual(segmentedClauses[0].clauseId, "CL-001", "Clause segmentation: first canonical source-clause id");
assertEqual(segmentedClauses[1].clauseId, "CL-002", "Clause segmentation: second canonical source-clause id");
assertEqual(segmentedClauses[0].sectionRef, "1.", "Clause segmentation: numbered sectionRef preserved");
assertEqual(segmentedClauses[0].title, "Payment Terms", "Clause segmentation: numbered title preserved");
assertEqual(segmentedClauses[1].sectionRef, "2.", "Clause segmentation: second numbered sectionRef preserved");
assertEqual(segmentedClauses[1].title, "Limitation of Liability", "Clause segmentation: second numbered title preserved");
assertEqual(segmentedClauses[2].sectionRef, "Section 5", "Clause segmentation: section heading reference preserved");
assertEqual(segmentedClauses[2].title, "Confidentiality", "Clause segmentation: section heading title preserved");

const fallbackClause = segmentContractClauses(
  "This short services agreement describes general cooperation obligations without formal numbered headings or article labels."
);

assertEqual(fallbackClause.length, 1, "Clause segmentation fallback: one clause when no headings exist");
assertEqual(fallbackClause[0].clauseId, "CL-001", "Clause segmentation fallback: canonical source-clause id");
assertEqual(fallbackClause[0].sectionRef, "Section unknown", "Clause segmentation fallback: unknown sectionRef");
assertEqual(fallbackClause[0].title, "Contract text", "Clause segmentation fallback: contract text title");

const paymentTag = tagClause(segmentedClauses[0]);
assertIncludes(paymentTag.domainHints, "Financial", "Clause tagging: payment terms route to Financial");
assertIncludes(paymentTag.clauseTypeHints, "payment", "Clause tagging: payment type hint");
assertEqual(paymentTag.relevanceScore >= 0 && paymentTag.relevanceScore <= 1, true, "Clause tagging: payment relevance is bounded");

const legalTag = tagClause({
  clauseId: "CL-900",
  order: 900,
  sectionRef: "8.",
  title: "Indemnity and Liability",
  text: "Supplier shall indemnify customer for third party claims, subject to the limitation of liability and liability cap."
});

assertIncludes(legalTag.domainHints, "Legal", "Clause tagging: liability and indemnity route to Legal");
assertIncludes(legalTag.clauseTypeHints, "liability", "Clause tagging: liability type hint");
assertIncludes(legalTag.clauseTypeHints, "indemnity", "Clause tagging: indemnity type hint");
assertEqual(legalTag.relevanceScore >= 0 && legalTag.relevanceScore <= 1, true, "Clause tagging: legal relevance is bounded");

const securityDataTag = tagClause({
  clauseId: "CL-901",
  order: 901,
  sectionRef: "9.",
  title: "Data Security",
  text: "Supplier shall maintain security controls, encryption, access control, breach notification, privacy, data protection, and retention safeguards."
});

assertIncludes(securityDataTag.domainHints, "Technical", "Clause tagging: security and breach language routes to Technical");
assertIncludes(securityDataTag.domainHints, "Compliance", "Clause tagging: data and privacy language routes to Compliance");
assertIncludes(securityDataTag.clauseTypeHints, "security", "Clause tagging: security type hint");
assertIncludes(securityDataTag.clauseTypeHints, "data-protection", "Clause tagging: data-protection type hint");
assertEqual(securityDataTag.relevanceScore >= 0 && securityDataTag.relevanceScore <= 1, true, "Clause tagging: security relevance is bounded");

const generalTag = tagClause({
  clauseId: "CL-902",
  order: 902,
  sectionRef: "Section unknown",
  title: "General",
  text: "The parties will cooperate in good faith on routine administrative matters."
});

assertDeepEqual(generalTag.domainHints, ["Operational"], "Clause tagging: weak signal defaults to Operational");
assertDeepEqual(generalTag.clauseTypeHints, ["general"], "Clause tagging: weak signal defaults to general");
assertEqual(generalTag.relevanceScore >= 0 && generalTag.relevanceScore <= 1, true, "Clause tagging: general relevance is bounded");

const clauseTaggings = [paymentTag, legalTag, securityDataTag, generalTag];
clauseTaggings.forEach((tagging) => {
  tagging.domainHints.forEach((domainHint) => {
    assertIncludes(canonicalRiskDomains, domainHint, `Clause tagging: ${domainHint} is a canonical app domain`);
  });
});
canonicalRiskDomains.forEach((canonicalDomain) => {
  assertEqual(
    clauseTaggings.some((tagging) => tagging.domainHints.includes(canonicalDomain)),
    true,
    `Clause tagging: ${canonicalDomain} hint can be produced`
  );
});

const taggedSegmentedClauses = tagClauses(segmentedClauses);
const tightTokenBatches = createClauseBatches(taggedSegmentedClauses.slice(0, 2), { maxEstimatedTokens: 35, maxClausesPerBatch: 12 });

assertEqual(tightTokenBatches.length, 2, "Clause batching: moves full clause to next batch when token limit would be exceeded");
assertEqual(tightTokenBatches[0].clauses.length, 1, "Clause batching: first tight batch keeps first complete clause");
assertEqual(tightTokenBatches[1].clauses.length, 1, "Clause batching: second tight batch keeps second complete clause");
assertEqual(tightTokenBatches[0].clauses[0].clause.text, segmentedClauses[0].text, "Clause batching: first clause text is not cut");
assertEqual(tightTokenBatches[1].clauses[0].clause.text, segmentedClauses[1].text, "Clause batching: second clause text is not cut");
assertMatches(tightTokenBatches[0].batchId, /^BATCH-\d{3}$/, "Clause batching: batch id format");

const clauseLimitBatches = createClauseBatches(taggedSegmentedClauses, { maxEstimatedTokens: 6000, maxClausesPerBatch: 2 });
assertEqual(clauseLimitBatches.length, 2, "Clause batching: respects maxClausesPerBatch");
assertEqual(clauseLimitBatches[0].clauses.length, 2, "Clause batching: first clause-limited batch has requested maximum");
assertEqual(clauseLimitBatches[1].clauses.length, 1, "Clause batching: remaining clause starts next batch");

const tokenLimitedBatches = createClauseBatches(taggedSegmentedClauses, { maxEstimatedTokens: 45, maxClausesPerBatch: 12 });
assertEqual(
  tokenLimitedBatches.every((batch) => batch.estimatedTokens <= 45),
  true,
  "Clause batching: respects maxEstimatedTokens where clauses are not oversized"
);

const oversizedTaggedClause = tagClauses([
  {
    clauseId: "CL-999",
    order: 999,
    sectionRef: "99.",
    title: "Oversized Security Exhibit",
    text: `Security controls ${"and operational safeguards ".repeat(80)}`
  }
]);
const oversizedBatches = createClauseBatches(oversizedTaggedClause, { maxEstimatedTokens: 20, maxClausesPerBatch: 12 });

assertEqual(oversizedBatches.length, 1, "Clause batching: oversized single clause remains in one batch");
assertEqual(oversizedBatches[0].clauses.length, 1, "Clause batching: oversized batch contains only the oversized clause");
assertIncludes(oversizedBatches[0].routingReason.toLowerCase(), "oversized", "Clause batching: oversized condition is noted");
assertEqual(oversizedBatches[0].clauses[0].clause.text, oversizedTaggedClause[0].clause.text, "Clause batching: oversized clause is not split");

const defaultClauseLimitClauses = Array.from({ length: 13 }, (_, index) => ({
  clauseId: `CL-D${index + 1}`,
  order: index + 1,
  sectionRef: `${index + 1}.`,
  title: `Default Batch Clause ${index + 1}`,
  text: "Routine support obligations apply to administrative notices and operational cooperation."
}));
const defaultClauseLimitBatches = createClauseBatches(tagClauses(defaultClauseLimitClauses));

assertEqual(defaultClauseLimitBatches.length, 2, "Clause batching defaults: maxClausesPerBatch is 12");
assertEqual(defaultClauseLimitBatches[0].clauses.length, 12, "Clause batching defaults: first default batch has 12 clauses");
assertEqual(defaultClauseLimitBatches[1].clauses.length, 1, "Clause batching defaults: thirteenth clause starts next batch");

const defaultTokenLimitBatches = createClauseBatches(
  tagClauses([
    {
      clauseId: "CL-T1",
      order: 1,
      sectionRef: "T1.",
      title: "Large Clause One",
      text: "a".repeat(12004)
    },
    {
      clauseId: "CL-T2",
      order: 2,
      sectionRef: "T2.",
      title: "Large Clause Two",
      text: "b".repeat(12004)
    }
  ])
);

assertEqual(estimateClauseTokens("a".repeat(24000)), 6000, "Clause batching: token heuristic is character length divided by four");
assertEqual(defaultTokenLimitBatches.length, 2, "Clause batching defaults: maxEstimatedTokens is 6000");

const renderFixtureBatches = [
  {
    batchId: "BATCH-001",
    domainHints: ["Legal", "Financial", "Legal"],
    clauseTypeHints: ["liability", "payment", "liability"],
    estimatedTokens: 456,
    routingReason: "Internal batch routing reason should not render.",
    clauses: [
      {
        clause: {
          clauseId: "CL-001",
          order: 1,
          sectionRef: "Section 8",
          title: "Limitation of Liability",
          text: " Supplier liability shall not exceed fees paid in the prior twelve months. ",
          pageRef: 4
        },
        tagging: {
          clauseId: "CL-001",
          clauseTypeHints: ["liability", "liability"],
          domainHints: ["Legal", "Financial", "Legal"],
          relevanceScore: 0.91,
          routingReason: "Internal clause routing reason should not render."
        }
      },
      {
        clause: {
          clauseId: "CL-002",
          order: 2,
          sectionRef: "Section 9",
          title: "Indemnity",
          text: "Supplier shall indemnify customer for third party claims."
        },
        tagging: {
          clauseId: "CL-002",
          clauseTypeHints: ["indemnity"],
          domainHints: ["Legal"],
          relevanceScore: 0.88,
          routingReason: "Internal clause routing reason should not render."
        }
      }
    ]
  },
  {
    batchId: "BATCH-002",
    domainHints: ["Technical"],
    clauseTypeHints: ["security"],
    estimatedTokens: 123,
    routingReason: "Internal second batch routing reason should not render.",
    clauses: [
      {
        clause: {
          clauseId: "CL-003",
          order: 3,
          sectionRef: "Section 10",
          title: "Security",
          text: "Vendor must maintain encryption, access controls, and breach notification processes.",
          pageRef: 5
        },
        tagging: {
          clauseId: "CL-003",
          clauseTypeHints: ["security"],
          domainHints: ["Technical"],
          relevanceScore: 0.86,
          routingReason: "Internal security routing reason should not render."
        }
      }
    ]
  }
];
const renderFixtureBefore = JSON.stringify(renderFixtureBatches);
const renderedBatch = renderClauseBatch(renderFixtureBatches[0]);
const renderedBatches = renderClauseBatches(renderFixtureBatches);

assertIncludes(renderedBatch, "Batch BATCH-001", "Clause renderer: renderClauseBatch includes batch ID");
assertIncludes(renderedBatches, "DOCUMENT CLAUSE MAP", "Clause renderer: renderClauseBatches includes document map heading");
assertIncludes(renderedBatches, "[CL-001]", "Clause renderer: clause IDs render in bracket format");
assertIncludes(renderedBatches, "sectionRef: Section 8", "Clause renderer: sectionRef renders");
assertIncludes(renderedBatches, "title: Limitation of Liability", "Clause renderer: title renders");
assertIncludes(renderedBatches, "Supplier liability shall not exceed fees paid in the prior twelve months.", "Clause renderer: text renders and trims");
assertIncludes(renderedBatches, "domains: Legal, Financial", "Clause renderer: batch domain hints render and dedupe");
assertIncludes(renderedBatches, "types: liability, payment", "Clause renderer: batch clause type hints render and dedupe");
assertIncludes(renderedBatches, "domainHints: Legal, Financial", "Clause renderer: clause domain hints render and dedupe");
assertIncludes(renderedBatches, "clauseTypeHints: liability", "Clause renderer: clause type hints render");
assertIncludes(
  renderedBatches,
  "Domain and clause type hints are advisory routing metadata only.",
  "Clause renderer: advisory note exists"
);
["routingReason", "relevanceScore", "estimatedTokens", "order", "pageRef"].forEach((internalField) => {
  assertNotIncludes(renderedBatches, internalField, `Clause renderer: ${internalField} does not render`);
});
assertEqual(
  renderedBatches.indexOf("Batch BATCH-001") < renderedBatches.indexOf("Batch BATCH-002"),
  true,
  "Clause renderer: preserves batch order"
);
assertEqual(
  renderedBatches.indexOf("[CL-001]") < renderedBatches.indexOf("[CL-002]") &&
    renderedBatches.indexOf("[CL-002]") < renderedBatches.indexOf("[CL-003]"),
  true,
  "Clause renderer: preserves clause order"
);
assertEqual(renderClauseBatches([]), "DOCUMENT CLAUSE MAP\nNo clauses available.", "Clause renderer: empty batches fallback");
assertEqual(JSON.stringify(renderFixtureBatches), renderFixtureBefore, "Clause renderer: does not mutate input batches");

const clauseAwareInputSource = `1. Payment Terms
Customer shall pay undisputed invoices within thirty days. Fees, taxes, and price increases require prior written approval.

2. Limitation of Liability
Supplier liability shall not exceed fees paid in the prior twelve months.

3. Security
Supplier shall maintain encryption, access controls, and breach notification processes.`;
const clauseAwareInputBefore = clauseAwareInputSource.slice();
const clauseAwareAnalysisInput = buildClauseAwareAnalysisInput(clauseAwareInputSource);

assertIncludes(clauseAwareAnalysisInput, "DOCUMENT CLAUSE MAP", "Clause input helper: renders document clause map");
assertIncludes(clauseAwareAnalysisInput, "Batch BATCH-001", "Clause input helper: includes first batch id");
assertIncludes(clauseAwareAnalysisInput, "[CL-001]", "Clause input helper: includes first source clause id");
assertIncludes(
  clauseAwareAnalysisInput,
  "Domain and clause type hints are advisory routing metadata only.",
  "Clause input helper: includes renderer advisory note"
);
assertEqual(
  clauseAwareAnalysisInput.indexOf("[CL-001]") < clauseAwareAnalysisInput.indexOf("[CL-002]") &&
    clauseAwareAnalysisInput.indexOf("[CL-002]") < clauseAwareAnalysisInput.indexOf("[CL-003]"),
  true,
  "Clause input helper: preserves clause order"
);
assertIncludes(clauseAwareAnalysisInput, "sectionRef: 1.", "Clause input helper: includes sectionRef");
assertIncludes(clauseAwareAnalysisInput, "title: Payment Terms", "Clause input helper: includes title");
assertIncludes(clauseAwareAnalysisInput, "domainHints: Financial", "Clause input helper: includes domain hints");
assertIncludes(clauseAwareAnalysisInput, "clauseTypeHints: payment", "Clause input helper: includes clause type hints");
assertIncludes(
  clauseAwareAnalysisInput,
  "Customer shall pay undisputed invoices within thirty days.",
  "Clause input helper: includes clause text"
);
["routingReason", "relevanceScore", "estimatedTokens", "order", "pageRef"].forEach((internalField) => {
  assertNotIncludes(clauseAwareAnalysisInput, internalField, `Clause input helper: ${internalField} does not render`);
});
assertEqual(clauseAwareInputSource, clauseAwareInputBefore, "Clause input helper: does not mutate input string");

const runtimeSourceFiles = [
  ...listSourceFiles("app"),
  ...listSourceFiles("components"),
  ...listSourceFiles("hooks"),
  ...listSourceFiles("lib", ["lib/clauses"]),
  ...listSourceFiles("schemas"),
  ...listSourceFiles("types")
];

runtimeSourceFiles.forEach((sourceFile) => {
  const source = fs.readFileSync(sourceFile, "utf8");
  assertNotIncludes(source, "@/lib/clauses", `Runtime wiring: ${sourceFile} does not import clause module by alias`);
  assertNotIncludes(source, "lib/clauses", `Runtime wiring: ${sourceFile} does not import clause module by path`);
  assertNotIncludes(source, "@/lib/clauses/render", `Runtime wiring: ${sourceFile} does not import clause renderer by alias`);
  assertNotIncludes(source, "lib/clauses/render", `Runtime wiring: ${sourceFile} does not import clause renderer by path`);
  assertNotIncludes(source, "@/lib/clauses/input", `Runtime wiring: ${sourceFile} does not import clause input helper by alias`);
  assertNotIncludes(source, "lib/clauses/input", `Runtime wiring: ${sourceFile} does not import clause input helper by path`);
});

console.log("Deterministic review probes passed.");
