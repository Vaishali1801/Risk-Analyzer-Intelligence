import { KB_COLLECTION_LABELS, type KBSeedDocument } from "../knowledge-types";

export const companyProfileSeed = [
  {
    id: "company_profile-placeholder-v1",
    collection: "company_profile",
    title: "Company Profile Placeholder",
    sourceType: "placeholder",
    version: "0.1.0",
    tags: ["placeholder", "company-context", "replace-with-approved-content"],
    content:
      "Placeholder for approved company profile knowledge. Replace with business context, risk appetite, approval thresholds, and preferred contracting posture before ingestion.",
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.company_profile,
      status: "placeholder",
      ingestReady: false
    }
  }
] satisfies KBSeedDocument[];
