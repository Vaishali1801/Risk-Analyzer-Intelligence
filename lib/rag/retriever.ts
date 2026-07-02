import { createRagPostgresPool, type RagPostgresPoolClient } from "./db";
import { embedRetrievalQueryText, QUERY_EMBEDDING_DIMENSIONS } from "./embed-query";
import { isKBCollection, type KBCollection, type KBSeedSourceType } from "./knowledge-types";
import type { KBReference, RetrievalFilters, RetrievalQuery, RetrievalResponse, RetrievalResult } from "./types";

const DEFAULT_TOP_K = 6;
const MAX_TOP_K = 12;
const DEFAULT_MIN_SIMILARITY = 0.72;
const MIN_VECTOR_RESULTS_BEFORE_FALLBACK = 2;
const MAX_LOW_CONFIDENCE_VECTOR_RESULTS = 2;

type KnowledgeChunkRow = {
  chunk_id: string;
  document_id: string;
  collection: string;
  title: string;
  content: string;
  token_estimate: number;
  tags: unknown;
  metadata: unknown;
  source_type: string;
  version: string;
  similarity_score?: number | string;
  keyword_rank?: number | string;
};

type SqlParts = {
  clauses: string[];
  values: unknown[];
};

const METADATA_KEY_BY_FILTER_KEY: Record<string, string> = {
  chunkTypes: "chunkType",
  governanceAreas: "governanceArea",
  primaryDomains: "primaryDomains",
  contractTypes: "contractTypes",
  retrievalTags: "retrievalTags"
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "between",
  "from",
  "have",
  "into",
  "only",
  "over",
  "that",
  "the",
  "their",
  "this",
  "under",
  "with",
  "within",
  "without"
]);

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("RAG retrieval can only be used on the server.");
  }
}

function assertPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)));
}

function normalizeTopK(topK: unknown): number {
  if (typeof topK !== "number" || !Number.isFinite(topK)) return DEFAULT_TOP_K;
  return Math.min(MAX_TOP_K, Math.max(1, Math.floor(topK)));
}

function normalizeMinSimilarity(minSimilarity: unknown): number {
  if (typeof minSimilarity !== "number" || !Number.isFinite(minSimilarity)) return DEFAULT_MIN_SIMILARITY;
  return Math.min(1, Math.max(0, minSimilarity));
}

function normalizeFilters(filters: unknown): RetrievalFilters {
  if (!assertPlainObject(filters)) return {};

  return Object.entries(filters).reduce<RetrievalFilters>((normalized, [key, value]) => {
    const values = normalizeStringArray(value);
    if (values.length === 0) return normalized;
    return {
      ...normalized,
      [key]: values
    };
  }, {});
}

function normalizeRetrievalQuery(query: RetrievalQuery): RetrievalQuery {
  if (!assertPlainObject(query)) {
    throw new Error("Retrieval query must be an object.");
  }

  const id = typeof query.id === "string" && query.id.trim() ? query.id.trim() : query.queryId?.trim();
  const queryText =
    typeof query.queryText === "string" && query.queryText.trim() ? query.queryText.trim() : query.query?.trim();
  const intent = typeof query.intent === "string" && query.intent.trim() ? query.intent.trim() : "";

  if (!id) {
    throw new Error("Retrieval query id is required.");
  }
  if (!queryText) {
    throw new Error("Retrieval queryText is required.");
  }
  if (!intent) {
    throw new Error("Retrieval query intent is required.");
  }

  return {
    ...query,
    id,
    queryText,
    intent,
    topK: normalizeTopK(query.topK),
    minSimilarity: normalizeMinSimilarity(query.minSimilarity),
    filters: normalizeFilters(query.filters)
  };
}

function createVectorLiteral(values: readonly number[]): string {
  if (values.length !== QUERY_EMBEDDING_DIMENSIONS) {
    throw new Error(`Query embedding dimension mismatch: expected ${QUERY_EMBEDDING_DIMENSIONS}, received ${values.length}`);
  }

  return `[${values.map((value) => {
    if (!Number.isFinite(value)) {
      throw new Error("Query embedding contains a non-finite value.");
    }
    return String(value);
  }).join(",")}]`;
}

