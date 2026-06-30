import { KB_COLLECTION_LABELS, type KBSeedDocument } from "../knowledge-types";

export const contractReviewChecklistSeed = [
  {
    id: "contract_review_checklist-placeholder-v1",
    collection: "contract_review_checklist",
    title: "Contract Review Checklist Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "review-checklist", "standards", "replace-with-approved-content"],
    content:
      "Placeholder for approved contract review checklist knowledge. Replace with required review checks, standard protections, and completeness criteria before ingestion.",
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.contract_review_checklist,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
