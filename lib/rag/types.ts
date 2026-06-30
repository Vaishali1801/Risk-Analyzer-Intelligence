import type { ClauseDomain } from "@/lib/clauses/types";
import type { KBCollection } from "./knowledge-types";

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

export type KBReference = {
  collection: KBCollection;
  chunkId: string;
  documentId?: string;
  sourceTitle?: string;
  sourceUri?: string;
  heading?: string;
  sectionRef?: string;
  text?: string;
  similarity?: number;
  metadata?: Record<string, unknown>;
};

export type RetrievalQuery = {
  queryId: string;
  query: string;
  intent?: string;
  collections: KBCollection[];
  sourceClauseIds?: string[];
  clauseTypeHints?: string[];
  domainHints?: string[];
  topK?: number;
  minSimilarity?: number;
};

export type RetrievalResult = {
  queryId: string;
  query: string;
  references: KBReference[];
  latencyMs?: number;
  retrievedChunkCount: number;
  topSimilarity?: number;
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
