import { KB_COLLECTION_LABELS, type KBSeedDocument } from "../knowledge-types";

export const contractReviewPlaybookSeed = [
  {
    id: "contract_review_playbook-placeholder-v1",
    collection: "contract_review_playbook",
    title: "Contract Review Playbook Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "review-playbook", "negotiation", "replace-with-approved-content"],
    content:
      "Placeholder for approved contract review and negotiation playbook knowledge. Replace with review strategy, fallback positions, negotiation guidance, and escalation rules before ingestion.",
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.contract_review_playbook,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
