import type { ClauseDomain } from "@/lib/clauses/types";
import type { KBChunkPreparationMetadata, KBCollection, KBSeedSourceType } from "./knowledge-types";

export type { KBCollection } from "./knowledge-types";

export type GroundingStatus = "grounded" | "partially_grounded" | "ungrounded" | "not_applicable";

export type SessionEvidenceSource = {
  documentName?: string;
  sourceKind?: "upload" | "paste" | "demo" | "unknown";
};

export type SessionEvidenceClause = {
  clauseId: string;
  order: number;
  sectionRef: string;
  pageRef?: number;
  title: string;
  text: string;
  clauseType?: string;
  clauseTypeHints: string[];
  domainSignals: string[];
  domainHints: ClauseDomain[];
  charStart?: number;
  charEnd?: number;
  tokenEstimate?: number;
  relevanceScore?: number;
  routingReason?: string;
};

export type SessionEvidencePackage = {
  adapterVersion: "session-evidence-v1";
  source?: SessionEvidenceSource;
  sourceTextLength: number;
  normalizedTextLength: number;
  clauseCount: number;
  tokenEstimate: number;
  clauses: SessionEvidenceClause[];
};

export type RetrievalChunkType = NonNullable<KBChunkPreparationMetadata["chunkType"]>;

// Retrieval type foundations are intentionally data-only. They support future
// retrieval, grounding, observability, and prompt context building without
// adding database access, embedding calls, or runtime retrieval behavior here.
export type RetrievalFilters = {
  collections?: KBCollection[];
  governanceAreas?: string[];
  primaryDomains?: string[];
  contractTypes?: string[];
  retrievalTags?: string[];
  chunkTypes?: RetrievalChunkType[];
  sourceTypes?: KBSeedSourceType[];
  versions?: string[];
};

export type RetrievalQuery = {
  id: string;
  queryText: string;
  intent: string;
  sourceClauseId?: string;
  topK: number;
  minSimilarity: number;
  filters: RetrievalFilters;
  metadata?: Record<string, unknown>;

  // Legacy aliases retained while downstream code migrates to id/queryText.
  queryId?: string;
  query?: string;
  collections?: KBCollection[];
  sourceClauseIds?: string[];
  clauseTypeHints?: string[];
  domainHints?: string[];
};

export type KBReference = {
  documentId: string;
  chunkId: string;
  collection: KBCollection;
  title: string;
  sourceType: KBSeedSourceType;
  version: string;
  governanceArea?: string;
  retrievalTags?: string[];
  similarityScore?: number;

  // Legacy citation fields remain optional for future grounding adapters.
  sourceTitle?: string;
  sourceUri?: string;
  heading?: string;
  sectionRef?: string;
  text?: string;
  similarity?: number;
  metadata?: Record<string, unknown>;
};

export type RetrievalResult = {
  chunkId: string;
  documentId: string;
  collection: KBCollection;
  title: string;
  content: string;
  similarityScore: number;
  tokenEstimate: number;
  tags: string[];
  metadata: Record<string, unknown>;
  kbReference: KBReference;

  // Deprecated legacy aliases retained temporarily for older adapters.
  /** @deprecated Use RetrievalResponse.query.id instead. */
  queryId?: string;
  /** @deprecated Use RetrievalResponse.query.queryText instead. */
  query?: string;
};

export type RetrievalResponse = {
  query: RetrievalQuery;
  results: RetrievalResult[];
  references: KBReference[];
  retrievedChunkCount: number;
  topSimilarity?: number;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
};

export type RAGContextMetadata = {
  enabled: boolean;
  retrievalAttempted: boolean;
  retrievalLatencyMs?: number;
  retrievedChunkCount: number;
  collectionsRetrieved: KBCollection[];
  topSimilarityScores: number[];
  contextTokenEstimate?: number;
  evidenceClauseCount: number;
  groundedFindingCount?: number;
  partiallyGroundedFindingCount?: number;
  ungroundedFindingCount?: number;
};
