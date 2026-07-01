import { KB_COLLECTION_LABELS, KB_COLLECTIONS, type KBSeedDocument } from "../knowledge-types";

const COLLECTION = KB_COLLECTIONS[5];

export const clauseLibrarySeed = [
  {
    id: "approved_clause_guidance-enterprise-v1",
    collection: COLLECTION,
    title: "Approved Clause Guidance",
    sourceType: "approved_clause_library",
    version: "1.0.0",
    tags: ["clause-library", "drafting", "fallback-language", "approved-guidance"],
    content: `Approved Clause Guidance

Confidentiality:
Use language that protects non-public business, technical, financial, customer, pricing, security, product, and personal information. Permitted disclosures should be limited to representatives with a need to know and equivalent confidentiality duties. Return or destruction should be required on request or termination, subject to legal retention. Survival should match sensitivity and regulatory need.

Data use:
Customer data and confidential information may be used only to provide contracted services, comply with documented instructions, and meet legal obligations. Prohibit sale, advertising use, model training, benchmarking disclosure, product improvement using identifiable data, or disclosure to third parties unless expressly approved. Aggregated or de-identified use should require safeguards against re-identification and exclusion of confidential details.

Security:
Require reasonable and industry-aligned safeguards appropriate to data sensitivity and service criticality, including access control, encryption where appropriate, vulnerability management, incident response, logging, backup, and subcontractor flow-down. For higher-risk services, require audit evidence and remediation of material findings.

Liability and indemnity:
Caps should be clear, mutual where appropriate, and aligned to commercial value and risk. Exclusions from the cap may be appropriate for confidentiality breach, data protection breach, IP infringement, fraud, willful misconduct, payment obligations, and equitable remedies. Indemnities should cover third-party claims, defense control, cooperation, mitigation, and settlement consent.

Termination and transition:
Include termination for material breach with cure where appropriate, termination for prolonged service failure, and termination rights for regulatory or security risk. Transition assistance should include data export, reasonable cooperation, continuity support, and return or deletion certification.

Drafting rule:
Prefer concrete obligations over broad promises. A clause should identify actor, action, standard, timing, evidence, exception, remedy, and survival where relevant.`,
    ingestReady: true,
    metadata: {
      collectionLabel: KB_COLLECTION_LABELS.clause_library,
      status: "enterprise_ready",
      ingestReady: true,
      chunkPreparation: {
        chunkType: "clause_guidance",
        domains: ["Legal", "Compliance", "Technical", "Financial", "Operational"],
        contractTypes: ["MSA", "SaaS", "Vendor", "DPA", "NDA"],
        governanceArea: "approved_clause_guidance",
        severityRelevant: true,
        gapRelevant: true,
        priorityRelevant: true,
        retrievalTags: ["approved clause", "fallback language", "drafting", "contract remedy"]
      }
    }
  }
] satisfies KBSeedDocument[];
