const fs = require("fs");
const ts = require("typescript");

const ROUTER_PATH = "lib/rag/router.ts";
const PACKAGE_PATH = "package.json";

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function assertIncludes(value, expected, message) {
  if (!value.includes(expected)) {
    throw new Error(`${message}: expected to include ${expected}`);
  }
}

function assertNotMatches(value, pattern, message) {
  if (pattern.test(value)) {
    throw new Error(message);
  }
}

function collectSourceFiles(paths) {
  const files = [];

  paths.forEach((path) => {
    if (!fs.existsSync(path)) return;
    const stat = fs.statSync(path);

    if (stat.isFile()) {
      files.push(path);
      return;
    }

    fs.readdirSync(path, { withFileTypes: true }).forEach((entry) => {
      if (entry.name === "node_modules" || entry.name === ".next") return;
      const childPath = `${path}/${entry.name}`;

      if (entry.isDirectory()) {
        files.push(...collectSourceFiles([childPath]));
      } else if (/\.(ts|tsx|cjs|json|sql)$/.test(entry.name)) {
        files.push(childPath);
      }
    });
  });

  return files;
}

function assertNoPatternInFiles(files, pattern, message) {
  files.forEach((file) => {
    const source = fs.readFileSync(file, "utf8");
    assertNotMatches(source, pattern, `${message}: ${file}`);
  });
}

