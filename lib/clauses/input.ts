import { createClauseBatches } from "./batch";
import { renderClauseBatches } from "./render";
import { segmentContractClauses } from "./segment";
import { tagClauses } from "./tag";

export function buildClauseAwareAnalysisInput(text: string): string {
  const clauses = segmentContractClauses(text);
  const taggedClauses = tagClauses(clauses);
  const batches = createClauseBatches(taggedClauses);

  return renderClauseBatches(batches);
}