function isSafeMetadataKey(key: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(key);
}

function addValue(parts: SqlParts, value: unknown): string {
  parts.values.push(value);
  return `$${parts.values.length}`;
}

function addMetadataArrayFilter(parts: SqlParts, metadataKey: string, values: string[]) {
  if (!isSafeMetadataKey(metadataKey)) {
    throw new Error(`Unsafe metadata filter key: ${metadataKey}`);
  }

  const parameter = addValue(parts, values);
  const metadataExpression = `(c.metadata->'${metadataKey}')`;
  const broadOrOverlapping = [
    `NOT (c.metadata ? '${metadataKey}')`,
    `CASE WHEN jsonb_typeof(${metadataExpression}) = 'array' THEN jsonb_array_length(${metadataExpression}) = 0 ELSE true END`,
    `CASE WHEN jsonb_typeof(${metadataExpression}) = 'array' THEN ${metadataExpression} ?| ${parameter}::text[] ELSE false END`
  ];

  if (metadataKey === "retrievalTags") {
    broadOrOverlapping.push(`c.tags ?| ${parameter}::text[]`);
  }

  parts.clauses.push(`(${broadOrOverlapping.join(" OR ")})`);
}

function addMetadataScalarFilter(parts: SqlParts, metadataKey: string, values: string[]) {
  if (!isSafeMetadataKey(metadataKey)) {
    throw new Error(`Unsafe metadata filter key: ${metadataKey}`);
  }

  const parameter = addValue(parts, values);
  parts.clauses.push(`(NOT (c.metadata ? '${metadataKey}') OR NULLIF(c.metadata->>'${metadataKey}', '') IS NULL OR c.metadata->>'${metadataKey}' = ANY(${parameter}::text[]))`);
}

function buildFilterSql(filters: RetrievalFilters): SqlParts {
  const parts: SqlParts = {
    clauses: [],
    values: []
  };

  Object.entries(filters as Record<string, unknown>).forEach(([filterKey, rawValue]) => {
    const values = normalizeStringArray(rawValue);
    if (values.length === 0) return;

    if (filterKey === "collections") {
      parts.clauses.push(`c.collection = ANY(${addValue(parts, values)}::text[])`);
      return;
    }

    if (filterKey === "sourceTypes") {
      const parameter = addValue(parts, values);
      parts.clauses.push(`COALESCE(c.metadata->>'sourceType', d.source_type) = ANY(${parameter}::text[])`);
      return;
    }

    if (filterKey === "versions") {
      const parameter = addValue(parts, values);
      parts.clauses.push(`COALESCE(c.metadata->>'version', c.metadata->>'documentVersion', d.version) = ANY(${parameter}::text[])`);
      return;
    }

    const metadataKey = METADATA_KEY_BY_FILTER_KEY[filterKey] ?? filterKey;
    if (metadataKey === "chunkType" || metadataKey === "governanceArea") {
      addMetadataScalarFilter(parts, metadataKey, values);
      return;
    }

    addMetadataArrayFilter(parts, metadataKey, values);
  });

  return parts;
}

function appendFilterValues(baseValues: unknown[], filterValues: unknown[], offset: number): unknown[] {
  return [...baseValues, ...filterValues.slice(offset)];
}

function reindexFilterClauses(clauses: string[], offset: number): string[] {
  return clauses.map((clause) => clause.replace(/\$(\d+)/g, (_, index) => `$${Number(index) + offset}`));
}

function buildWhereClause(baseClauses: string[], filterClauses: string[]) {
  return [...baseClauses, ...filterClauses].length > 0 ? `WHERE ${[...baseClauses, ...filterClauses].join("\n        AND ")}` : "";
}

