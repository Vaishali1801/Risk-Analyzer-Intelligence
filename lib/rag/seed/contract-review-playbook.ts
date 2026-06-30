import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[2];

export const contractReviewPlaybookSeed = [
  {
    id: "contract_review_playbook-placeholder-v1",
    collection: COLLECTION,
    title: "Contract Review Playbook Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "review-playbook", "negotiation", "replace-with-approved-content"],
    content:
      "Placeholder for approved contract review and negotiation playbook knowledge. Replace with review strategy, fallback positions, negotiation guidance, and escalation rules before ingestion.",
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.contract_review_playbook,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
