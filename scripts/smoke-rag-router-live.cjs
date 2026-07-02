const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(process.cwd());

const moduleCache = new Map();

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required for live routed RAG smoke testing.`);
  }
  return value;
}

function resolveTsModulePath(fromPath, id) {
  if (!id.startsWith(".")) return null;

  const basePath = path.resolve(path.dirname(fromPath), id);
  const candidates = [`${basePath}.ts`, `${basePath}.tsx`, path.join(basePath, "index.ts")];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
}

function createTsRequire(fromPath) {
  return (id) => {
    const resolvedTsPath = resolveTsModulePath(fromPath, id);
    if (resolvedTsPath) {
      return loadTsModule(path.relative(process.cwd(), resolvedTsPath));
    }
    return require(id);
  };
}

function loadTsModule(filePath) {
  const normalizedPath = path.normalize(filePath);
  if (moduleCache.has(normalizedPath)) {
    return moduleCache.get(normalizedPath);
  }

  const absolutePath = path.resolve(process.cwd(), normalizedPath);
  const source = fs.readFileSync(absolutePath, "utf8");
  const mod = { exports: {} };
  const code = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  moduleCache.set(normalizedPath, mod.exports);
  new Function("require", "module", "exports", code)(createTsRequire(absolutePath), mod, mod.exports);
  return mod.exports;
}

function makeClause(id, order, title, text, clauseTypeHints, domainHints, relevanceScore) {
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
    routingReason: `Live routed smoke clause for ${title}.`
  };
}

function buildSmokeEvidence() {
  const clauses = [
    makeClause(
      "CL-LIABILITY",
      1,
      "Limitation of Liability",
      "Supplier's liability is uncapped for all claims, including indirect, consequential, special, punitive, and unlimited damages arising from the services.",
      ["liability"],
      ["Legal", "Financial"],
      0.82
    ),
    makeClause(
      "CL-AI-DATA",
      2,
      "AI Training and Customer Data Use",
      "Provider may use customer data, personal data, derived data, embeddings, usage data, and generated outputs to train, improve, and evaluate artificial intelligence models.",
      ["data-protection"],
      ["Compliance", "Technical"],
      0.84
    ),
    makeClause(
      "CL-BREACH",
      3,
      "Security Incident and Breach Notification",
      "Provider shall maintain security controls and notify Customer after confirming a security incident or personal data breach affecting Customer systems or data.",
      ["security"],
      ["Technical", "Compliance"],
      0.8
    ),
    makeClause(
      "CL-SUBPROCESSOR",
      4,
      "Subprocessor Disclosure",
      "Provider may appoint subprocessors and subcontractors without prior notice, customer approval, or a documented subcontractor governance process.",
      ["subcontractors"],
      ["Operational", "Compliance"],
      0.78
    ),
    makeClause(
      "CL-TRANSITION",
      5,
      "Termination and Transition Assistance",
      "Upon termination, Supplier shall provide transition assistance, exit support, operational continuity cooperation, and reasonable migration services for ninety days.",
      ["termination"],
      ["Operational", "Legal"],
      0.76
    ),
    makeClause(
      "CL-NOTICE",
      6,
      "Routine Notices",
      "Routine administrative notices may be sent by email to the business contact listed in the order form.",
      ["general"],
      ["Operational"],
      0.05
    )
  ];

  return {
    adapterVersion: "session-evidence-v1",
    source: {
      documentName: "Routed RAG smoke contract",
      sourceKind: "unknown"
    },
    sourceTextLength: clauses.reduce((total, clause) => total + clause.text.length, 0),
    normalizedTextLength: clauses.reduce((total, clause) => total + clause.text.length, 0),
    clauseCount: clauses.length,
    tokenEstimate: clauses.reduce((total, clause) => total + clause.tokenEstimate, 0),
    clauses
  };
}

function formatList(values) {
  return Array.isArray(values) && values.length > 0 ? values.join(", ") : "(none)";
}

function previewContent(content) {
  return content.replace(/\s+/g, " ").trim().slice(0, 220);
}

function getRetrievalSource(result) {
  return result.metadata?.retrievalSource ?? result.kbReference?.metadata?.retrievalSource ?? "(unknown)";
}

async function main() {
  requireEnv("RAG_DATABASE_URL");
  requireEnv("OPENAI_API_KEY");

  console.log("Live routed RAG smoke test.");
  console.log("This will call OpenAI embeddings and query Supabase/Postgres pgvector data.");
  console.log("Secrets are required from the environment but will not be printed.");

  const { buildRetrievalQueriesFromEvidence } = loadTsModule("lib/rag/router.ts");
  const { retrieveKnowledge } = loadTsModule("lib/rag/retriever.ts");
  const evidence = buildSmokeEvidence();
  const queries = buildRetrievalQueriesFromEvidence(evidence, {
    contractTypes: ["SaaS"],
    maxQueriesPerClause: 1
  });

  console.log(`Generated retrieval queries: ${queries.length}`);

  for (const query of queries) {
    console.log("");
    console.log(`Source clause: ${query.metadata?.sourceClauseTitle ?? query.sourceClauseId}`);
    console.log(`Query text: ${query.queryText}`);
    console.log(`Filters: ${JSON.stringify(query.filters)}`);
    console.log(`Routing metadata: ${JSON.stringify(query.metadata?.routingMetadata ?? {})}`);

    const response = await retrieveKnowledge(query);
    console.log(`Retrieved chunks: ${response.retrievedChunkCount}`);
    console.log(`Keyword fallback triggered: ${Boolean(response.metadata?.keywordFallbackTriggered)}`);

    response.results.slice(0, 5).forEach((result, index) => {
      const reference = result.kbReference;
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   collection: ${result.collection}`);
      console.log(`   similarityScore: ${result.similarityScore.toFixed(4)}`);
      console.log(`   source: ${getRetrievalSource(result)}`);
      console.log(`   governanceArea: ${reference.governanceArea ?? "(none)"}`);
      console.log(`   retrievalTags: ${formatList(reference.retrievalTags)}`);
      console.log(`   preview: ${previewContent(result.content)}`);
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
