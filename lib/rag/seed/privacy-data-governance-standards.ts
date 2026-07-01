import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[7];

export const privacyDataGovernanceStandardsSeed = [
  {
    id: "privacy_data_governance_standards-enterprise-v1",
    collection: COLLECTION,
    title: "Enterprise Privacy and Data Governance Standards",
    sourceType: "approved_policy",
    version: "1.0.0",
    tags: ["privacy", "data-governance", "data-use", "retention", "ai-governance"],
    content: `Enterprise Privacy and Data Governance Standards

Data processing:
Contracts involving personal data, customer data, regulated data, or confidential datasets must identify the data roles, processing purpose, permitted instructions, subprocessors, security controls, retention rules, deletion or return duties, and assistance obligations. Processing should be limited to providing the contracted services and complying with documented legal obligations.

Restricted data use:
Do not allow vendors to sell, disclose, train models on, enrich, profile, benchmark, or reuse customer data, personal data, confidential information, prompts, outputs, logs, telemetry, or derived data unless the use is expressly approved and controlled. De-identified or aggregated data use should require documented safeguards, no re-identification, no customer-identifying disclosure, and no use of sensitive confidential details.

Transfers and subprocessors:
Cross-border transfers require lawful mechanisms and transfer safeguards where applicable. Subprocessors should be disclosed with notice or approval rights, equivalent data protection obligations, confidentiality duties, security controls, and vendor responsibility for acts and omissions.

Retention and deletion:
Data should be retained only for the contract purpose, legal requirement, or approved backup cycle. At termination or request, vendors should return or delete data and certify deletion, subject to narrowly defined legal retention. Backups should age out under documented schedules.

Privacy escalation:
Escalate missing data processing terms, unrestricted AI or analytics use, unclear data roles, no deletion requirement, no incident notice, weak subprocessor controls, transfer ambiguity, or terms that allow vendor policy changes to reduce privacy protections without customer rights.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.privacy_data_governance_standards,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "standard",
        domains: ["Compliance", "Legal", "Technical", "Operational"],
        contractTypes: ["DPA", "SaaS", "Vendor", "MSA", "NDA"],
        governanceArea: "privacy_data_governance",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["privacy", "data processing", "AI data use", "retention", "subprocessor"]
      }
    }
  }
] satisfies KBSeedDocument[];
