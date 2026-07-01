export const KB_COLLECTIONS = [
  "company_profile",
  "risk_taxonomy",
  "contract_review_playbook",
  "contract_review_checklist",
  "security_compliance_standards",
  "clause_library",
  "procurement_policy",
  "privacy_data_governance_standards"
] as const;

export type KBCollection = (typeof KB_COLLECTIONS)[number];

export type KBCollectionMetadata = {
  collection: KBCollection;
  label: string;
  description: string;
};

export type KBSeedSourceType =
  | "placeholder"
  | "manual_seed"
  | "approved_policy"
  | "approved_playbook"
  | "approved_clause_library";

export type KBChunkPreparationMetadata = {
  chunkType?: "company_profile" | "risk_taxonomy" | "clause_guidance" | "playbook" | "checklist" | "standard" | "policy";
  domains?: string[];
  contractTypes?: string[];
  governanceArea?: string;
  severityRelevant?: boolean;
  gapRelevant?: boolean;
  priorityRelevant?: boolean;
  retrievalTags?: string[];
};

export type KBSeedMetadata = Record<string, unknown> & {
  collectionLabel: string;
  status: "enterprise_ready" | "draft" | "retired";
  ingestReady: boolean;
  chunkPreparation?: KBChunkPreparationMetadata;
};

export type KBSeedDocument = {
  id: string;
  collection: KBCollection;
  title: string;
  sourceType: KBSeedSourceType;
  version: string;
  tags: string[];
  content: string;
  ingestReady: boolean;
  metadata: KBSeedMetadata;
};

export const KB_COLLECTION_LABELS: Record<KBCollection, string> = {
  company_profile: "Company Profile",
  risk_taxonomy: "Risk Taxonomy",
  contract_review_playbook: "Contract Review & Negotiation Playbook",
  contract_review_checklist: "Contract Review Checklist / Standards",
  security_compliance_standards: "Security & Compliance Standards",
  clause_library: "Clause Library",
  procurement_policy: "Procurement Policy",
  privacy_data_governance_standards: "Privacy & Data Governance Standards"
};

export const KB_COLLECTION_METADATA: Record<KBCollection, KBCollectionMetadata> = {
  company_profile: {
    collection: "company_profile",
    label: KB_COLLECTION_LABELS.company_profile,
    description: "Company context, risk appetite, preferred positions, approval thresholds, and business constraints."
  },
  risk_taxonomy: {
    collection: "risk_taxonomy",
    label: KB_COLLECTION_LABELS.risk_taxonomy,
    description: "Enterprise risk categories, severity criteria, domain mappings, and issue classification guidance."
  },
  contract_review_playbook: {
    collection: "contract_review_playbook",
    label: KB_COLLECTION_LABELS.contract_review_playbook,
    description: "Negotiation guidance, fallback positions, escalation rules, and preferred review strategy."
  },
  contract_review_checklist: {
    collection: "contract_review_checklist",
    label: KB_COLLECTION_LABELS.contract_review_checklist,
    description: "Standard review checklist items, required protections, and completeness checks by contract context."
  },
  security_compliance_standards: {
    collection: "security_compliance_standards",
    label: KB_COLLECTION_LABELS.security_compliance_standards,
    description: "Security, audit, resilience, incident response, and compliance control expectations."
  },
  clause_library: {
    collection: "clause_library",
    label: KB_COLLECTION_LABELS.clause_library,
    description: "Approved clause examples, fallback language, variants, and drafting patterns."
  },
  procurement_policy: {
    collection: "procurement_policy",
    label: KB_COLLECTION_LABELS.procurement_policy,
    description: "Procurement rules, vendor onboarding standards, approval policy, and commercial thresholds."
  },
  privacy_data_governance_standards: {
    collection: "privacy_data_governance_standards",
    label: KB_COLLECTION_LABELS.privacy_data_governance_standards,
    description: "Privacy, personal data, AI/data usage, retention, transfer, and governance standards."
  }
};

export function isKBCollection(value: string): value is KBCollection {
  return KB_COLLECTIONS.includes(value as KBCollection);
}
