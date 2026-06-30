import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[6];

export const procurementPolicySeed = [
  {
    id: "procurement_policy-placeholder-v1",
    collection: COLLECTION,
    title: "Procurement Policy Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "procurement", "vendor-review", "replace-with-approved-content"],
    content:
      "Placeholder for approved procurement policy knowledge. Replace with vendor onboarding standards, approval thresholds, commercial policy, and procurement controls before ingestion.",
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.procurement_policy,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
