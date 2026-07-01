const fs = require("fs");

const TYPES_PATH = "lib/rag/types.ts";
const KNOWLEDGE_TYPES_PATH = "lib/rag/knowledge-types.ts";
const PACKAGE_PATH = "package.json";

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

function getTypeBlock(source, typeName) {
  const start = source.indexOf(`export type ${typeName} = {`);
  assertTruthy(start >= 0, `RAG types: ${typeName} block exists`);

  const nextType = source.indexOf("\nexport type ", start + 1);
  return source.slice(start, nextType >= 0 ? nextType : source.length);
}

assertTruthy(fs.existsSync(TYPES_PATH), "RAG types: types file exists");
assertTruthy(fs.existsSync(KNOWLEDGE_TYPES_PATH), "RAG types: knowledge types file exists");

const typesSource = fs.readFileSync(TYPES_PATH, "utf8");
const knowledgeTypesSource = fs.readFileSync(KNOWLEDGE_TYPES_PATH, "utf8");
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
const retrievalResultBlock = getTypeBlock(typesSource, "RetrievalResult");
const retrievalResponseBlock = getTypeBlock(typesSource, "RetrievalResponse");

[
  "export type RetrievalFilters",
  "export type RetrievalQuery",
  "export type RetrievalResult",
  "export type RetrievalResponse",
  "export type KBReference",
  "export type RetrievalChunkType"
].forEach((expected) => {
  assertIncludes(typesSource, expected, `RAG types: ${expected} is exported`);
});

assertIncludes(typesSource, "from \"./knowledge-types\"", "RAG types: knowledge type module is reused");
assertIncludes(typesSource, "KBCollection", "RAG types: KBCollection is referenced");
assertIncludes(typesSource, "KBSeedSourceType", "RAG types: source type union is reused");
assertIncludes(typesSource, "KBChunkPreparationMetadata", "RAG types: chunk preparation metadata is reused");
assertIncludes(knowledgeTypesSource, "export type KBCollection", "RAG types: KBCollection remains defined by knowledge types");

[
  "collections?: KBCollection[]",
  "governanceAreas?: string[]",
  "primaryDomains?: string[]",
  "contractTypes?: string[]",
  "retrievalTags?: string[]",
  "chunkTypes?: RetrievalChunkType[]",
  "sourceTypes?: KBSeedSourceType[]",
  "versions?: string[]"
].forEach((expected) => {
  assertIncludes(typesSource, expected, `RAG types: RetrievalFilters supports ${expected}`);
});

[
  "id: string",
  "queryText: string",
  "intent: string",
  "sourceClauseId?: string",
  "topK: number",
  "minSimilarity: number",
  "filters: RetrievalFilters",
  "metadata?: Record<string, unknown>"
].forEach((expected) => {
  assertIncludes(typesSource, expected, `RAG types: RetrievalQuery supports ${expected}`);
});

[
  "chunkId: string",
  "documentId: string",
  "collection: KBCollection",
  "title: string",
  "content: string",
  "similarityScore: number",
  "tokenEstimate: number",
  "tags: string[]",
  "metadata: Record<string, unknown>",
  "kbReference: KBReference"
].forEach((expected) => {
  assertIncludes(retrievalResultBlock, expected, `RAG types: RetrievalResult supports ${expected}`);
});

[
  "query: RetrievalQuery",
  "results: RetrievalResult[]",
  "references: KBReference[]",
  "retrievedChunkCount: number",
  "topSimilarity?: number",
  "latencyMs?: number",
  "metadata?: Record<string, unknown>"
].forEach((expected) => {
  assertIncludes(retrievalResponseBlock, expected, `RAG types: RetrievalResponse supports ${expected}`);
});

[
  "references?: KBReference[]",
  "retrievedChunkCount?: number",
  "topSimilarity?: number",
  "latencyMs?: number"
].forEach((unexpected) => {
  assertTruthy(!retrievalResultBlock.includes(unexpected), `RAG types: RetrievalResult does not include aggregate field ${unexpected}`);
});

assertTruthy(typesSource.indexOf("export type RetrievalResult") < typesSource.indexOf("export type RetrievalResponse"), "RAG types: per-hit result is defined before aggregate response");

[
  "sourceType: KBSeedSourceType",
  "version: string",
  "governanceArea?: string",
  "retrievalTags?: string[]",
  "similarityScore?: number"
].forEach((expected) => {
  assertIncludes(typesSource, expected, `RAG types: KBReference supports ${expected}`);
});

["future", "retrieval", "grounding", "observability", "prompt context building"].forEach((expected) => {
  assertIncludes(typesSource, expected, `RAG types: future-use comment references ${expected}`);
});

[
  "lib/rag/retriever.ts",
  "lib/rag/router.ts",
  "lib/rag/context-builder.ts"
].forEach((path) => {
  assertTruthy(!fs.existsSync(path), `RAG types: ${path} was not added`);
});

assertNotMatches(typesSource, /from\s+["']pg["']|require\(["']pg["']\)|@supabase\/supabase-js|new\s+(Pool|Client)\b|postgres\(|createClient\(/i, "RAG types: database client code is absent");
assertNotMatches(typesSource, /embeddings\.create|text-embedding-3|openai\.embeddings|client\.embeddings/i, "RAG types: embedding call code is absent");
assertNotMatches(typesSource, /embedding\s*(<=>|<#>|<->)|order\s+by\s+[^;]*embedding|similaritySearch/i, "RAG types: vector execution code is absent");

assertTruthy(packageJson.scripts["probe:rag-types"], "RAG types: package script exists");

console.log("RAG type foundation probes passed.");
