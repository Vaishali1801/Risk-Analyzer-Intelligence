import { KB_COLLECTION_LABELS, type KBSeedDocument } from "../knowledge-types";

export const clauseLibrarySeed = [
  {
    id: "clause_library-placeholder-v1",
    collection: "clause_library",
    title: "Clause Library Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "clause-library", "drafting", "replace-with-approved-content"],
    content:
      "Placeholder for approved clause library knowledge. Replace with approved clause examples, fallback clauses, variant language, and drafting notes before ingestion.",
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.clause_library,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
