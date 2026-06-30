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

function assertGreaterThan(actual, expected, message) {
  if (!(actual > expected)) {
    throw new Error(`${message}: expected greater than ${expected}, received ${actual}`);
  }
}

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) {
    throw new Error(`${message}: expected to include ${expected}`);
  }
}

function assertNumber(value, message) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${message}: expected finite number, received ${value}`);
  }
}

const categoryRules = loadTsModule("lib/ai/config/category-rules.ts");
const clauseSegment = loadTsModule("lib/clauses/segment.ts");
const clauseTag = loadTsModule("lib/clauses/tag.ts", (id) => {
  if (id === "../ai/config/category-rules") return categoryRules;
  return require(id);
});
const sessionEvidence = loadTsModule("lib/rag/session-evidence.ts", (id) => {
  if (id === "@/lib/clauses/segment") return clauseSegment;
  if (id === "@/lib/clauses/tag") return clauseTag;
  return require(id);
});
const knowledgeTypes = loadTsModule("lib/rag/knowledge-types.ts");

const { buildSessionEvidencePackage, estimateTokensFromText } = sessionEvidence;

const contractText = `1. Payment Terms
Customer shall pay all undisputed invoices within thirty days after receipt. Taxes, fees, and price increases require written approval.

2. Limitation of Liability
Neither party will be liable for indirect damages, and aggregate liability is capped at fees paid in the prior twelve months.

Section 5. Confidentiality
Each party shall protect confidential information using reasonable safeguards and limit disclosure to authorized personnel.

Section 8. Data Security
Supplier shall maintain security controls, encryption, access control, breach notification, privacy, data protection, and retention safeguards.`;

const firstPackage = buildSessionEvidencePackage(contractText, {
  source: {
    documentName: "Session Evidence Fixture",
    sourceKind: "paste"
  }
});
const secondPackage = buildSessionEvidencePackage(contractText, {
  source: {
    documentName: "Session Evidence Fixture",
    sourceKind: "paste"
  }
});

assertEqual(firstPackage.adapterVersion, "session-evidence-v1", "Session evidence: adapter version");
assertDeepEqual(firstPackage, secondPackage, "Session evidence: package output is deterministic");
assertGreaterThan(firstPackage.clauseCount, 0, "Session evidence: clause count is positive");
assertEqual(firstPackage.clauseCount, firstPackage.clauses.length, "Session evidence: clause count matches clause array");
assertGreaterThan(firstPackage.tokenEstimate, 0, "Session evidence: package token estimate is positive");
assertEqual(firstPackage.source.documentName, "Session Evidence Fixture", "Session evidence: source document name is preserved");

const [paymentClause, liabilityClause, confidentialityClause, securityClause] = firstPackage.clauses;

assertEqual(paymentClause.clauseId, "CL-001", "Session evidence: first stable clause id");
assertEqual(liabilityClause.clauseId, "CL-002", "Session evidence: second stable clause id");
assertEqual(paymentClause.order, 1, "Session evidence: order is preserved");
assertEqual(paymentClause.sectionRef, "1.", "Session evidence: numbered sectionRef is preserved");
assertEqual(paymentClause.title, "Payment Terms", "Session evidence: numbered title is preserved");
assertIncludes(paymentClause.text, "Customer shall pay all undisputed invoices", "Session evidence: clause text is included");
assertEqual(paymentClause.clauseType, "payment", "Session evidence: primary clauseType uses first hint");
assertIncludes(paymentClause.clauseTypeHints, "payment", "Session evidence: clause type hints are preserved");
assertIncludes(paymentClause.domainHints, "Financial", "Session evidence: domain hints are preserved");
assertIncludes(paymentClause.domainSignals, "Financial", "Session evidence: domainSignals mirror existing domain hints");
assertNumber(paymentClause.tokenEstimate, "Session evidence: clause token estimate is numeric");
assertEqual(paymentClause.tokenEstimate, estimateTokensFromText(paymentClause.text), "Session evidence: clause token estimate uses shared heuristic");
assertNumber(paymentClause.charStart, "Session evidence: charStart is numeric when located");
assertNumber(paymentClause.charEnd, "Session evidence: charEnd is numeric when located");
assertGreaterThan(paymentClause.charEnd, paymentClause.charStart, "Session evidence: charEnd follows charStart");

assertEqual(confidentialityClause.sectionRef, "Section 5", "Session evidence: Section heading reference is preserved");
assertEqual(confidentialityClause.title, "Confidentiality", "Session evidence: Section heading title is preserved");
assertIncludes(confidentialityClause.clauseTypeHints, "confidentiality", "Session evidence: confidentiality hint is preserved");
assertIncludes(confidentialityClause.domainHints, "Legal", "Session evidence: confidentiality legal hint is preserved");
assertIncludes(confidentialityClause.domainHints, "Compliance", "Session evidence: confidentiality compliance hint is preserved");

assertEqual(securityClause.sectionRef, "Section 8", "Session evidence: security sectionRef is preserved");
assertIncludes(securityClause.clauseTypeHints, "security", "Session evidence: security type hint is preserved");
assertIncludes(securityClause.clauseTypeHints, "data-protection", "Session evidence: data-protection type hint is preserved");
assertIncludes(securityClause.domainHints, "Technical", "Session evidence: security technical hint is preserved");
assertIncludes(securityClause.domainHints, "Compliance", "Session evidence: security compliance hint is preserved");

firstPackage.clauses.forEach((clause) => {
  assertGreaterThan(clause.text.length, 0, `Session evidence: ${clause.clauseId} text is present`);
  assertNumber(clause.tokenEstimate, `Session evidence: ${clause.clauseId} token estimate is numeric`);
  assertGreaterThan(clause.clauseTypeHints.length, 0, `Session evidence: ${clause.clauseId} has clause type hints`);
  assertGreaterThan(clause.domainHints.length, 0, `Session evidence: ${clause.clauseId} has domain hints`);
});

assertIncludes(knowledgeTypes.KB_COLLECTIONS, "company_profile", "Knowledge types: company profile collection exists");
assertIncludes(knowledgeTypes.KB_COLLECTIONS, "risk_taxonomy", "Knowledge types: risk taxonomy collection exists");
assertIncludes(
  knowledgeTypes.KB_COLLECTIONS,
  "contract_review_playbook",
  "Knowledge types: contract review playbook collection exists"
);
assertIncludes(
  knowledgeTypes.KB_COLLECTIONS,
  "contract_review_checklist",
  "Knowledge types: contract review checklist collection exists"
);
assertIncludes(
  knowledgeTypes.KB_COLLECTIONS,
  "security_compliance_standards",
  "Knowledge types: security compliance standards collection exists"
);
assertIncludes(knowledgeTypes.KB_COLLECTIONS, "clause_library", "Knowledge types: clause library collection exists");
assertIncludes(knowledgeTypes.KB_COLLECTIONS, "procurement_policy", "Knowledge types: procurement policy collection exists");
assertIncludes(
  knowledgeTypes.KB_COLLECTIONS,
  "privacy_data_governance_standards",
  "Knowledge types: privacy data governance collection exists"
);
assertEqual(knowledgeTypes.isKBCollection("clause_library"), true, "Knowledge types: isKBCollection accepts known collection");
assertEqual(knowledgeTypes.isKBCollection("unknown"), false, "Knowledge types: isKBCollection rejects unknown collection");

console.log("Session evidence probes passed.");