function loadTsModule(path) {
  const mod = { exports: {} };
  const source = fs.readFileSync(path, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  new Function("require", "module", "exports", code)(require, mod, mod.exports);
  return mod.exports;
}

function makeClause(id, order, title, text, clauseTypeHints, domainHints, relevanceScore = 0.7) {
  return {
    clauseId: id,
    order,
    sectionRef: `Section ${order}`,
    title,
    text,
    clauseType: clauseTypeHints[0],
    clauseTypeHints,
    domainSignals: domainHints,
    domainHints,
    tokenEstimate: Math.ceil(text.length / 4),
    relevanceScore,
    routingReason: `Probe clause for ${title}`
  };
}

function makeEvidence(clauses) {
  return {
    adapterVersion: "session-evidence-v1",
    sourceTextLength: clauses.reduce((total, clause) => total + clause.text.length, 0),
    normalizedTextLength: clauses.reduce((total, clause) => total + clause.text.length, 0),
    clauseCount: clauses.length,
    tokenEstimate: clauses.reduce((total, clause) => total + clause.tokenEstimate, 0),
    clauses
  };
}

function findQuery(queries, sourceClauseId) {
  return queries.find((query) => query.sourceClauseId === sourceClauseId);
}

function assertQueryMetadata(query, label) {
  assertTruthy(query.metadata, `${label}: query metadata exists`);
  [
    "routerVersion",
    "sourceClauseTitle",
    "sourceSectionRef",
    "clauseTypeHints",
    "domainHints",
    "matchedRouterRules",
    "matchedKeywords",
    "routingReason",
    "queryRole",
    "queryIndexForClause",
    "clauseRelevanceScore",
    "contractTypesApplied",
    "filtersApplied",
    "routingMetadata"
  ].forEach((key) => {
    assertTruthy(Object.prototype.hasOwnProperty.call(query.metadata, key), `${label}: metadata includes ${key}`);
  });

  assertTruthy(Array.isArray(query.metadata.routingMetadata.matchedClauseTypes), `${label}: routing metadata has matched clause types`);
  assertTruthy(Array.isArray(query.metadata.routingMetadata.matchedDomains), `${label}: routing metadata has matched domains`);
  assertTruthy(Array.isArray(query.metadata.routingMetadata.matchedKeywords), `${label}: routing metadata has matched keywords`);
  assertTruthy(
    ["clause_type", "keyword", "fallback"].includes(query.metadata.routingMetadata.routingStrategy),
    `${label}: routing strategy is known`
  );
  assertTruthy(
    typeof query.metadata.routingMetadata.confidence === "number" &&
      query.metadata.routingMetadata.confidence >= 0 &&
      query.metadata.routingMetadata.confidence <= 1,
    `${label}: confidence is a deterministic numeric score`
  );
}

assertTruthy(fs.existsSync(ROUTER_PATH), "RAG router: router file exists");

const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
assertTruthy(packageJson.scripts["probe:rag-router"], "RAG router: package script exists");

const routerSource = fs.readFileSync(ROUTER_PATH, "utf8");
assertIncludes(routerSource, "buildRetrievalQueriesFromEvidence", "RAG router: buildRetrievalQueriesFromEvidence is exported");
assertIncludes(routerSource, "normalizeRetrievalQueryText", "RAG router: reusable query normalization helper is exported");
assertIncludes(routerSource, "maxQueriesPerClause", "RAG router: maxQueriesPerClause option exists");
assertIncludes(routerSource, "maxTotalQueries", "RAG router: maxTotalQueries option exists");
assertIncludes(routerSource, "minClauseRelevance", "RAG router: minClauseRelevance option exists");
assertIncludes(routerSource, "routingMetadata", "RAG router: routing confidence metadata exists");
assertNotMatches(routerSource, /\bretrieveKnowledge\b|createRagPostgresPool|embedRetrievalQueryText|from\s+["']pg["']|require\(["']pg["']\)|new\s+OpenAI|embeddings\.create/i, "RAG router: no DB/OpenAI/retrieval execution code exists");

const { buildRetrievalQueriesFromEvidence, normalizeRetrievalQueryText } = loadTsModule(ROUTER_PATH);

const clauses = [
  makeClause(
    "CL-001",
    1,
    "Limitation of Liability",
    "Supplier liability is uncapped for all claims and includes unlimited consequential damages exposure.",
    ["liability"],
    ["Legal"],
    0.75
  ),
  makeClause(
    "CL-002",
    2,
    "Security Incident Notice",
    "Provider shall provide breach notification after a confirmed security incident and maintain encryption and access controls.",
    ["security"],
    ["Technical", "Compliance"],
    0.72
  ),
  makeClause(
    "CL-003",
    3,
    "Subprocessor Disclosure",
    "Provider may use subprocessors without prior notice, customer approval, or subcontractor governance commitments.",
    ["subcontractors"],
    ["Operational", "Compliance"],
    0.68
  ),
  makeClause(
    "CL-004",
    4,
    "AI Training Rights",
    "Provider may use customer data, derived data, embeddings, and personal data for AI model training.",
    ["data-protection"],
    ["Compliance", "Technical"],
    0.7
  ),
  makeClause(
    "CL-005",
    5,
    "Transition Assistance",
    "On termination, supplier shall provide transition assistance, operational continuity support, and reasonable exit services.",
    ["general"],
    ["Operational"],
    0.2
  ),
  makeClause(
    "CL-006",
    6,
    "Notices",
    "Routine notices may be sent by email.",
    ["general"],
    ["Operational"],
    0.05
  )
];

const queries = buildRetrievalQueriesFromEvidence(makeEvidence(clauses), {
  contractTypes: ["SaaS"],
  maxQueriesPerClause: 2
});

assertTruthy(queries.length > 0, "RAG router: generates retrieval queries");
assertTruthy(queries.length <= 12, "RAG router: default cap uses important clauses times two");
queries.forEach((query, index) => {
  assertTruthy(query.id && query.queryText && query.intent, `RAG router: query ${index} has required fields`);
  assertEqual(query.topK, 6, `RAG router: query ${index} topK`);
  assertEqual(query.minSimilarity, 0.5, `RAG router: query ${index} minSimilarity`);
  assertTruthy(!query.filters.governanceAreas, `RAG router: query ${index} avoids governanceArea filters`);
  assertTruthy(Array.isArray(query.filters.collections) && query.filters.collections.length > 0, `RAG router: query ${index} has collection filters`);
  assertTruthy(Array.isArray(query.filters.primaryDomains) && query.filters.primaryDomains.length > 0, `RAG router: query ${index} has domain filters`);
  assertTruthy(Array.isArray(query.filters.retrievalTags) && query.filters.retrievalTags.length > 0, `RAG router: query ${index} has retrieval tags`);
  assertTruthy(JSON.stringify(query.filters.contractTypes) === JSON.stringify(["SaaS"]), `RAG router: query ${index} applies provided contract types`);
  assertTruthy(query.queryText.length < 1300, `RAG router: query ${index} is compact`);
  assertQueryMetadata(query, `RAG router query ${index}`);
});

const liabilityQuery = findQuery(queries, "CL-001");
assertTruthy(liabilityQuery, "RAG router: liability query exists");
assertTruthy(liabilityQuery.filters.collections.includes("clause_library"), "RAG router: liability routes to clause library");
assertTruthy(liabilityQuery.filters.collections.includes("risk_taxonomy"), "RAG router: liability routes to risk taxonomy");
assertIncludes(liabilityQuery.queryText.toLowerCase(), "uncapped", "RAG router: liability query preserves high-signal keyword");

const securityQuery = findQuery(queries, "CL-002");
assertTruthy(securityQuery, "RAG router: breach/security query exists");
assertTruthy(securityQuery.filters.collections.includes("security_compliance_standards"), "RAG router: security routes to standards");
assertTruthy(securityQuery.filters.retrievalTags.includes("breach notification"), "RAG router: security tags breach notification");

const subprocessorQuery = findQuery(queries, "CL-003");
assertTruthy(subprocessorQuery, "RAG router: subprocessor query exists");
assertTruthy(subprocessorQuery.filters.collections.includes("procurement_policy"), "RAG router: subprocessor routes to procurement policy");
assertTruthy(subprocessorQuery.filters.retrievalTags.includes("subprocessor"), "RAG router: subprocessor tags subprocessor");

const aiQuery = findQuery(queries, "CL-004");
assertTruthy(aiQuery, "RAG router: AI training query exists");
assertTruthy(aiQuery.filters.collections.includes("privacy_data_governance_standards"), "RAG router: AI training routes to privacy standards");
assertTruthy(aiQuery.metadata.routingMetadata.matchedKeywords.includes("model training"), "RAG router: AI training matches model training");

const transitionQuery = findQuery(queries, "CL-005");
assertTruthy(transitionQuery, "RAG router: transition assistance query exists");
assertTruthy(transitionQuery.metadata.routingMetadata.routingStrategy === "keyword", "RAG router: transition can route by keyword");
assertTruthy(transitionQuery.filters.collections.includes("contract_review_playbook"), "RAG router: transition routes to playbook");

const fallbackQueries = buildRetrievalQueriesFromEvidence(makeEvidence([clauses[5]]));
assertEqual(fallbackQueries.length, 1, "RAG router: generic fallback keeps one fallback query when nothing else is important");
assertTruthy(fallbackQueries[0].filters.collections.includes("company_profile"), "RAG router: fallback includes company profile");
assertEqual(fallbackQueries[0].metadata.routingMetadata.routingStrategy, "fallback", "RAG router: fallback strategy is labeled");

const cappedQueries = buildRetrievalQueriesFromEvidence(makeEvidence(clauses), {
  maxQueriesPerClause: 1,
  maxTotalQueries: 3
});
assertEqual(cappedQueries.length, 3, "RAG router: maxTotalQueries is enforced");
const perClauseCounts = cappedQueries.reduce((counts, query) => {
  counts[query.sourceClauseId] = (counts[query.sourceClauseId] ?? 0) + 1;
  return counts;
}, {});
assertTruthy(Object.values(perClauseCounts).every((count) => count <= 1), "RAG router: maxQueriesPerClause is enforced");

const normalized = normalizeRetrievalQueryText(
  "Clause:::: Security ---- Security ---- Security\n\nName: Jane Doe\n• breach notification;;;; breach notification"
);
assertNotMatches(normalized, /::::|----|Name: Jane Doe|•/, "RAG router: normalization strips repeated punctuation, separators, boilerplate, and bullets");

const runtimeFiles = collectSourceFiles(["app", "components", "lib/ai", "lib/reporting", "schemas", "types"]);
assertNoPatternInFiles(runtimeFiles, /@\/lib\/rag\/router|lib\/rag\/router|buildRetrievalQueriesFromEvidence/i, "RAG router: no API/UI/prompt/runtime wiring exists");

console.log("RAG router probes passed.");
