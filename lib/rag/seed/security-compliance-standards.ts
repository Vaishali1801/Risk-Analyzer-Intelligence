import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[4];

export const securityComplianceStandardsSeed = [
  {
    id: "security_compliance_standards-placeholder-v1",
    collection: COLLECTION,
    title: "Security & Compliance Standards Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "security", "compliance", "replace-with-approved-content"],
    content:
      "Placeholder for approved security and compliance standards. Replace with security controls, audit expectations, incident response standards, and compliance evidence requirements before ingestion.",
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.security_compliance_standards,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
