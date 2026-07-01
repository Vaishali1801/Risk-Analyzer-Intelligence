const fs = require("fs");
const ts = require("typescript");

const SQL_PATH = "lib/rag/sql/001_knowledge_base_pgvector.sql";

const moduleCache = new Map();

function loadTsModule(path, localRequire = require, useCache = true) {
  if (useCache && moduleCache.has(path)) {
    return moduleCache.get(path);
  }

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
  if (useCache) {
    moduleCache.set(path, mod.exports);
  }
  return mod.exports;
}

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

function assertNotMatches(value, pattern, message) {
  if (pattern.test(value)) {
    throw new Error(message);
  }
}

const seedFileByCollection = {
  company_profile: "lib/rag/seed/company-profile.ts",
  risk_taxonomy: "lib/rag/seed/risk-taxonomy.ts",
  contract_review_playbook: "lib/rag/seed/contract-review-playbook.ts",
  contract_review_checklist: "lib/rag/seed/contract-review-checklist.ts",
  security_compliance_standards: "lib/rag/seed/security-compliance-standards.ts",
  clause_library: "lib/rag/seed/clause-library.ts",
  procurement_policy: "lib/rag/seed/procurement-policy.ts",
  privacy_data_governance_standards: "lib/rag/seed/privacy-data-governance-standards.ts"
};

function loadKnowledgeTypes(useCache = true) {
  return loadTsModule("lib/rag/knowledge-types.ts", require, useCache);
}

function createSeedRequire(knowledgeTypes, useCache = true) {
  return (id) => {
    if (id === "../knowledge-types") return knowledgeTypes;
    if (id === "./company-profile") return loadTsModule(seedFileByCollection.company_profile, createSeedRequire(knowledgeTypes, useCache), useCache);
    if (id === "./risk-taxonomy") return loadTsModule(seedFileByCollection.risk_taxonomy, createSeedRequire(knowledgeTypes, useCache), useCache);
    if (id === "./contract-review-playbook") {
      return loadTsModule(seedFileByCollection.contract_review_playbook, createSeedRequire(knowledgeTypes, useCache), useCache);
    }
    if (id === "./contract-review-checklist") {
      return loadTsModule(seedFileByCollection.contract_review_checklist, createSeedRequire(knowledgeTypes, useCache), useCache);
    }
    if (id === "./security-compliance-standards") {
      return loadTsModule(seedFileByCollection.security_compliance_standards, createSeedRequire(knowledgeTypes, useCache), useCache);
    }
    if (id === "./clause-library") return loadTsModule(seedFileByCollection.clause_library, createSeedRequire(knowledgeTypes, useCache), useCache);
    if (id === "./procurement-policy") return loadTsModule(seedFileByCollection.procurement_policy, createSeedRequire(knowledgeTypes, useCache), useCache);
    if (id === "./privacy-data-governance-standards") {
      return loadTsModule(seedFileByCollection.privacy_data_governance_standards, createSeedRequire(knowledgeTypes, useCache), useCache);
    }
    return require(id);
  };
}

function loadSeedIndex(useCache = true) {
  const knowledgeTypes = loadKnowledgeTypes(useCache);
  return {
    knowledgeTypes,
    seedIndex: loadTsModule("lib/rag/seed/index.ts", createSeedRequire(knowledgeTypes, useCache), useCache)
  };
}

function createIngestRequire(knowledgeTypes, seedIndex) {
  return (id) => {
    if (id === "./knowledge-types") return knowledgeTypes;
    if (id === "./seed") return seedIndex;
    return require(id);
  };
}

assertTruthy(fs.existsSync(SQL_PATH), "RAG SQL: SQL file exists");

