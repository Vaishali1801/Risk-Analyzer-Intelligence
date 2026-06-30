import { KB_COLLECTION_LABELS, type KBSeedDocument } from "../knowledge-types";

export const privacyDataGovernanceStandardsSeed = [
  {
    id: "privacy_data_governance_standards-placeholder-v1",
    collection: "privacy_data_governance_standards",
    title: "Privacy & Data Governance Standards Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "privacy", "data-governance", "replace-with-approved-content"],
    content:
      "Placeholder for approved privacy and data governance standards. Replace with privacy, retention, data use, AI/data governance, transfer, and deletion standards before ingestion.",
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.privacy_data_governance_standards,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
