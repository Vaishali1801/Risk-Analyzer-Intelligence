export type SegmentedClause = {
  clauseId: string;
  order: number;
  sectionRef: string;
  title: string;
  text: string;
  pageRef?: number;
};

export type ClauseDomain = "Financial" | "Legal" | "Compliance" | "Operational" | "Technical";

export type ClauseTagging = {
  clauseId: string;
  clauseTypeHints: string[];
  domainHints: ClauseDomain[];
  relevanceScore: number;
  routingReason: string;
};

export type TaggedClause = {
  clause: SegmentedClause;
  tagging: ClauseTagging;
};

export type ClauseBatch = {
  batchId: string;
  domainHints: ClauseDomain[];
  clauseTypeHints: string[];
  clauses: TaggedClause[];
  estimatedTokens: number;
  routingReason: string;
};

export type BatchOptions = {
  maxEstimatedTokens?: number;
  maxClausesPerBatch?: number;
};
