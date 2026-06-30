import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[0];

export const companyProfileSeed = [
  {
    id: "company_profile-placeholder-v1",
    collection: COLLECTION,
    title: "Company Profile Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "company-context", "replace-with-approved-content"],
    content:
      "Placeholder for approved company profile knowledge. Replace with business context, risk appetite, approval thresholds, and preferred contracting posture before ingestion.",
    ingestReady: false,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.company_profile,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
