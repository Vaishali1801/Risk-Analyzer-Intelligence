import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[7];

export const privacyDataGovernanceStandardsSeed = [
  {
    id: "privacy_data_governance_standards-placeholder-v1",
    collection: COLLECTION,
    title: "Privacy & Data Governance Standards Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "privacy", "data-governance", "replace-with-approved-content"],
    content:
      "Placeholder for approved privacy and data governance standards. Replace with privacy, retention, data use, AI/data governance, transfer, and deletion standards before ingestion.",
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.privacy_data_governance_standards,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
