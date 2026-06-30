import { KB_COLLECTION_LABELS, type KBSeedDocument } from "../knowledge-types";

export const riskTaxonomySeed = [
  {
    id: "risk_taxonomy-placeholder-v1",
    collection: "risk_taxonomy",
    title: "Risk Taxonomy Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "risk-taxonomy", "replace-with-approved-content"],
    content:
      "Placeholder for approved risk taxonomy knowledge. Replace with enterprise risk categories, severity criteria, domain mappings, and escalation guidance before ingestion.",
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.risk_taxonomy,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