async function searchVectorCandidates(
  client: RagPostgresPoolClient,
  embedding: readonly number[],
  filters: RetrievalFilters,
  topK: number
): Promise<RetrievalResult[]> {
  const vectorLiteral = createVectorLiteral(embedding);
  const filterSql = buildFilterSql(filters);
  const filterClauses = reindexFilterClauses(filterSql.clauses, 1);
  const limitParameter = `$${filterSql.values.length + 2}`;
  const whereClause = buildWhereClause(["c.embedding IS NOT NULL"], filterClauses);

  const result = await client.query<KnowledgeChunkRow>(
    `SELECT
        c.id AS chunk_id,
        c.document_id,
        c.collection,
        c.title,
        c.content,
        c.token_estimate,
        c.tags,
        c.metadata,
        d.source_type,
        d.version,
        (1 - (c.embedding <=> $1::vector))::float8 AS similarity_score
      FROM rag_knowledge_chunks c
      JOIN rag_knowledge_documents d ON d.id = c.document_id
      ${whereClause}
      ORDER BY similarity_score DESC
      LIMIT ${limitParameter}`,
    appendFilterValues([vectorLiteral], filterSql.values, 0).concat(topK)
  );

  return result.rows.map((row) => toRetrievalResult(row, "vector"));
}

function buildKeywordSearchText(queryText: string): string {
  return queryText
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))
    .slice(0, 8)
    .join(" ");
}

async function searchKeywordFallback(
  client: RagPostgresPoolClient,
  queryText: string,
  filters: RetrievalFilters,
  limit: number
): Promise<RetrievalResult[]> {
  const keywordSearchText = buildKeywordSearchText(queryText);
  if (!keywordSearchText || limit <= 0) return [];

  const filterSql = buildFilterSql(filters);
  const filterClauses = reindexFilterClauses(filterSql.clauses, 1);
  const limitParameter = `$${filterSql.values.length + 2}`;
  const documentVector = "to_tsvector('english', c.title || ' ' || c.content)";
  const keywordQuery = "plainto_tsquery('english', $1)";
  const whereClause = buildWhereClause([`${documentVector} @@ ${keywordQuery}`], filterClauses);

  const result = await client.query<KnowledgeChunkRow>(
    `SELECT
        c.id AS chunk_id,
        c.document_id,
        c.collection,
        c.title,
        c.content,
        c.token_estimate,
        c.tags,
        c.metadata,
        d.source_type,
        d.version,
        ts_rank_cd(${documentVector}, ${keywordQuery})::float8 AS keyword_rank
      FROM rag_knowledge_chunks c
      JOIN rag_knowledge_documents d ON d.id = c.document_id
      ${whereClause}
      ORDER BY keyword_rank DESC, c.title ASC
      LIMIT ${limitParameter}`,
    appendFilterValues([keywordSearchText], filterSql.values, 0).concat(limit)
  );

  return result.rows.map((row) => toRetrievalResult(row, "keyword_fallback"));
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (assertPlainObject(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return assertPlainObject(parsed) ? parsed : {};
    } catch (_error) {
      return {};
    }
  }
  return {};
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    try {
      return parseStringArray(JSON.parse(value) as unknown);
    } catch (_error) {
      return [];
    }
  }

  return [];
}

function requireCollection(value: string): KBCollection {
  if (!isKBCollection(value)) {
    throw new Error(`Unknown KB collection returned by retrieval: ${value}`);
  }
  return value;
}

function toRetrievalResult(row: KnowledgeChunkRow, retrievalMethod: "vector" | "keyword_fallback"): RetrievalResult {
  const metadata = parseMetadata(row.metadata);
  const tags = parseStringArray(row.tags);
  const collection = requireCollection(row.collection);
  const similarityScore = retrievalMethod === "vector" ? Number(row.similarity_score ?? 0) : 0;
  const sourceType = (metadata.sourceType ?? row.source_type) as KBSeedSourceType;
  const version = String(metadata.version ?? metadata.documentVersion ?? row.version);
  const retrievalTags = parseStringArray(metadata.retrievalTags);
  const governanceArea = typeof metadata.governanceArea === "string" ? metadata.governanceArea : undefined;

  const kbReference: KBReference = {
    documentId: row.document_id,
    chunkId: row.chunk_id,
    collection,
    title: row.title,
    sourceType,
    version,
    governanceArea,
    retrievalTags,
    similarityScore,
    metadata: {
      ...metadata,
      retrievalMethod,
      keywordRank: retrievalMethod === "keyword_fallback" ? Number(row.keyword_rank ?? 0) : undefined
    }
  };

  return {
    chunkId: row.chunk_id,
    documentId: row.document_id,
    collection,
    title: row.title,
    content: row.content,
    similarityScore,
    tokenEstimate: Number(row.token_estimate ?? 0),
    tags,
    metadata,
    kbReference
  };
}