const sql = fs.readFileSync(SQL_PATH, "utf8").toLowerCase();
assertIncludes(sql, "create extension if not exists vector", "RAG SQL: pgvector extension is enabled");
["rag_knowledge_documents", "rag_knowledge_chunks", "rag_ingest_runs"].forEach((table) => {
  assertIncludes(sql, `create table if not exists ${table}`, `RAG SQL: ${table} table exists`);
});
assertIncludes(sql, "embedding vector(1536)", "RAG SQL: chunk embedding uses vector(1536)");
assertTruthy(/using\s+hnsw\s*\(\s*embedding\s+vector_/i.test(sql), "RAG SQL: HNSW vector index exists");
[
  "rag_knowledge_documents_collection_idx",
  "rag_knowledge_documents_source_type_idx",
  "rag_knowledge_documents_tags_gin_idx",
  "rag_knowledge_documents_metadata_gin_idx",
  "rag_knowledge_chunks_document_id_idx",
  "rag_knowledge_chunks_collection_idx",
  "rag_knowledge_chunks_tags_gin_idx",
  "rag_knowledge_chunks_metadata_gin_idx"
].forEach((indexName) => {
  assertIncludes(sql, indexName, `RAG SQL: ${indexName} exists`);
});

const { knowledgeTypes, seedIndex } = loadSeedIndex();
const ingest = loadTsModule("lib/rag/ingest-knowledge.ts", createIngestRequire(knowledgeTypes, seedIndex));
const { KB_COLLECTIONS } = knowledgeTypes;
const { KNOWLEDGE_SEED_DOCUMENTS } = seedIndex;

const validation = ingest.validateKnowledgeSeedDocuments(KNOWLEDGE_SEED_DOCUMENTS);
assertTruthy(validation.valid, `RAG ingest: seed documents validate (${validation.errors.join("; ")})`);

const firstPass = ingest.buildKnowledgeIngestRecords(KNOWLEDGE_SEED_DOCUMENTS);
moduleCache.delete("lib/rag/ingest-knowledge.ts");
const secondIngest = loadTsModule("lib/rag/ingest-knowledge.ts", createIngestRequire(knowledgeTypes, seedIndex), false);
const secondPass = secondIngest.buildKnowledgeIngestRecords(KNOWLEDGE_SEED_DOCUMENTS);

assertDeepEqual(firstPass, secondPass, "RAG ingest: ingest records are deterministic across module loads");
assertEqual(firstPass.documents.length, KNOWLEDGE_SEED_DOCUMENTS.length, "RAG ingest: seed documents map to document records");
assertTruthy(firstPass.chunks.length >= firstPass.documents.length, "RAG ingest: seed documents map to chunk records");

const documentIds = firstPass.documents.map((document) => document.id);
assertEqual(new Set(documentIds).size, documentIds.length, "RAG ingest: document IDs are unique");
assertDeepEqual(documentIds, KNOWLEDGE_SEED_DOCUMENTS.map((document) => document.id), "RAG ingest: document IDs are stable");

KB_COLLECTIONS.forEach((collection) => {
  assertTruthy(firstPass.documents.some((document) => document.collection === collection), `RAG ingest: ${collection} maps to document records`);
  assertTruthy(firstPass.chunks.some((chunk) => chunk.collection === collection), `RAG ingest: ${collection} maps to chunk records`);
});

firstPass.chunks.forEach((chunk) => {
  assertTruthy(documentIds.includes(chunk.documentId), `RAG ingest: ${chunk.id} references a known document`);
  assertEqual(typeof chunk.tokenEstimate, "number", `RAG ingest: ${chunk.id} has numeric token estimate`);
  assertTruthy(chunk.contentHash.startsWith("fnv1a32:"), `RAG ingest: ${chunk.id} has stable content hash`);
});

const ingestSource = fs.readFileSync("lib/rag/ingest-knowledge.ts", "utf8");
assertNotMatches(ingestSource, /new\s+pg\b|postgres\(|createClient\(|\.connect\(|pool\(/i, "RAG ingest: database connection behavior is absent");
assertNotMatches(ingestSource, /openai|embeddings\.create|text-embedding/i, "RAG ingest: OpenAI embedding behavior is absent");

console.log("RAG SQL and ingest preparation probes passed.");
