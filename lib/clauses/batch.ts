import type { BatchOptions, ClauseBatch, ClauseDomain, TaggedClause } from "./types";

const DEFAULT_MAX_ESTIMATED_TOKENS = 6000;
const DEFAULT_MAX_CLAUSES_PER_BATCH = 12;

export function estimateClauseTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function createClauseBatches(taggedClauses: TaggedClause[], options: BatchOptions = {}): ClauseBatch[] {
  const maxEstimatedTokens = options.maxEstimatedTokens ?? DEFAULT_MAX_ESTIMATED_TOKENS;
  const maxClausesPerBatch = options.maxClausesPerBatch ?? DEFAULT_MAX_CLAUSES_PER_BATCH;
  const batches: ClauseBatch[] = [];
  let currentClauses: TaggedClause[] = [];
  let currentTokenCount = 0;

  taggedClauses.forEach((taggedClause) => {
    const clauseTokens = estimateClauseTokens(taggedClause.clause.text);
    const exceedsTokenLimit = currentClauses.length > 0 && currentTokenCount + clauseTokens > maxEstimatedTokens;
    const exceedsClauseLimit = currentClauses.length >= maxClausesPerBatch;

    if (exceedsTokenLimit || exceedsClauseLimit) {
      batches.push(buildBatch(batches.length + 1, currentClauses, currentTokenCount, maxEstimatedTokens));
      currentClauses = [];
      currentTokenCount = 0;
    }

    currentClauses.push(taggedClause);
    currentTokenCount += clauseTokens;
  });

  if (currentClauses.length) {
    batches.push(buildBatch(batches.length + 1, currentClauses, currentTokenCount, maxEstimatedTokens));
  }

  return batches;
}

function buildBatch(order: number, clauses: TaggedClause[], estimatedTokens: number, maxEstimatedTokens: number): ClauseBatch {
  const domainHints = dedupe(clauses.flatMap((taggedClause) => taggedClause.tagging.domainHints));
  const clauseTypeHints = dedupe(clauses.flatMap((taggedClause) => taggedClause.tagging.clauseTypeHints));
  const oversizedClauses = clauses.filter((taggedClause) => estimateClauseTokens(taggedClause.clause.text) > maxEstimatedTokens);

  return {
    batchId: `BATCH-${String(order).padStart(3, "0")}`,
    domainHints,
    clauseTypeHints,
    clauses,
    estimatedTokens,
    routingReason: buildRoutingReason(domainHints, clauseTypeHints, oversizedClauses.length > 0)
  };
}

function buildRoutingReason(domainHints: ClauseDomain[], clauseTypeHints: string[], hasOversizedClause: boolean) {
  const dominantDomain = domainHints[0] ?? "Operational";
  const dominantType = clauseTypeHints[0] ?? "general";
  const baseReason = `Grouped by ${dominantDomain} domain and ${dominantType} clause hints within token budget.`;

  return hasOversizedClause ? `${baseReason} Contains oversized clause kept whole without splitting.` : baseReason;
}

function dedupe<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