function mergeDedupedResults(results: RetrievalResult[], topK: number): RetrievalResult[] {
  const byChunkId = new Map<string, RetrievalResult>();

  results.forEach((result) => {
    if (!byChunkId.has(result.chunkId)) {
      byChunkId.set(result.chunkId, result);
    }
  });

  return Array.from(byChunkId.values())
    .sort((left, right) => right.similarityScore - left.similarityScore)
    .slice(0, topK);
}

function selectVectorResults(candidates: RetrievalResult[], minSimilarity: number): {
  results: RetrievalResult[];
  belowThresholdAdded: number;
  thresholdMatchCount: number;
} {
  const aboveThreshold = candidates.filter((result) => result.similarityScore >= minSimilarity);
  if (aboveThreshold.length >= MIN_VECTOR_RESULTS_BEFORE_FALLBACK) {
    return {
      results: aboveThreshold,
      belowThresholdAdded: 0,
      thresholdMatchCount: aboveThreshold.length
    };
  }

  const belowThreshold = candidates
    .filter((result) => result.similarityScore < minSimilarity)
    .slice(0, MAX_LOW_CONFIDENCE_VECTOR_RESULTS);

  return {
    results: [...aboveThreshold, ...belowThreshold],
    belowThresholdAdded: belowThreshold.length,
    thresholdMatchCount: aboveThreshold.length
  };
}

export async function retrieveKnowledge(query: RetrievalQuery): Promise<RetrievalResponse> {
  assertServerRuntime();
  const startedAt = Date.now();
  const normalizedQuery = normalizeRetrievalQuery(query);
  const queryEmbedding = await embedRetrievalQueryText(normalizedQuery.queryText);
  const pool = createRagPostgresPool({ max: 1 });
  const client = await pool.connect();

  try {
    const vectorCandidates = await searchVectorCandidates(client, queryEmbedding.embedding, normalizedQuery.filters, normalizedQuery.topK);
    const vectorSelection = selectVectorResults(vectorCandidates, normalizedQuery.minSimilarity);
    // Keyword fallback is based on strong vector evidence only. If fewer than
    // two vector candidates meet minSimilarity, add up to two low-confidence
    // vector candidates from the bounded candidate set and supplement with
    // keyword fallback results; do not treat low-confidence matches as strong.
    const shouldRunKeywordFallback = vectorSelection.thresholdMatchCount < MIN_VECTOR_RESULTS_BEFORE_FALLBACK;
    const keywordResults = shouldRunKeywordFallback
      ? await searchKeywordFallback(client, normalizedQuery.queryText, normalizedQuery.filters, normalizedQuery.topK)
      : [];
    const results = mergeDedupedResults([...vectorSelection.results, ...keywordResults], normalizedQuery.topK);

    return {
      query: normalizedQuery,
      results,
      references: results.map((result) => result.kbReference),
      retrievedChunkCount: results.length,
      topSimilarity: results[0]?.similarityScore,
      latencyMs: Date.now() - startedAt,
      metadata: {
        mode: "vector",
        embeddingModel: queryEmbedding.model,
        embeddingDimensions: queryEmbedding.dimensions,
        vectorCandidateCount: vectorCandidates.length,
        thresholdMatchCount: vectorSelection.thresholdMatchCount,
        belowThresholdVectorResultCount: vectorSelection.belowThresholdAdded,
        keywordFallbackTriggered: shouldRunKeywordFallback,
        keywordFallbackResultCount: keywordResults.length,
        maxTopK: MAX_TOP_K
      }
    };
  } finally {
    client.release();
    await pool.end();
  }
}
