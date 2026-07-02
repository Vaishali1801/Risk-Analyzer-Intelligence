const fs = require("fs");
const ts = require("typescript");

const RETRIEVER_PATH = "lib/rag/retriever.ts";
const PACKAGE_PATH = "package.json";
const KNOWN_COLLECTIONS = [
  "company_profile",
  "risk_taxonomy",
  "contract_review_playbook",
  "contract_review_checklist",
  "security_compliance_standards",
  "clause_library",
  "procurement_policy",
  "privacy_data_governance_standards"
];

function assertTruthy(value, message) {
  if (!value) {
    throw new Error(message);
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

function getRetrievalSource(result) {
  return result.metadata?.retrievalSource ?? result.kbReference?.metadata?.retrievalSource ?? "(unknown)";
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

function loadRetrieverWithMocks(state) {
  const mod = { exports: {} };
  const source = fs.readFileSync(RETRIEVER_PATH, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  }).outputText;

  const localRequire = (id) => {
    if (id === "./embed-query") {
      return {
        QUERY_EMBEDDING_DIMENSIONS: 1536,
        embedRetrievalQueryText: async (queryText) => {
          state.embedCalls += 1;
          state.currentQueryText = queryText;
          return {
            embedding: Array.from({ length: 1536 }, (_, index) => (index % 7) / 1000),
            model: "text-embedding-3-small",
            dimensions: 1536
          };
        }
      };
    }

    if (id === "./db") {
      return {
        createRagPostgresPool: () => {
          state.poolCreations += 1;
          return {
            connect: async () => ({
              query: async (sql, values = []) => runMockQuery(state, sql, values),
              release: () => {
                state.clientReleases += 1;
              }
            }),
            end: async () => {
              state.poolEnds += 1;
            }
          };
        }
      };
    }

    if (id === "./knowledge-types") {
      return {
        isKBCollection: (value) => KNOWN_COLLECTIONS.includes(value)
      };
    }

    return require(id);
  };

  new Function("require", "module", "exports", code)(localRequire, mod, mod.exports);
  return mod.exports;
}

function makeRow(id, title, collection, similarityScore, metadata = {}) {
  return {
    chunk_id: id,
    document_id: `${collection}-doc`,
    collection,
    title,
    content: `${title} probe content covering ${metadata.retrievalTags?.join(", ") ?? "knowledge retrieval"}.`,
    token_estimate: 44,
    tags: ["probe", collection],
    metadata: {
      chunkType: "clause_guidance",
      collection,
      primaryDomains: metadata.primaryDomains ?? ["Legal"],
      contractTypes: metadata.contractTypes ?? ["SaaS"],
      retrievalTags: metadata.retrievalTags ?? ["probe"],
      sourceType: "manual_seed",
      version: "probe-v1",
      ...metadata
    },
    source_type: "manual_seed",
    version: "probe-v1",
    similarity_score: similarityScore
  };
}

function collectionFromValues(values) {
  return values.find((value) => Array.isArray(value) && value.includes("clause_library")) ? "clause_library" : "contract_review_playbook";
}

function vectorRowsForQuery(queryText, values) {
  const collection = collectionFromValues(values);
  const normalized = queryText.toLowerCase();

  if (normalized.includes("liability")) {
    return [
      makeRow("liability-1", "Liability Guidance - Caps and Exclusions", collection, 0.78, {
        primaryDomains: ["Legal", "Financial"],
        retrievalTags: ["liability", "risk allocation"]
      }),
      makeRow("liability-2", "Preferred Contract Positions - Risk Allocation", collection, 0.69, {
        primaryDomains: ["Legal"],
        retrievalTags: ["liability"]
      }),
      makeRow("liability-3", "Risk Taxonomy - Financial Exposure", collection, 0.61, {
        primaryDomains: ["Financial"],
        retrievalTags: ["risk allocation"]
      })
    ];
  }

  if (normalized.includes("subprocessor")) {
    return [
      makeRow("subprocessor-1", "Subprocessor Data Governance - Disclosure", collection, 0.89, {
        primaryDomains: ["Compliance"],
        contractTypes: ["DPA", "SaaS"],
        retrievalTags: ["subprocessor"]
      }),
      makeRow("subprocessor-2", "Subcontractor Governance - Approval", collection, 0.83, {
        primaryDomains: ["Operational", "Compliance"],
        retrievalTags: ["subprocessor", "subcontractor governance"]
      })
    ];
  }

  if (normalized.includes("breach")) {
    return [
      makeRow("breach-1", "Incident Response Expectations - Breach Notice", collection, 0.91, {
        primaryDomains: ["Compliance", "Technical"],
        retrievalTags: ["incident response", "breach notification"]
      }),
      makeRow("breach-2", "Security & Data Protection Guidance - Notice", collection, 0.84, {
        primaryDomains: ["Compliance"],
        retrievalTags: ["breach notification"]
      })
    ];
  }

  if (normalized.includes("transition")) {
    return [
      makeRow("transition-1", "Operational Governance Guidance - Transition Assistance", collection, 0.87, {
        primaryDomains: ["Operational"],
        retrievalTags: ["transition assistance"]
      }),
      makeRow("transition-2", "Vendor Governance Standards - Continuity", collection, 0.8, {
        primaryDomains: ["Operational"],
        retrievalTags: ["business continuity", "transition assistance"]
      })
    ];
  }

  return [
    makeRow("ai-1", "AI & Derived Data Governance - Model Training", collection, 0.93, {
      primaryDomains: ["Compliance", "Technical"],
      retrievalTags: ["AI governance", "model training", "AI data use"]
    }),
    makeRow("ai-2", "AI Governance Guidance - Customer Data Restrictions", collection, 0.86, {
      primaryDomains: ["Legal", "Technical"],
      retrievalTags: ["model training", "AI data use"]
    })
  ];
}

function keywordRowsForQuery(queryText, values) {
  const collection = collectionFromValues(values);
  const normalized = queryText.toLowerCase();

  if (!normalized.includes("liability")) return [];

  return [
    {
      ...makeRow("liability-2", "Preferred Contract Positions - Risk Allocation", collection, 0.69, {
        primaryDomains: ["Legal"],
        retrievalTags: ["liability"]
      }),
      keyword_rank: 0.42
    },
    {
      ...makeRow("liability-keyword-1", "Checklist - Unlimited Liability Red Flags", collection, 0, {
        primaryDomains: ["Legal", "Financial"],
        retrievalTags: ["liability", "red flag"]
      }),
      keyword_rank: 0.39
    }
  ];
}

function runMockQuery(state, sql, values) {
  state.queries.push({ sql, values });

  assertTruthy(/\bLIMIT\s+\$\d+/i.test(sql), "RAG retriever: every retrieval SQL statement has a parameterized LIMIT");
  const limitValue = values[values.length - 1];
  assertTruthy(Number.isInteger(limitValue) && limitValue >= 1 && limitValue <= 12, "RAG retriever: retrieval limit is bounded by max topK");
  assertNotMatches(sql, /unrestricted AI model training rights|unlimited liability exposure|breach notification obligations/i, "RAG retriever: raw queries are not interpolated into SQL");

  if (sql.includes("<=>")) {
    assertIncludes(sql, "ORDER BY similarity_score DESC", "RAG retriever: vector results order by highest similarity");
    return Promise.resolve({ rows: vectorRowsForQuery(state.currentQueryText, values), rowCount: 2 });
  }

  if (sql.includes("to_tsvector")) {
    assertIncludes(sql, "plainto_tsquery", "RAG retriever: keyword fallback uses PostgreSQL text search");
    return Promise.resolve({ rows: keywordRowsForQuery(state.currentQueryText, values), rowCount: 2 });
  }

  throw new Error(`Unexpected SQL in retriever probe: ${sql}`);
}

async function main() {
  assertTruthy(fs.existsSync(RETRIEVER_PATH), "RAG retriever: retriever file exists");

  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
  assertTruthy(packageJson.scripts["probe:rag-retriever"], "RAG retriever: package script exists");

  const retrieverSource = fs.readFileSync(RETRIEVER_PATH, "utf8");
  assertIncludes(retrieverSource, "export async function retrieveKnowledge", "RAG retriever: retrieveKnowledge is exported");
  assertIncludes(retrieverSource, "embedRetrievalQueryText", "RAG retriever: query embedding helper is used");
  assertIncludes(retrieverSource, "createRagPostgresPool", "RAG retriever: RAG database pool helper is used");
  assertIncludes(retrieverSource, "QUERY_EMBEDDING_DIMENSIONS", "RAG retriever: embedding dimensions are enforced");
  assertIncludes(retrieverSource, "DEFAULT_TOP_K = 6", "RAG retriever: default topK is 6");
  assertIncludes(retrieverSource, "MAX_TOP_K = 12", "RAG retriever: max topK is 12");
  assertIncludes(retrieverSource, "DEFAULT_MIN_SIMILARITY = 0.5", "RAG retriever: default min similarity is 0.50");
  assertIncludes(retrieverSource, "<=>", "RAG retriever: pgvector cosine search is used");
  assertIncludes(retrieverSource, "plainto_tsquery", "RAG retriever: keyword fallback is lightweight SQL text search");
  assertNotMatches(retrieverSource, /sk-[A-Za-z0-9_-]{12,}/, "RAG retriever: no OpenAI secret is hard-coded");
  assertNotMatches(retrieverSource, /postgres(?:ql)?:\/\/[^"'\s]+/i, "RAG retriever: no database URL is hard-coded");

  ["lib/rag/context-builder.ts"].forEach((path) => {
    assertTruthy(!fs.existsSync(path), `RAG retriever boundary: ${path} was not added`);
  });

  const runtimeFiles = collectSourceFiles(["app", "components", "lib/ai", "lib/reporting", "schemas", "types"]);
  assertNoPatternInFiles(runtimeFiles, /\bretrieveKnowledge\b|\bretrieveRagContext\b/i, "RAG retriever: no runtime app wiring exists");
  assertNoPatternInFiles(runtimeFiles, /@\/lib\/rag\/retriever|lib\/rag\/retriever/i, "RAG retriever: retriever is not imported by runtime surfaces");

  const state = {
    embedCalls: 0,
    poolCreations: 0,
    clientReleases: 0,
    poolEnds: 0,
    currentQueryText: "",
    queries: []
  };
  const { retrieveKnowledge } = loadRetrieverWithMocks(state);

  assertTruthy(state.embedCalls === 0 && state.poolCreations === 0, "RAG retriever: no retrieval executes at import time");

  const sampleQueries = [
    "unrestricted AI model training rights",
    "unlimited liability exposure",
    "breach notification obligations",
    "subprocessor disclosure",
    "transition assistance"
  ];

  for (const queryText of sampleQueries) {
    const response = await retrieveKnowledge({
      id: `probe-${queryText.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
      queryText,
      intent: "probe_retrieval",
      topK: 6,
      minSimilarity: 0.72,
      filters: {}
    });

    assertTruthy(response.retrievedChunkCount <= 6, "RAG retriever: sample response respects requested topK");
    assertTruthy(response.results.length === response.references.length, "RAG retriever: references mirror returned results");
    console.log(`Query: ${queryText}`);
    response.results.slice(0, 3).forEach((result) => {
      console.log(`- ${result.title} (${result.similarityScore.toFixed(3)}, ${getRetrievalSource(result)})`);
    });
  }

  const fallbackResponse = await retrieveKnowledge({
    id: "probe-keyword-fallback",
    queryText: "unlimited liability exposure",
    intent: "probe_retrieval",
    topK: 6,
    minSimilarity: 0.95,
    filters: {}
  });
  assertTruthy(fallbackResponse.metadata?.keywordFallbackTriggered === true, "RAG retriever: keyword fallback path is triggered");
  assertTruthy(
    fallbackResponse.results.some((result) => result.chunkId === "liability-keyword-1"),
    "RAG retriever: keyword fallback results merge into vector results"
  );
  assertTruthy(
    fallbackResponse.results.some((result) => result.metadata?.retrievalSource === "keyword"),
    "RAG retriever: keyword fallback results are labeled as keyword"
  );
  assertTruthy(
    fallbackResponse.results.some((result) => result.metadata?.retrievalSource === "low_confidence_vector"),
    "RAG retriever: below-threshold vector results are labeled as low_confidence_vector"
  );
  assertTruthy(
    new Set(fallbackResponse.results.map((result) => result.chunkId)).size === fallbackResponse.results.length,
    "RAG retriever: merged results are deduplicated by chunkId"
  );

  const filteredResponse = await retrieveKnowledge({
    id: "probe-filters",
    queryText: "unlimited liability exposure",
    intent: "probe_retrieval",
    topK: 99,
    minSimilarity: 0.72,
    filters: {
      collections: ["clause_library"],
      primaryDomains: ["Legal"],
      contractTypes: ["SaaS"],
      retrievalTags: ["liability"]
    }
  });
  assertTruthy(filteredResponse.query.topK === 12, "RAG retriever: topK is capped at 12");
  assertTruthy(
    filteredResponse.results.every((result) => result.collection === "clause_library"),
    "RAG retriever: collection filter constrains returned rows"
  );

  const filteredSql = state.queries.map((query) => query.sql).join("\n");
  assertIncludes(filteredSql, "c.collection = ANY", "RAG retriever: collection filter is applied in SQL");
  assertIncludes(filteredSql, "primaryDomains", "RAG retriever: primaryDomains filter is applied in SQL");
  assertIncludes(filteredSql, "contractTypes", "RAG retriever: contractTypes filter is applied in SQL");
  assertIncludes(filteredSql, "retrievalTags", "RAG retriever: retrievalTags filter is applied in SQL");

  assertTruthy(state.embedCalls >= sampleQueries.length + 2, "RAG retriever: retrieval queries are embedded only during execution");
  assertTruthy(state.poolCreations === state.poolEnds, "RAG retriever: pools are closed after retrieval");
  assertTruthy(state.clientReleases === state.poolCreations, "RAG retriever: clients are released after retrieval");

  console.log("RAG retriever probes passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
