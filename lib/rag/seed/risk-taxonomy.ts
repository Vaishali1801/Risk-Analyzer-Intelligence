import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[1];

export const riskTaxonomySeed = [
  {
    id: "risk_taxonomy-placeholder-v1",
    collection: COLLECTION,
    title: "Risk Taxonomy Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "risk-taxonomy", "replace-with-approved-content"],
    content:
      "Placeholder for approved risk taxonomy knowledge. Replace with enterprise risk categories, severity criteria, domain mappings, and escalation guidance before ingestion.",
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.risk_taxonomy,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
