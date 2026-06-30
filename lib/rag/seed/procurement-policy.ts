import { KB_COLLECTION_LABELS, type KBSeedDocument } from "../knowledge-types";

export const procurementPolicySeed = [
  {
    id: "procurement_policy-placeholder-v1",
    collection: "procurement_policy",
    title: "Procurement Policy Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "procurement", "vendor-review", "replace-with-approved-content"],
    content:
      "Placeholder for approved procurement policy knowledge. Replace with vendor onboarding standards, approval thresholds, commercial policy, and procurement controls before ingestion.",
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.procurement_policy,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
